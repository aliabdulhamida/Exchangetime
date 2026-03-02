import React, { useEffect, useMemo, useState } from 'react';

type StrategyType = 'long_call' | 'long_put' | 'covered_call' | 'cash_secured_put';

interface SavedState {
  strategy: StrategyType;
  spot: number;
  strike: number;
  premium: number;
  contracts: number;
  stockCost: number;
  scenarioMove: number;
  expiryPrice: number;
}

const STORAGE_KEY = 'exchangetime.options-payoff-lab.v1';

const DEFAULTS: SavedState = {
  strategy: 'long_call',
  spot: 185,
  strike: 190,
  premium: 4.2,
  contracts: 1,
  stockCost: 180,
  scenarioMove: 20,
  expiryPrice: 195,
};

const STRATEGY_LABEL: Record<StrategyType, string> = {
  long_call: 'Long Call',
  long_put: 'Long Put',
  covered_call: 'Covered Call',
  cash_secured_put: 'Cash-Secured Put',
};

const STRATEGY_HINT: Record<StrategyType, string> = {
  long_call: 'Bullish directional bet with limited risk.',
  long_put: 'Bearish directional bet with limited risk.',
  covered_call: 'Income strategy with capped upside.',
  cash_secured_put: 'Income strategy to potentially buy lower.',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function normalizeNumber(value: number, min = 0) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, value);
}

function parseSaved(raw: string | null): SavedState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    const strategy =
      parsed.strategy === 'long_call' ||
      parsed.strategy === 'long_put' ||
      parsed.strategy === 'covered_call' ||
      parsed.strategy === 'cash_secured_put'
        ? parsed.strategy
        : DEFAULTS.strategy;

    return {
      strategy,
      spot: normalizeNumber(Number(parsed.spot), 0),
      strike: normalizeNumber(Number(parsed.strike), 0),
      premium: normalizeNumber(Number(parsed.premium), 0),
      contracts: Math.max(1, Math.round(normalizeNumber(Number(parsed.contracts), 1))),
      stockCost: normalizeNumber(Number(parsed.stockCost), 0),
      scenarioMove: Math.min(50, Math.max(5, normalizeNumber(Number(parsed.scenarioMove), 20))),
      expiryPrice: normalizeNumber(Number(parsed.expiryPrice), 0),
    };
  } catch {
    return null;
  }
}

function payoffPerShare(strategy: StrategyType, price: number, strike: number, premium: number, stockCost: number) {
  if (strategy === 'long_call') return Math.max(price - strike, 0) - premium;
  if (strategy === 'long_put') return Math.max(strike - price, 0) - premium;
  if (strategy === 'covered_call') return (price - stockCost) + premium - Math.max(price - strike, 0);
  return premium - Math.max(strike - price, 0);
}

export default function OptionsPayoffLab({ onClose: _onClose }: { onClose?: () => void }) {
  const [strategy, setStrategy] = useState<StrategyType>(DEFAULTS.strategy);
  const [spot, setSpot] = useState(DEFAULTS.spot);
  const [strike, setStrike] = useState(DEFAULTS.strike);
  const [premium, setPremium] = useState(DEFAULTS.premium);
  const [contracts, setContracts] = useState(DEFAULTS.contracts);
  const [stockCost, setStockCost] = useState(DEFAULTS.stockCost);
  const [scenarioMove, setScenarioMove] = useState(DEFAULTS.scenarioMove);
  const [expiryPrice, setExpiryPrice] = useState(DEFAULTS.expiryPrice);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = parseSaved(window.localStorage.getItem(STORAGE_KEY));
    if (saved) {
      setStrategy(saved.strategy);
      setSpot(saved.spot);
      setStrike(saved.strike);
      setPremium(saved.premium);
      setContracts(saved.contracts);
      setStockCost(saved.stockCost);
      setScenarioMove(saved.scenarioMove);
      setExpiryPrice(saved.expiryPrice);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const payload: SavedState = {
      strategy,
      spot,
      strike,
      premium,
      contracts,
      stockCost,
      scenarioMove,
      expiryPrice,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, strategy, spot, strike, premium, contracts, stockCost, scenarioMove, expiryPrice]);

  const contractSize = 100;
  const totalMultiplier = contracts * contractSize;

  const summary = useMemo(() => {
    const breakEven =
      strategy === 'long_call'
        ? strike + premium
        : strategy === 'long_put'
          ? strike - premium
          : strategy === 'covered_call'
            ? stockCost - premium
            : strike - premium;

    const maxProfitPerShare =
      strategy === 'long_call'
        ? Number.POSITIVE_INFINITY
        : strategy === 'long_put'
          ? strike - premium
          : strategy === 'covered_call'
            ? strike - stockCost + premium
            : premium;

    const maxLossPerShare =
      strategy === 'long_call'
        ? premium
        : strategy === 'long_put'
          ? premium
          : strategy === 'covered_call'
            ? stockCost - premium
            : strike - premium;

    const currentPnL = payoffPerShare(strategy, expiryPrice, strike, premium, stockCost) * totalMultiplier;
    const rr =
      Number.isFinite(maxProfitPerShare) && maxLossPerShare > 0
        ? maxProfitPerShare / maxLossPerShare
        : null;

    return {
      breakEven,
      maxProfitPerShare,
      maxLossPerShare,
      currentPnL,
      rr,
    };
  }, [strategy, strike, premium, stockCost, expiryPrice, totalMultiplier]);

  const scenarioRows = useMemo(() => {
    const percents = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
    return percents.map((factor) => {
      const movePct = factor * scenarioMove;
      const price = Math.max(0, spot * (1 + movePct / 100));
      const pnl = payoffPerShare(strategy, price, strike, premium, stockCost) * totalMultiplier;
      return {
        key: `${movePct}`,
        movePct,
        price,
        pnl,
      };
    });
  }, [scenarioMove, spot, strategy, strike, premium, stockCost, totalMultiplier]);

  const warnings = useMemo(() => {
    const list: string[] = [];

    if (strategy === 'long_call' && strike <= spot) {
      list.push('Call is in-the-money. Premium can be high; compare with spread alternatives.');
    }
    if (strategy === 'long_put' && strike >= spot) {
      list.push('Put is in-the-money. Check if premium already prices in the move.');
    }
    if (strategy === 'covered_call' && strike <= stockCost) {
      list.push('Covered call strike is at/below cost basis, which can cap at a loss.');
    }
    if (strategy === 'cash_secured_put' && strike > spot * 1.1) {
      list.push('Strike is far above spot. Assignment risk is high for this setup.');
    }

    const currentMaxLoss = summary.maxLossPerShare * totalMultiplier;
    if (currentMaxLoss > 0 && currentMaxLoss > spot * totalMultiplier * 0.25) {
      list.push('Max loss exceeds 25% of underlying notional. Consider reducing contracts.');
    }

    if (list.length === 0) {
      list.push('Setup looks internally consistent. Double-check implied volatility before execution.');
    }

    return list;
  }, [strategy, strike, spot, stockCost, summary.maxLossPerShare, totalMultiplier]);

  const preset = (type: 'bull' | 'bear' | 'income') => {
    if (type === 'bull') {
      setStrategy('long_call');
      setSpot(185);
      setStrike(190);
      setPremium(4.2);
      setContracts(2);
      setStockCost(180);
      setExpiryPrice(198);
      return;
    }
    if (type === 'bear') {
      setStrategy('long_put');
      setSpot(185);
      setStrike(178);
      setPremium(3.6);
      setContracts(2);
      setStockCost(180);
      setExpiryPrice(170);
      return;
    }
    setStrategy('cash_secured_put');
    setSpot(185);
    setStrike(175);
    setPremium(2.9);
    setContracts(1);
    setStockCost(180);
    setExpiryPrice(178);
  };

  const maxProfitDisplay = Number.isFinite(summary.maxProfitPerShare)
    ? formatCurrency(summary.maxProfitPerShare * totalMultiplier)
    : 'Unlimited';

  return (
    <div className="w-full max-w-full" id="options-payoff-lab-container">
      <div className="px-4 pb-0 pt-0 pr-16 sm:px-5 sm:pr-20">
        <h2 className="text-lg font-semibold text-foreground">Options Payoff Lab</h2>
      </div>

      <div className="space-y-4 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Strategy Builder</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => preset('bull')}
                className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted/40"
              >
                Bullish
              </button>
              <button
                type="button"
                onClick={() => preset('bear')}
                className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted/40"
              >
                Bearish
              </button>
              <button
                type="button"
                onClick={() => preset('income')}
                className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-muted/40"
              >
                Income
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <label className="flex flex-col gap-1 xl:col-span-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Strategy</span>
              <select
                value={strategy}
                onChange={(event) => setStrategy(event.target.value as StrategyType)}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              >
                <option value="long_call">Long Call</option>
                <option value="long_put">Long Put</option>
                <option value="covered_call">Covered Call</option>
                <option value="cash_secured_put">Cash-Secured Put</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Spot</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={spot}
                onChange={(event) => setSpot(normalizeNumber(Number(event.target.value), 0))}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Strike</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={strike}
                onChange={(event) => setStrike(normalizeNumber(Number(event.target.value), 0))}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Premium</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={premium}
                onChange={(event) => setPremium(normalizeNumber(Number(event.target.value), 0))}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Contracts</span>
              <input
                type="number"
                step={1}
                min={1}
                value={contracts}
                onChange={(event) =>
                  setContracts(Math.max(1, Math.round(normalizeNumber(Number(event.target.value), 1))))
                }
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              />
            </label>
          </div>

          {(strategy === 'covered_call' || strategy === 'cash_secured_put') && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {strategy === 'covered_call' ? 'Stock Cost Basis' : 'Reference Cost Basis'}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={stockCost}
                  onChange={(event) => setStockCost(normalizeNumber(Number(event.target.value), 0))}
                  className="h-9 rounded border border-border bg-background px-2 text-sm"
                />
              </label>
              <div className="flex items-end pb-1 text-xs text-muted-foreground">{STRATEGY_HINT[strategy]}</div>
            </div>
          )}

          {strategy !== 'covered_call' && strategy !== 'cash_secured_put' && (
            <p className="mt-2 text-xs text-muted-foreground">{STRATEGY_HINT[strategy]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-md border border-border bg-background/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Break-even</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.breakEven)}</p>
          </div>
          <div className="rounded-md border border-border bg-background/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max Profit</p>
            <p className="text-sm font-semibold text-foreground">{maxProfitDisplay}</p>
          </div>
          <div className="rounded-md border border-border bg-background/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Max Loss</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(summary.maxLossPerShare * totalMultiplier)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expiry P/L</p>
            <p
              className={`text-sm font-semibold ${
                summary.currentPnL >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {formatCurrency(summary.currentPnL)}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">R:R Estimate</p>
            <p className="text-sm font-semibold text-foreground">
              {summary.rr && Number.isFinite(summary.rr) ? `${summary.rr.toFixed(2)}R` : '-'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/70 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Position Notional</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(spot * totalMultiplier)}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-background/60 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Scenario Matrix (Expiry)</h3>
            <div className="flex items-center gap-2">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Range %</label>
              <input
                type="number"
                min={5}
                max={50}
                step={1}
                value={scenarioMove}
                onChange={(event) =>
                  setScenarioMove(Math.min(50, Math.max(5, normalizeNumber(Number(event.target.value), 20))))
                }
                className="h-8 w-16 rounded border border-border bg-background px-2 text-xs"
              />
            </div>
          </div>

          <div className="max-h-[360px] overflow-auto rounded border border-border/70">
            <div className="divide-y divide-border/70">
              {scenarioRows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2 px-3 py-2 text-xs"
                >
                  <span
                    className={
                      row.movePct >= 0
                        ? 'font-medium text-emerald-700 dark:text-emerald-300'
                        : 'font-medium text-rose-700 dark:text-rose-300'
                    }
                  >
                    {row.movePct > 0 ? '+' : ''}
                    {row.movePct.toFixed(1)}%
                  </span>
                  <span className="text-foreground">{formatCurrency(row.price)}</span>
                  <span
                    className={
                      row.pnl >= 0
                        ? 'justify-self-end font-medium text-emerald-700 dark:text-emerald-300'
                        : 'justify-self-end font-medium text-rose-700 dark:text-rose-300'
                    }
                  >
                    {formatCurrency(row.pnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr] sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Test Expiry Price</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={expiryPrice}
                onChange={(event) => setExpiryPrice(normalizeNumber(Number(event.target.value), 0))}
                className="h-9 rounded border border-border bg-background px-2 text-sm"
              />
            </label>
            <div className="rounded border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              {STRATEGY_LABEL[strategy]} at {formatCurrency(expiryPrice)} results in{' '}
              <span
                className={
                  summary.currentPnL >= 0
                    ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                    : 'font-semibold text-rose-700 dark:text-rose-300'
                }
              >
                {formatCurrency(summary.currentPnL)}
              </span>{' '}
              total P/L.
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <h3 className="text-sm font-semibold text-foreground">Risk Notes</h3>
          <div className="mt-2 space-y-1.5">
            {warnings.map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                className="rounded border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
