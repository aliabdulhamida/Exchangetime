"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function formatCurrencyEUR(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    isFinite(value) ? value : 0
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function RealEstateVsStocksCalculator() {
  const [years, setYears] = useState(10);
  const [capital, setCapital] = useState(100_000);
  const [stockReturnPct, setStockReturnPct] = useState(7);

  const [propertyPrice, setPropertyPrice] = useState(333_000);
  const [ltvPct, setLtvPct] = useState(70);
  const [interestPct, setInterestPct] = useState(4.5);
  const [amortYears, setAmortYears] = useState(25);
  const [capRatePct, setCapRatePct] = useState(5);
  const [noiGrowthPct, setNoiGrowthPct] = useState(3);

  const result = useMemo(() => {
    const n = clamp(Math.round(years), 1, 50);
    const S0 = Math.max(0, capital);

    // Stocks FV with reinvestment
    const r = stockReturnPct / 100;
    const stocksFV = S0 * Math.pow(1 + r, n);

    // Real estate calculations
    const P = Math.max(1, propertyPrice);
    const c = capRatePct / 100; // cap rate
    const g = noiGrowthPct / 100; // NOI growth
    const LTV = clamp(ltvPct, 0, 95) / 100;
    const i = interestPct / 100; // interest
    const N = clamp(Math.round(amortYears), 1, 50);

    const downPayment = P * (1 - LTV);
    const loan0 = P * LTV;

    // NOI year 0
    const NOI0 = P * c; // net operating income, assuming cap rate is net

    // Annual annuity payment (fixed rate fully amortizing)
    const annuity = i === 0 ? loan0 / N : loan0 * (i / (1 - Math.pow(1 + i, -N)));

    let balance = loan0;
    let cumCash = 0;
    let value = P; // property value under constant cap
    let NOI = NOI0;

    for (let t = 1; t <= n; t++) {
      // Value follows NOI if cap stays constant
      NOI = NOI0 * Math.pow(1 + g, t - 1);
      value = NOI / c;

      // Debt service and amortization
      const interest = balance * i;
      const principal = Math.max(0, annuity - interest);
      balance = Math.max(0, balance - principal);

      // Cash flow after debt service
      const cashFlow = NOI - annuity;
      cumCash += cashFlow;
    }

    const equity = Math.max(0, value - balance);

    // Year 1 DSCR for quick sanity check
    const dscrYear1 = annuity > 0 ? NOI0 / annuity : Infinity;

    return {
      n,
      stocksFV,
      downPayment,
      loan0,
      annuity,
      dscrYear1,
      cumCash,
      value,
      balance,
      equity,
      capitalDiff: downPayment - S0,
    };
  }, [years, capital, stockReturnPct, propertyPrice, ltvPct, interestPct, amortYears, capRatePct, noiGrowthPct]);

  function resetDefaults() {
    setYears(10);
    setCapital(100_000);
    setStockReturnPct(7);
    setPropertyPrice(333_000);
    setLtvPct(70);
    setInterestPct(4.5);
    setAmortYears(25);
    setCapRatePct(5);
    setNoiGrowthPct(3);
  }

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader>
        <CardTitle>Real Estate vs Stocks</CardTitle>
        <CardDescription>
          Compare a simple stock investment with a levered rental property assuming constant cap rate and NOI growth.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="years">Horizon (years)</Label>
            <Input id="years" type="number" min={1} max={50} value={years} onChange={(e) => setYears(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="capital">Starting capital (€)</Label>
            <Input id="capital" type="number" min={0} step={100} value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="stockReturnPct">Stocks total return (% p.a.)</Label>
            <Input id="stockReturnPct" type="number" min={-50} max={50} step={0.1} value={stockReturnPct} onChange={(e) => setStockReturnPct(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="propertyPrice">Property price (€)</Label>
            <Input id="propertyPrice" type="number" min={10000} step={1000} value={propertyPrice} onChange={(e) => setPropertyPrice(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="ltvPct">Loan-to-Value (%)</Label>
            <Input id="ltvPct" type="number" min={0} max={95} step={1} value={ltvPct} onChange={(e) => setLtvPct(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="interestPct">Interest rate (% p.a.)</Label>
            <Input id="interestPct" type="number" min={0} max={20} step={0.1} value={interestPct} onChange={(e) => setInterestPct(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="amortYears">Amortization (years)</Label>
            <Input id="amortYears" type="number" min={1} max={50} value={amortYears} onChange={(e) => setAmortYears(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="capRatePct">Cap rate (% net)</Label>
            <Input id="capRatePct" type="number" min={1} max={20} step={0.1} value={capRatePct} onChange={(e) => setCapRatePct(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="noiGrowthPct">NOI growth (% p.a.)</Label>
            <Input id="noiGrowthPct" type="number" min={-20} max={20} step={0.1} value={noiGrowthPct} onChange={(e) => setNoiGrowthPct(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" onClick={resetDefaults}>Reset to defaults</Button>
          <span className="text-sm text-muted-foreground">Down payment required: <strong>{formatCurrencyEUR(result.downPayment)}</strong></span>
          <span className="text-sm text-muted-foreground">Difference vs. capital: <strong>{formatCurrencyEUR(result.capitalDiff)}</strong></span>
          <span className="text-sm text-muted-foreground">Year 1 DSCR: <strong>{result.dscrYear1.toFixed(2)}</strong></span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-transparent border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Stocks (end of year {result.n})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrencyEUR(result.stocksFV)}</div>
              <div className="text-sm text-muted-foreground mt-1">Assumes reinvestment at {stockReturnPct}% p.a.</div>
            </CardContent>
          </Card>

          <Card className="bg-transparent border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Real Estate (end of year {result.n})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div><span className="text-muted-foreground">Property value:</span> <strong>{formatCurrencyEUR(result.value)}</strong></div>
              <div><span className="text-muted-foreground">Debt outstanding:</span> <strong>{formatCurrencyEUR(result.balance)}</strong></div>
              <div><span className="text-muted-foreground">Equity:</span> <strong>{formatCurrencyEUR(result.equity)}</strong></div>
              <div><span className="text-muted-foreground">Cumulative cash flow:</span> <strong>{formatCurrencyEUR(result.cumCash)}</strong></div>
              <div className="pt-2 border-t text-sm text-muted-foreground">Total wealth (equity + cash flow): <strong>{formatCurrencyEUR(result.equity + result.cumCash)}</strong></div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          This simplified model assumes constant cap rate and ignores taxes, vacancies, transaction fees and maintenance buffers. Numbers are illustrative only and not investment advice.
        </p>
      </CardContent>
    </Card>
  );
}
