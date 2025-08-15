'use client';

import { Info, RotateCcw } from 'lucide-react';
import { useMemo, useState, type InputHTMLAttributes } from 'react';
import type React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
// Charts removed per request

type FilingStatus = 'single' | 'married';
type Country = 'USA' | 'Germany';

// DTA country presets for dividends (German calculator)
type DeDtaCountry =
  | 'US'
  | 'CH'
  | 'UK'
  | 'FR'
  | 'NL'
  | 'CA'
  | 'ES'
  | 'IT'
  | 'IE'
  | 'GENERIC_15'
  | 'NONE_0';

const DTA_COUNTRY_RATES: Record<DeDtaCountry, { whtPct: number; capPct: number; label: string }> = {
  US: { whtPct: 15, capPct: 15, label: 'United States' },
  CH: { whtPct: 15, capPct: 15, label: 'Switzerland' },
  UK: { whtPct: 15, capPct: 15, label: 'United Kingdom' },
  FR: { whtPct: 12.8, capPct: 15, label: 'France' },
  NL: { whtPct: 15, capPct: 15, label: 'Netherlands' },
  CA: { whtPct: 15, capPct: 15, label: 'Canada' },
  ES: { whtPct: 19, capPct: 15, label: 'Spain' },
  IT: { whtPct: 15, capPct: 15, label: 'Italy' },
  IE: { whtPct: 15, capPct: 15, label: 'Ireland' },
  GENERIC_15: { whtPct: 15, capPct: 15, label: 'Treaty default (15%)' },
  NONE_0: { whtPct: 0, capPct: 0, label: 'No treaty / 0% WHT' },
};

// Small local segmented control for two or more options
function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-input bg-background p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'px-2 py-1 text-xs rounded-md transition-colors ' +
              (active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
function InputAdornment({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
  type = 'text',
  prefix,
  suffix,
  placeholder,
  className,
}: {
  id?: string;
  value: number | string;
  onChange: InputHTMLAttributes<HTMLInputElement>['onChange'];
  step?: number;
  min?: number;
  max?: number;
  type?: 'number' | 'text';
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
}) {
  const handleChange: InputHTMLAttributes<HTMLInputElement>['onChange'] = (e) => {
    // Allow users to type commas as decimal separators; convert to dot for numeric parsing
    if (typeof e.target.value === 'string' && e.target.value.includes(',')) {
      e.target.value = e.target.value.replace(/,/g, '.');
    }
    onChange?.(e as any);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '') return;
    let normalized = e.target.value.replace(/,/g, '.');
    normalized = normalized.replace(/[^0-9.+-]/g, '');
    if ((normalized.match(/\./g) || []).length > 1) {
      const first = normalized.indexOf('.');
      normalized = normalized.slice(0, first + 1) + normalized.slice(first + 1).replace(/\./g, '');
    }
    if (normalized === '') return;
    const num = Number(normalized);
    if (!Number.isNaN(num)) {
      const trimmed = String(num);
      if (trimmed !== e.target.value) {
        e.target.value = trimmed;
        const evt = new Event('input', { bubbles: true });
        e.target.dispatchEvent(evt);
      }
    }
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
          {prefix}
        </span>
      )}
      <Input
        id={id}
        value={value as any}
        onChange={handleChange}
        onBlur={handleBlur}
        step={step as any}
        min={min as any}
        max={max as any}
        type={type}
        placeholder={placeholder}
        inputMode="decimal"
        className={
          (className ?? '') + ' h-8 text-sm ' + (prefix ? ' pl-5' : '') + (suffix ? ' pr-8' : '')
        }
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
          {suffix}
        </span>
      )}
    </div>
  );
}
function currency(value: number, locale = 'en-US', currency = 'USD') {
  const v = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(v);
}

// --- USA Federal (2025 per IRS Rev. Proc. 2024-40 via Tax Foundation) ---
// Ordinary income tax brackets (taxable income) for 2025
const USA_BRACKETS_2025: Record<FilingStatus, ReadonlyArray<{ upto: number; rate: number }>> = {
  single: [
    { upto: 11925, rate: 0.1 },
    { upto: 48475, rate: 0.12 },
    { upto: 103350, rate: 0.22 },
    { upto: 197300, rate: 0.24 },
    { upto: 250525, rate: 0.32 },
    { upto: 626350, rate: 0.35 },
    { upto: Infinity, rate: 0.37 },
  ],
  married: [
    { upto: 23850, rate: 0.1 },
    { upto: 96950, rate: 0.12 },
    { upto: 206700, rate: 0.22 },
    { upto: 394600, rate: 0.24 },
    { upto: 501050, rate: 0.32 },
    { upto: 751600, rate: 0.35 },
    { upto: Infinity, rate: 0.37 },
  ],
};

// Long-term capital gains rate thresholds (based on taxable income) for 2025
const USA_LTCG_THRESHOLDS_2025: Record<
  FilingStatus,
  ReadonlyArray<{ upto: number; rate: number }>
> = {
  single: [
    { upto: 48350, rate: 0.0 },
    { upto: 533400, rate: 0.15 },
    { upto: Infinity, rate: 0.2 },
  ],
  married: [
    { upto: 96700, rate: 0.0 },
    { upto: 600050, rate: 0.15 },
    { upto: Infinity, rate: 0.2 },
  ],
};

function progressiveTax(amount: number, brackets: ReadonlyArray<{ upto: number; rate: number }>) {
  if (amount <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const slice = Math.min(amount, b.upto) - prev;
    if (slice > 0) tax += slice * b.rate;
    if (amount <= b.upto) break;
    prev = b.upto;
  }
  return tax;
}

function usaOrdinaryIncomeTax(taxableOrdinary: number, status: FilingStatus) {
  return progressiveTax(taxableOrdinary, USA_BRACKETS_2025[status]);
}

function usaLTCGTax(ltcg: number, status: FilingStatus, taxableOrdinary: number) {
  // Apply preferential rates based on taxable income + LTCG positioning (simplified)
  if (ltcg <= 0) return 0;
  const thresholds = USA_LTCG_THRESHOLDS_2025[status];
  let remaining = ltcg;
  let tax = 0;
  let incomePosition = taxableOrdinary; // simplified: stack LTCG on top of ordinary

  for (const t of thresholds) {
    if (incomePosition >= t.upto) continue;
    const room = t.upto - incomePosition;
    const take = Math.min(remaining, room);
    if (take > 0) tax += take * t.rate;
    remaining -= take;
    incomePosition += take;
    if (remaining <= 0) break;
  }
  return tax + Math.max(0, remaining) * thresholds[thresholds.length - 1].rate;
}

// --- Germany (simplified) ---
// Capital income flat tax: 25% + 5.5% Solidaritätszuschlag on that tax + optional church tax 8% or 9% on that tax.
function deCapitalIncomeTaxBase(amount: number, allowance: number) {
  return Math.max(0, amount - Math.max(0, allowance));
}

function deCapitalTax(amountAfterAllowance: number, churchTaxPct: 0 | 8 | 9) {
  if (amountAfterAllowance <= 0) return 0;
  const baseTax = amountAfterAllowance * 0.25;
  const soli = baseTax * 0.055;
  const church = baseTax * (churchTaxPct / 100);
  return baseTax + soli + church;
}

// §32a EStG 2025 Grundtarif (exact, rounded down to full euro). Splittingtarif via x/2 * 2.
function deIncomeTax2025(zvE: number, status: FilingStatus) {
  const grundtarif = (x: number) => {
    const X = Math.max(0, Math.floor(x)); // zvE rounded down to full €
    const y = (X - 12096) / 10000;
    const z = (X - 17443) / 10000;
    let est = 0;
    if (X <= 12096) {
      est = 0;
    } else if (X <= 17443) {
      est = (932.3 * y + 1400) * y;
    } else if (X <= 68480) {
      est = (176.64 * z + 2397) * z + 1015.13;
    } else if (X <= 277825) {
      est = 0.42 * X - 10911.92;
    } else {
      est = 0.45 * X - 19246.67;
    }
    return Math.max(0, Math.floor(est)); // tax rounded down to full €
  };
  if (status === 'married') {
    return 2 * grundtarif(zvE / 2);
  }
  return grundtarif(zvE);
}

// Solidaritätszuschlag 2025 with Freigrenze + Gleitzone (based on income tax amount, not including church tax)
function deSoliOnIncomeTax2025(incomeTaxAmount: number, status: FilingStatus) {
  const F = status === 'married' ? 39900 : 19950; // Freigrenze (ESt-Betrag)
  const E = Math.max(0, incomeTaxAmount);
  if (E <= F) return 0;
  const cap = 0.119 * (E - F);
  const full = 0.055 * E;
  return Math.min(cap, full);
}

// Payroll withholding approximation by Steuerklasse
// Note: This is an approximation for monthly Lohnsteuer following the logic of §39b EStG in broad strokes.
// We annualize salary and compute using deIncomeTax2025 with status depending on class rules, then de-annualize monthly withholding.
function dePayrollWithholdingByClass(
  annualSalary: number,
  taxClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI',
  opts: {
    spouseAnnualSalary?: number;
    childrenCount?: number; // used to suppress PV childless surcharge and class II relief approximation
  },
) {
  const income = Math.max(0, annualSalary);
  const spouse = Math.max(0, opts.spouseAnnualSalary ?? 0);
  const kids = Math.max(0, Math.floor(opts.childrenCount ?? 0));

  // Basic class handling
  // - I/IV: taxed as single for withholding; IV for married spouse working
  // - II: like I but include a small fixed relief (Entlastungsbetrag) approximation per year
  // - III/V: split combined income with advantage to III
  // - VI: higher withholding (second job) – approximate with a 10% surcharge on computed ESt

  // Helper: compute annual tax via deIncomeTax2025 given a zvE approx; we exclude allowances here
  const computeAnnualESt = (zve: number, filing: FilingStatus) =>
    deIncomeTax2025(Math.max(0, zve), filing);

  let annualESt = 0;
  let filingForSoli: FilingStatus = 'single';

  switch (taxClass) {
    case 'I':
      filingForSoli = 'single';
      annualESt = computeAnnualESt(income, 'single');
      break;
    case 'II': {
      filingForSoli = 'single';
      const relief = 4260; // 2025 Entlastungsbetrag (approx) for single parents
      annualESt = Math.max(0, computeAnnualESt(income, 'single') - Math.floor(relief));
      break;
    }
    case 'IV':
      filingForSoli = 'married';
      // Withholding like married with no splitting advantage per person (approx)
      // We compute tax on each spouse income and sum (both class IV); here we approximate using this person's income only
      annualESt = computeAnnualESt(income, 'single');
      break;
    case 'III': {
      filingForSoli = 'married';
      // Favorable splitting: tax on combined income with splitting method, allocate majority to class III holder
      const combined = income + spouse;
      const totalTax = computeAnnualESt(combined, 'married');
      // Allocate by income share, but skew 60/40 to III/V for realism
      const share = combined > 0 ? income / combined : 1;
      const skewed = Math.min(1, Math.max(0, 0.6 + 0.4 * share));
      annualESt = totalTax * skewed;
      break;
    }
    case 'V': {
      filingForSoli = 'married';
      const combined = income + spouse;
      const totalTax = computeAnnualESt(combined, 'married');
      const share = combined > 0 ? income / combined : 0;
      const skewed = Math.max(0, Math.min(1, 0.4 * share));
      annualESt = totalTax * skewed;
      break;
    }
    case 'VI':
      filingForSoli = 'single';
      annualESt = Math.floor(computeAnnualESt(income, 'single') * 1.1);
      break;
  }

  const soli = deSoliOnIncomeTax2025(annualESt, filingForSoli);
  return { annualESt, annualSoli: soli, filingForSoli };
}

export default function TaxCalculator() {
  const [country, setCountry] = useState<Country>('USA');
  const [status, setStatus] = useState<FilingStatus>('single');

  // Common inputs
  const [salaryIncome, setSalaryIncome] = useState(80000);
  const [capitalGains, setCapitalGains] = useState(5000);
  const [holdingPeriodLong, setHoldingPeriodLong] = useState(true); // US only meaningful
  const [dividends, setDividends] = useState(2000);
  const [qualifiedDividends, setQualifiedDividends] = useState(true); // US only
  const [interestIncome, setInterestIncome] = useState(0);

  // USA specific
  const getUsStandardDeduction = (s: FilingStatus) => (s === 'married' ? 30000 : 15000);
  const [usStandardDeduction, setUsStandardDeduction] = useState(() =>
    getUsStandardDeduction(status),
  );
  const [usItemizedDeductions, setUsItemizedDeductions] = useState(0);
  const [usIncludePayroll, setUsIncludePayroll] = useState(true);
  const [usPretaxAdjustments, setUsPretaxAdjustments] = useState(0); // 401(k), HSA, etc. (approx)
  const [usStateTaxRate, setUsStateTaxRate] = useState(0); // optional user-provided
  const [includeNIIT, setIncludeNIIT] = useState(false);
  // USA: extra standard deduction for age 65/blind (user enters total extra amount)
  const [usExtraSDAmount, setUsExtraSDAmount] = useState(0);
  // USA: state presets (flat approximations)
  const [usStatePreset, setUsStatePreset] = useState<
    'custom' | 'none' | 'CA' | 'NY' | 'IL' | 'MA' | 'NJ'
  >('custom');
  // USA: estimators (QBI §199A and AMT) – simplified
  const [usQBIEnabled, setUsQBIEnabled] = useState(false);
  const [usQBIIncome, setUsQBIIncome] = useState(0);
  const [usAMTEnabled, setUsAMTEnabled] = useState(false);
  const [usAMTAdjustments, setUsAMTAdjustments] = useState(0);
  const [usAMTExemption, setUsAMTExemption] = useState(0);
  const [usAMTRate, setUsAMTRate] = useState<'26' | '28'>('26');

  // Germany specific
  const [deAllowance, setDeAllowance] = useState(() => (status === 'single' ? 1000 : 2000)); // Sparer-Pauschbetrag
  const [deChurchTaxPct, setDeChurchTaxPct] = useState<0 | 8 | 9>(0);
  // Germany: Steuerklasse (payroll withholding class)
  type DeTaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  const [deTaxClass, setDeTaxClass] = useState<DeTaxClass>(() =>
    status === 'married' ? 'IV' : 'I',
  );
  // Germany: children count (affects class II relief and PV childless surcharge)
  const [deChildrenCount, setDeChildrenCount] = useState(0);
  // Germany: spouse salary (for III/V allocation when married)
  const [deSpouseSalary, setDeSpouseSalary] = useState(0);
  // Germany: Foreign dividends (DTA credit)
  const [deForeignDividends, setDeForeignDividends] = useState(0); // portion of dividends from abroad
  const [deDtaMode, setDeDtaMode] = useState<'simple' | 'advanced'>('simple');
  // Germany: DTA by country (advanced mode)
  const [deDtaCountry, setDeDtaCountry] = useState<DeDtaCountry>('GENERIC_15');
  // Germany: Residence flag for Saxony (employee pays higher PV share)
  const [deResidenceSaxony, setDeResidenceSaxony] = useState(false);
  // Germany: Payroll precision and IV/IV Faktor (stub)
  const [dePayrollPrecision, setDePayrollPrecision] = useState<'simple' | 'detailed'>('simple');
  const [deIVFaktor, setDeIVFaktor] = useState(1.0);
  const [deIVFaktorAuto, setDeIVFaktorAuto] = useState(true);
  // Germany Vorabpauschale inputs
  const [deVorabEnabled, setDeVorabEnabled] = useState(false);
  const [deVorabStartValue, setDeVorabStartValue] = useState(0); // fund value at Jan 1 of the year
  const [deVorabEndValue, setDeVorabEndValue] = useState<number | ''>(''); // optional year-end value
  const [deVorabDistributions, setDeVorabDistributions] = useState(0); // distributions during the year
  const [deVorabMonthsEligible, setDeVorabMonthsEligible] = useState(12); // months held in the year (0-12)
  const [deVorabBasiszinsPct, setDeVorabBasiszinsPct] = useState(2.53); // Basiszins for 2025
  const [deVorabTeilfreistellungPct, setDeVorabTeilfreistellungPct] = useState<
    0 | 15 | 30 | 60 | 80
  >(30);
  // Always include income Soli and use payroll-style calculations (constants; employer pays ~half)
  // Social insurance rates (totals); employee share ≈ half. PV childless surcharge paid by employee.
  const deRvTotalPct = 18.6; // pension total
  const deAlvTotalPct = 2.6; // unemployment total
  const deKvTotalPct = 17.1; // health total (incl. Zusatzbeitrag avg.)
  const dePvTotalPct = 4.2; // long-term care total
  const dePvChildlessSurchargePct = 0.3; // employee-only surcharge
  // Simple BBGs (only apply if salary exceeds; for 55k they don’t bind, so defaults are fine)
  const DE_RV_BBG = 90600;
  const DE_ALV_BBG = 90600;
  const DE_KV_PV_BBG = 62100;
  // Basic allowances in payroll approx
  const deWerbungskostenPauschale = 1230;
  const deSonderausgabenPauschbetrag = 36;

  // Keep deductions/allowances in sync with filing status when country changes filing context
  function onStatusChange(next: FilingStatus) {
    setStatus(next);
    if (country === 'USA') setUsStandardDeduction(getUsStandardDeduction(next));
    if (country === 'Germany') setDeAllowance(next === 'single' ? 1000 : 2000);
    if (country === 'Germany') setDeTaxClass(next === 'married' ? 'IV' : 'I');
  }

  const result = useMemo(() => {
    // Aggregate capital income inputs handled per-country; Vorabpauschale may augment capital income in Germany
    // Vorabpauschale (optional)
    let vorab: null | {
      enabled: boolean;
      start: number;
      end: number | '';
      basiszinsPct: number;
      monthsEligible: number;
      distributions: number;
      basisertrag: number;
      gross: number;
      teilfreistellungPct: number;
      taxable: number;
    } = null;

    if (deVorabEnabled && deVorabStartValue > 0) {
      const months = Math.min(12, Math.max(0, Math.floor(deVorabMonthsEligible)));
      const basiszins = Math.max(0, deVorabBasiszinsPct) / 100;
      const basisertrag = deVorabStartValue * basiszins * 0.7 * (months / 12);
      const dist = Math.max(0, deVorabDistributions);
      const capByGrowth =
        typeof deVorabEndValue === 'number' && deVorabEndValue > 0
          ? Math.max(0, deVorabEndValue - deVorabStartValue)
          : Infinity;
      const gross = Math.max(0, Math.min(Math.max(0, basisertrag - dist), capByGrowth));
      const teilf = 1 - Math.max(0, deVorabTeilfreistellungPct) / 100;
      const taxable = gross * teilf;
      vorab = {
        enabled: true,
        start: deVorabStartValue,
        end: deVorabEndValue,
        basiszinsPct: deVorabBasiszinsPct,
        monthsEligible: months,
        distributions: dist,
        basisertrag,
        gross,
        teilfreistellungPct: deVorabTeilfreistellungPct,
        taxable,
      };
    }

    const baseCapIncome =
      Math.max(0, capitalGains) + Math.max(0, dividends) + Math.max(0, interestIncome);
    const capIncomeTotal = baseCapIncome + (vorab?.taxable || 0);

    if (country === 'USA') {
      const wages = Math.max(0, salaryIncome);
      const interest = Math.max(0, interestIncome);
      const div = Math.max(0, dividends);
      const cap = capitalGains; // allow negative for loss handling

      // Split capital gains: we only model either ST or LT via holdingPeriodLong flag
      const stGains = !holdingPeriodLong ? Math.max(0, cap) : 0;
      const ltGains = holdingPeriodLong ? Math.max(0, cap) : 0;
      const capLoss = cap < 0 ? -cap : 0; // absolute value of loss if any
      const capLossOrdinaryOffsetLimit = status === 'married' ? 3000 : 3000; // MFJ & Single/HoH: $3,000
      const capLossOrdinaryOffset = Math.min(capLoss, capLossOrdinaryOffsetLimit);

      const ordinaryBase = wages + interest + (qualifiedDividends ? 0 : div) + stGains;
      // Apply optional pre-tax adjustments (approx.) and capital loss ordinary offset
      const aboveLineAdj = Math.max(0, usPretaxAdjustments) + capLossOrdinaryOffset;
      const ordinaryAfterAdj = Math.max(0, ordinaryBase - aboveLineAdj);

      // Preferential income: qualified dividends + positive LT gains only (loss does NOT offset dividends beyond $3k ordinary)
      const prefIncome = (qualifiedDividends ? div : 0) + ltGains;

      // Deductions: higher of (standard + extra SD) vs. itemized
      const SD = Math.max(0, usStandardDeduction + Math.max(0, usExtraSDAmount));
      const itemized = Math.max(0, usItemizedDeductions);
      const deduction = Math.max(SD, itemized);

      // Allocate deduction: first to ordinary, leftover to preferential
      const shelteredOrdinary = Math.min(ordinaryAfterAdj, deduction);
      const leftoverForPref = Math.max(0, deduction - shelteredOrdinary);
      const taxableOrdinaryBeforeQBI = Math.max(0, ordinaryAfterAdj - deduction);
      // QBI (199A) estimator: 20% of min(QBI income, taxable ordinary pre-QBI); ignores wage/property limits and phaseouts
      const qbiDeduction =
        usQBIEnabled && usQBIIncome > 0
          ? Math.max(0, Math.min(0.2 * usQBIIncome, 0.2 * taxableOrdinaryBeforeQBI))
          : 0;
      const taxableOrdinary = Math.max(0, taxableOrdinaryBeforeQBI - qbiDeduction);
      const taxablePref = Math.max(0, prefIncome - leftoverForPref);

      // Federal taxes
      const federalOrdinaryTax = usaOrdinaryIncomeTax(taxableOrdinary, status);
      const federalLTCGTax = usaLTCGTax(taxablePref, status, taxableOrdinary);

      // NIIT 3.8%: lesser of NII vs MAGI excess above threshold
      let niit = 0;
      if (includeNIIT) {
        const niitThreshold = status === 'married' ? 250000 : 200000; // MFJ vs Single/HoH
        const MAGIapprox = wages + interest + div + Math.max(0, cap);
        const netInvestmentIncome = interest + div + stGains + ltGains; // NII cannot be negative
        const excess = Math.max(0, MAGIapprox - niitThreshold);
        const niitBase = Math.min(netInvestmentIncome, excess);
        niit = niitBase * 0.038;
      }

      // State tax: many states tax LTCG same as ordinary (simplified)
      const stateRate = Math.max(0, Math.min(20, usStateTaxRate)) / 100;
      const stateTax = (taxableOrdinary + taxablePref) * stateRate;

      // Payroll taxes (FICA)
      const SSA_WAGE_BASE_2025 = 176100;
      const ssTax = Math.min(wages, SSA_WAGE_BASE_2025) * 0.062;
      const addlMedicareThreshold = status === 'married' ? 250000 : 200000; // Single/HoH $200k
      const medicareBase = wages * 0.0145;
      const medicareAddl = Math.max(0, wages - addlMedicareThreshold) * 0.009;
      const payrollTax = usIncludePayroll ? ssTax + medicareBase + medicareAddl : 0;

      // AMT estimator: tentative minimum tax less regular federal (if positive)
      let amtTopUp = 0;
      if (usAMTEnabled) {
        const amti = taxableOrdinary + taxablePref + Math.max(0, usAMTAdjustments);
        const amtEx = Math.max(0, usAMTExemption);
        const amtBase = Math.max(0, amti - amtEx);
        const rate = usAMTRate === '28' ? 0.28 : 0.26;
        const tentativeMinTax = amtBase * rate;
        const regularFederal = federalOrdinaryTax + federalLTCGTax;
        amtTopUp = Math.max(0, tentativeMinTax - regularFederal);
      }

      const totalTax =
        federalOrdinaryTax + federalLTCGTax + stateTax + niit + payrollTax + amtTopUp;
      const totalIncome = wages + interest + div + Math.max(0, cap);
      const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;

      return {
        locale: 'en-US' as const,
        currencyCode: 'USD' as const,
        incomeTax: federalOrdinaryTax + stateTax + niit + amtTopUp,
        capitalTax: federalLTCGTax,
        totalTax,
        effectiveRate,
        _details: {
          ordinaryIncome: ordinaryBase,
          prefIncome,
          standardDeduction: SD,
          itemizedDeductions: itemized,
          deductionUsed: deduction,
          taxableOrdinary,
          taxablePref,
          federalOrdinaryTax,
          federalLTCGTax,
          stateTax,
          niit,
          capLossOrdinaryOffset,
          qbi: usQBIEnabled ? { income: usQBIIncome, deduction: qbiDeduction } : undefined,
          amt: usAMTEnabled
            ? {
                adjustments: usAMTAdjustments,
                exemption: usAMTExemption,
                rate: usAMTRate,
                topUp: amtTopUp,
              }
            : undefined,
          payroll: usIncludePayroll
            ? {
                ss: ssTax,
                medicare: medicareBase,
                medicareAddl: medicareAddl,
                total: payrollTax,
                netAfterFICA: Math.max(0, wages - (ssTax + medicareBase + medicareAddl)),
              }
            : undefined,
        },
      };
    }

    // Germany (always payroll-style)
    // Compute income tax including Soli and optional church tax, plus payroll social contributions.
    let incomeTax = 0; // includes Einkommensteuer + Soli + church tax
    let taxableIncome = 0;
    let usedFaktorForDetails: number | null = null;
    let payroll = undefined as
      | {
          rv: number;
          alv: number;
          kv: number;
          pv: number;
          socialSum: number;
          zvE: number;
          est: number;
          soliOnIncome: number;
          churchTax: number;
          netSalary: number;
        }
      | undefined;

    if (country === 'Germany') {
      // Employee shares (halve totals). PV adds childless surcharge.
      const rvRate = deRvTotalPct / 2 / 100;
      const alvRate = deAlvTotalPct / 2 / 100;
      const kvRate = deKvTotalPct / 2 / 100;
      // PV childless surcharge applies only if no children
      // Saxony: employee PV share is approx. +0.5 percentage points vs the employer
      const pvEmployeeSharePct = dePvTotalPct / 2 + (deResidenceSaxony ? 0.5 : 0);
      const pvRate =
        pvEmployeeSharePct / 100 + (deChildrenCount > 0 ? 0 : dePvChildlessSurchargePct / 100);

      const rv = Math.min(salaryIncome, DE_RV_BBG) * rvRate;
      const alv = Math.min(salaryIncome, DE_ALV_BBG) * alvRate;
      const kv = Math.min(salaryIncome, DE_KV_PV_BBG) * kvRate;
      const pv = Math.min(salaryIncome, DE_KV_PV_BBG) * pvRate;
      const socialSum = rv + alv + kv + pv;

      // Vorsorgepauschale for payroll tax base (approx per §39b EStG)
      const rvBase = Math.min(salaryIncome, DE_RV_BBG);
      const kvPvBase = Math.min(salaryIncome, DE_KV_PV_BBG);
      // Part 1: 9.3% of RV base (employee half of 18.6%), 100% since 2023
      const vpPart1 = rvBase * 0.093;
      // Part 2a: 12% of wage capped at 1,900 (single) / 3,000 (married)
      const cap2a = status === 'married' ? 3000 : 1900;
      const vpPart2a = Math.min(salaryIncome * 0.12, cap2a);
      // Part 2b: statutory KV (7.0% + half Zusatzbeitrag) + PV employee base (without childless surcharge)
      const kvBaseRate = 7.3; // % half of 14.6% base rate
      const kvZusatzHalf = Math.max(0, deKvTotalPct - 14.6) / 2; // total extra split in half
      const vpKvRate = kvBaseRate + kvZusatzHalf; // %
      const vpPvRate = dePvTotalPct / 2; // exclude childless surcharge here
      const vpPart2b = (kvPvBase * (vpKvRate + vpPvRate)) / 100;
      const vorsorgePauschale = vpPart1 + Math.max(vpPart2a, vpPart2b);

      // Helper: approximate zvE from a given salary using same structure (used for spouse in Faktor)
      const approxZveFromSalary = (gross: number) => {
        const rv2 = Math.min(gross, DE_RV_BBG) * rvRate;
        const alv2 = Math.min(gross, DE_ALV_BBG) * alvRate;
        const kv2 = Math.min(gross, DE_KV_PV_BBG) * kvRate;
        const pv2 = Math.min(gross, DE_KV_PV_BBG) * pvRate;
        const rvBase2 = Math.min(gross, DE_RV_BBG);
        const kvPvBase2 = Math.min(gross, DE_KV_PV_BBG);
        const vpPart1_2 = rvBase2 * 0.093;
        const cap2a_2 = status === 'married' ? 3000 : 1900;
        const vpPart2a_2 = Math.min(gross * 0.12, cap2a_2);
        const kvBaseRate2 = 7.3; // %
        const kvZusatzHalf2 = Math.max(0, deKvTotalPct - 14.6) / 2;
        const vpKvRate2 = kvBaseRate2 + kvZusatzHalf2; // %
        const vpPvRate2 = dePvTotalPct / 2; // exclude childless surcharge
        const vpPart2b_2 = (kvPvBase2 * (vpKvRate2 + vpPvRate2)) / 100;
        const vorsorge2 = vpPart1_2 + Math.max(vpPart2a_2, vpPart2b_2);
        const out = Math.max(
          0,
          gross -
            Math.max(0, deWerbungskostenPauschale) -
            Math.max(0, deSonderausgabenPauschbetrag) -
            vorsorge2,
        );
        return out;
      };

      // Taxable wage for payroll income tax (this taxpayer)
      const zvE = Math.max(
        0,
        salaryIncome -
          Math.max(0, deWerbungskostenPauschale) -
          Math.max(0, deSonderausgabenPauschbetrag) -
          vorsorgePauschale,
      );

      // Compute income tax via Steuerklasse-based withholding approximation (annualized)
      // We use zvE as the base for tax function by class; provide spouse salary where relevant
      const baseWithholding = dePayrollWithholdingByClass(zvE, deTaxClass, {
        spouseAnnualSalary: deSpouseSalary,
        childrenCount: deChildrenCount,
      });
      // Optional detailed mode: IV/IV mit Faktor – auto or manual factor scaling
      let eSt = baseWithholding.annualESt;
      let soliOnIncome = baseWithholding.annualSoli;
      let usedFaktor: number | null = null;
      if (dePayrollPrecision === 'detailed' && deTaxClass === 'IV') {
        if (deIVFaktorAuto && deSpouseSalary > 0) {
          const zvE_spouse = approxZveFromSalary(deSpouseSalary);
          const estMarried = deIncomeTax2025(zvE + zvE_spouse, 'married');
          const estSingles = deIncomeTax2025(zvE, 'single') + deIncomeTax2025(zvE_spouse, 'single');
          const f = estSingles > 0 ? estMarried / estSingles : 1.0;
          usedFaktor = Math.min(2, Math.max(0.1, f));
        } else if (Number.isFinite(deIVFaktor) && deIVFaktor > 0) {
          usedFaktor = deIVFaktor;
        }
        if (usedFaktor && usedFaktor > 0) {
          eSt = Math.max(0, baseWithholding.annualESt * usedFaktor);
          soliOnIncome = deSoliOnIncomeTax2025(eSt, baseWithholding.filingForSoli);
        }
        usedFaktorForDetails = usedFaktor ?? deIVFaktor;
      }
      const churchTax = eSt * (deChurchTaxPct / 100);
      const netSalary = Math.max(0, salaryIncome - socialSum - eSt - soliOnIncome - churchTax);

      incomeTax = eSt + soliOnIncome + churchTax;
      taxableIncome = zvE; // for details section
      payroll = { rv, alv, kv, pv, socialSum, zvE, est: eSt, soliOnIncome, churchTax, netSalary };
    }
    const capAfterAllowance = deCapitalIncomeTaxBase(capIncomeTotal, Math.max(0, deAllowance));
    let capTax = deCapitalTax(capAfterAllowance, deChurchTaxPct);
    // Foreign dividends DTA credit (simplified): credit limited to min(withheld, treaty cap of foreign portion's base tax)
    if (country === 'Germany' && deForeignDividends > 0) {
      const foreignPortion = Math.min(Math.max(0, deForeignDividends), capAfterAllowance);
      // Determine rates based on mode
      const { whtPct, capPct } =
        deDtaMode === 'simple' ? { whtPct: 15, capPct: 15 } : DTA_COUNTRY_RATES[deDtaCountry];
      const treatyCap = Math.max(0, Math.min(30, capPct)) / 100;
      const withheld = Math.max(0, Math.min(35, whtPct)) / 100;
      const baseTaxOnForeign = foreignPortion * 0.25; // only the 25% base is creditable
      const creditCap = baseTaxOnForeign * treatyCap;
      const credit = Math.min(baseTaxOnForeign * withheld, creditCap);
      capTax = Math.max(0, capTax - credit);
    }
    const totalTax = incomeTax + capTax;
    const totalIncome = Math.max(0, salaryIncome) + capIncomeTotal;
    const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;

    return {
      currencyCode: 'EUR' as const,
      locale: 'de-DE' as const,
      incomeTax,
      capitalTax: capTax,
      totalTax,
      effectiveRate,
      _details: {
        taxableIncome,
        capAfterAllowance,
        churchTaxPct: deChurchTaxPct,
        taxClass: deTaxClass,
        spouseSalary: deSpouseSalary,
        childrenCount: deChildrenCount,
        incomeSoliIncluded: true,
        payroll,
        saxony: deResidenceSaxony,
        payrollPrecision: dePayrollPrecision,
        ivFaktor: usedFaktorForDetails ?? deIVFaktor,
        ivFaktorAuto: deIVFaktorAuto,
        vorab,
        foreignDividends: country === 'Germany' ? deForeignDividends : 0,
        foreignWHTPct:
          country === 'Germany'
            ? deDtaMode === 'simple'
              ? 15
              : DTA_COUNTRY_RATES[deDtaCountry].whtPct
            : 0,
        treatyCapPct:
          country === 'Germany'
            ? deDtaMode === 'simple'
              ? 15
              : DTA_COUNTRY_RATES[deDtaCountry].capPct
            : 0,
        dtaMode: country === 'Germany' ? deDtaMode : 'simple',
        dtaCountry: country === 'Germany' ? deDtaCountry : undefined,
      },
    };
  }, [
    country,
    status,
    salaryIncome,
    capitalGains,
    holdingPeriodLong,
    dividends,
    qualifiedDividends,
    interestIncome,
    usStandardDeduction,
    usItemizedDeductions,
    usPretaxAdjustments,
    usIncludePayroll,
    usStateTaxRate,
    deAllowance,
    deChurchTaxPct,
    deTaxClass,
    deChildrenCount,
    deSpouseSalary,
    deResidenceSaxony,
    dePayrollPrecision,
    deIVFaktor,
    deIVFaktorAuto,
    deForeignDividends,

    deDtaMode,
    deDtaCountry,
    includeNIIT,
    deRvTotalPct,
    deAlvTotalPct,
    deKvTotalPct,
    dePvTotalPct,
    dePvChildlessSurchargePct,
    deWerbungskostenPauschale,
    deSonderausgabenPauschbetrag,
    deVorabEnabled,
    deVorabStartValue,
    deVorabEndValue,
    deVorabDistributions,
    deVorabMonthsEligible,
    deVorabBasiszinsPct,
    deVorabTeilfreistellungPct,
    usExtraSDAmount,
    usQBIEnabled,
    usQBIIncome,
    usAMTEnabled,
    usAMTAdjustments,
    usAMTExemption,
    usAMTRate,
  ]);

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="border rounded-2xl shadow-sm bg-transparent">
        <CardHeader className="py-3">
          <div>
            <CardTitle className="text-lg">Tax Calculator</CardTitle>
            <CardDescription className="text-xs">
              Estimate income and investment taxes for USA or Germany. Simplified and for
              illustration only.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            {/* Left: Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1 block">Country</Label>
                  <Segmented
                    value={country}
                    onChange={(v: string) => setCountry(v as Country)}
                    options={[
                      { label: 'USA', value: 'USA' },
                      { label: 'Germany', value: 'Germany' },
                    ]}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Filing status</Label>
                  <Segmented
                    value={status}
                    onChange={(v: string) => onStatusChange(v as FilingStatus)}
                    options={[
                      { label: 'Single', value: 'single' },
                      { label: 'Married', value: 'married' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="salary" className="text-xs mb-1 block">
                  Annual salary income
                </Label>
                <div className="flex items-center gap-2">
                  <InputAdornment
                    id="salary"
                    prefix={country === 'USA' ? '$' : '€'}
                    step={1000}
                    min={0}
                    value={salaryIncome}
                    onChange={(e) => setSalaryIncome(Number(e.target.value))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    title="Reset inputs to defaults"
                    onClick={() => {
                      setSalaryIncome(80000);
                      setCapitalGains(5000);
                      setDividends(2000);
                      setInterestIncome(0);
                      setHoldingPeriodLong(true);
                      setQualifiedDividends(true);
                      onStatusChange('single');
                      setCountry('USA');
                      setUsStandardDeduction(getUsStandardDeduction('single'));
                      setUsItemizedDeductions(0);
                      setUsPretaxAdjustments(0);
                      setUsIncludePayroll(true);
                      setUsStateTaxRate(0);
                      setUsExtraSDAmount(0);
                      setUsStatePreset('custom');
                      setUsQBIEnabled(false);
                      setUsQBIIncome(0);
                      setUsAMTEnabled(false);
                      setUsAMTAdjustments(0);
                      setUsAMTExemption(0);
                      setUsAMTRate('26');
                      setDeAllowance(1000);
                      setDeChurchTaxPct(0);
                      setDeTaxClass('I');
                      setDeChildrenCount(0);
                      setDeSpouseSalary(0);
                      setDeResidenceSaxony(false);
                      setDePayrollPrecision('simple');
                      setDeIVFaktor(1.0);
                      setDeIVFaktorAuto(true);
                      setDeForeignDividends(0);
                      setDeDtaMode('simple');
                      setDeDtaCountry('GENERIC_15');
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Reset</span>
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="capGains" className="text-xs">
                      Capital gains realized
                    </Label>
                    {country === 'USA' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Capital loss tip"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                          Enter a negative number for a loss. Up to $3,000 of net capital losses can
                          offset ordinary income.
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <InputAdornment
                    id="capGains"
                    step={100}
                    value={capitalGains}
                    onChange={(e) => setCapitalGains(Number(e.target.value))}
                    prefix={country === 'USA' ? '$' : '€'}
                  />
                  {country === 'USA' && (
                    <div className="mt-1 flex gap-2 text-[11px] items-center">
                      <span className="opacity-80">Term:</span>
                      <Segmented
                        value={holdingPeriodLong ? 'lt' : 'st'}
                        onChange={(v: string) => setHoldingPeriodLong(v === 'lt')}
                        options={[
                          { label: 'Short', value: 'st' },
                          { label: 'Long (1y+)', value: 'lt' },
                        ]}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="dividends" className="text-xs mb-1 block">
                    Dividends
                  </Label>
                  <InputAdornment
                    id="dividends"
                    min={0}
                    step={100}
                    value={dividends}
                    onChange={(e) => setDividends(Number(e.target.value))}
                    prefix={country === 'USA' ? '$' : '€'}
                  />
                  {country === 'USA' && (
                    <div className="mt-1 flex gap-2 text-[11px] items-center">
                      <span className="opacity-80">Qualified?</span>
                      <Segmented
                        value={qualifiedDividends ? 'yes' : 'no'}
                        onChange={(v: string) => setQualifiedDividends(v === 'yes')}
                        options={[
                          { label: 'No', value: 'no' },
                          { label: 'Yes', value: 'yes' },
                        ]}
                      />
                    </div>
                  )}
                </div>
                {country === 'Germany' && (
                  <div>
                    <Label className="text-xs mb-1 block">DTA mode</Label>
                    <Segmented
                      value={deDtaMode}
                      onChange={(v: string) => setDeDtaMode(v as 'simple' | 'advanced')}
                      options={[
                        { label: 'Simple', value: 'simple' },
                        { label: 'By country', value: 'advanced' },
                      ]}
                    />
                    <div className={deDtaMode === 'simple' ? '' : 'hidden'}>
                      <Label htmlFor="foreignDivs" className="text-xs mb-1 block">
                        Foreign portion (default 15% credit)
                      </Label>
                      <InputAdornment
                        id="foreignDivs"
                        min={0}
                        step={50}
                        value={deForeignDividends}
                        onChange={(e) => setDeForeignDividends(Number(e.target.value))}
                        prefix="€"
                      />
                    </div>
                    <div className={deDtaMode === 'advanced' ? 'space-y-2' : 'hidden'}>
                      <div>
                        <Label htmlFor="dtaCountry" className="text-xs mb-1 block">
                          Source country
                        </Label>
                        <select
                          id="dtaCountry"
                          className="w-full h-9 rounded-md border bg-background text-sm px-2"
                          value={deDtaCountry}
                          onChange={(e) => setDeDtaCountry(e.target.value as DeDtaCountry)}
                        >
                          <option value="GENERIC_15">Treaty default (15%)</option>
                          <option value="US">United States</option>
                          <option value="CH">Switzerland</option>
                          <option value="UK">United Kingdom</option>
                          <option value="FR">France</option>
                          <option value="NL">Netherlands</option>
                          <option value="CA">Canada</option>
                          <option value="ES">Spain</option>
                          <option value="IT">Italy</option>
                          <option value="IE">Ireland</option>
                          <option value="NONE_0">No treaty / 0% WHT</option>
                        </select>
                        <div className="text-[11px] opacity-70 mt-1">
                          Using {DTA_COUNTRY_RATES[deDtaCountry].whtPct}% WHT, cap{' '}
                          {DTA_COUNTRY_RATES[deDtaCountry].capPct}%
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="foreignDivsAdv" className="text-xs mb-1 block">
                          Foreign portion
                        </Label>
                        <InputAdornment
                          id="foreignDivsAdv"
                          min={0}
                          step={50}
                          value={deForeignDividends}
                          onChange={(e) => setDeForeignDividends(Number(e.target.value))}
                          prefix="€"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Next row starts automatically because we have three columns above */}
                {/* Next row starts automatically */}
                <div>
                  <Label htmlFor="interest" className="text-xs mb-1 block">
                    Interest income
                  </Label>
                  <InputAdornment
                    id="interest"
                    min={0}
                    step={100}
                    value={interestIncome}
                    onChange={(e) => setInterestIncome(Number(e.target.value))}
                    prefix={country === 'USA' ? '$' : '€'}
                  />
                </div>
                {/* Removed duplicate Sparer-Pauschbetrag field for Germany here; single field kept in Germany-specific section below */}
              </div>

              {country === 'USA' ? (
                <div className="grid md:grid-cols-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor="stdDed" className="text-xs">
                        Standard deduction
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Standard deduction defaults"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                          2025 defaults: Single $15,000 · MFJ $30,000 · HoH $22,500.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <InputAdornment
                      id="stdDed"
                      min={0}
                      step={100}
                      value={usStandardDeduction}
                      onChange={(e) => setUsStandardDeduction(Number(e.target.value))}
                      prefix="$"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Label
                        htmlFor="extraSD"
                        className="text-xs"
                        title="Additional standard deduction for age 65+ or blind"
                      >
                        Extra SD (age 65/blind)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Extra standard deduction tip"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                          Single/HoH ≈ $1,950 each; Married ≈ $1,550 each. Enter the total amount
                          for all qualifying taxpayers.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <InputAdornment
                      id="extraSD"
                      min={0}
                      step={50}
                      value={usExtraSDAmount}
                      onChange={(e) => setUsExtraSDAmount(Number(e.target.value))}
                      prefix="$"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor="itemized" className="text-xs">
                        Itemized deductions
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Itemized vs standard note"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                          The higher of your standard deduction or itemized deductions will apply
                          automatically.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <InputAdornment
                      id="itemized"
                      min={0}
                      step={100}
                      value={usItemizedDeductions}
                      onChange={(e) => setUsItemizedDeductions(Number(e.target.value))}
                      prefix="$"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor="stateRate" className="text-xs">
                        State tax rate (%)
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="State LTCG note"
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-[11px] leading-snug">
                          Most states tax long-term capital gains like ordinary income. This field
                          uses a flat approximation.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <InputAdornment
                      id="stateRate"
                      min={0}
                      max={20}
                      step={0.1}
                      value={usStateTaxRate}
                      onChange={(e) => {
                        setUsStatePreset('custom');
                        setUsStateTaxRate(Number(e.target.value));
                      }}
                      suffix="%"
                    />
                  </div>
                  <div>
                    <Label htmlFor="statePreset" className="text-xs mb-1 block">
                      State preset
                    </Label>
                    <select
                      id="statePreset"
                      className="w-full h-8 text-sm px-2 rounded-md bg-transparent border border-input"
                      value={usStatePreset}
                      onChange={(e) => {
                        const v = e.target.value as typeof usStatePreset;
                        setUsStatePreset(v);
                        const map: Record<typeof usStatePreset, number> = {
                          custom: usStateTaxRate,
                          none: 0,
                          CA: 9,
                          NY: 6.5,
                          IL: 4.95,
                          MA: 5,
                          NJ: 6.37,
                        };
                        setUsStateTaxRate(map[v] ?? usStateTaxRate);
                      }}
                    >
                      <option value="custom">Custom</option>
                      <option value="none">No income tax (FL/TX/NV/WA…)</option>
                      <option value="CA">CA (approx 9%)</option>
                      <option value="NY">NY (approx 6.5%)</option>
                      <option value="IL">IL (4.95%)</option>
                      <option value="MA">MA (5%)</option>
                      <option value="NJ">NJ (approx 6.37%)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="pretax" className="text-xs mb-1 block">
                      Pretax adjustments
                    </Label>
                    <InputAdornment
                      id="pretax"
                      min={0}
                      step={100}
                      value={usPretaxAdjustments}
                      onChange={(e) => setUsPretaxAdjustments(Number(e.target.value))}
                      prefix="$"
                    />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      401(k), HSA, FSA (approx.)
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 col-span-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] opacity-80">NIIT 3.8%</span>
                      <Segmented
                        value={includeNIIT ? 'on' : 'off'}
                        onChange={(v: string) => setIncludeNIIT(v === 'on')}
                        options={[
                          { label: 'Off', value: 'off' },
                          { label: 'On', value: 'on' },
                        ]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] opacity-80">FICA</span>
                      <Segmented
                        value={usIncludePayroll ? 'on' : 'off'}
                        onChange={(v: string) => setUsIncludePayroll(v === 'on')}
                        options={[
                          { label: 'Off', value: 'off' },
                          { label: 'On', value: 'on' },
                        ]}
                      />
                    </div>
                  </div>
                  {/* USA Estimators (compact) */}
                  <details className="col-span-full border border-border/50 rounded-lg p-2 mt-1">
                    <summary className="cursor-pointer text-xs font-medium opacity-80 select-none">
                      USA Estimators (QBI & AMT)
                    </summary>
                    <div className="grid md:grid-cols-3 gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] opacity-80">QBI</span>
                        <Segmented
                          value={usQBIEnabled ? 'on' : 'off'}
                          onChange={(v: string) => setUsQBIEnabled(v === 'on')}
                          options={[
                            { label: 'Off', value: 'off' },
                            { label: 'On', value: 'on' },
                          ]}
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="qbiIncome"
                          className="text-xs mb-1 block"
                          title="Qualified business income potentially eligible for 199A"
                        >
                          QBI income ($)
                        </Label>
                        <InputAdornment
                          id="qbiIncome"
                          min={0}
                          step={100}
                          value={usQBIIncome}
                          onChange={(e) => setUsQBIIncome(Number(e.target.value))}
                          prefix="$"
                        />
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Deduction ≈ 20% of min(QBI, taxable ordinary)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] opacity-80">AMT</span>
                        <Segmented
                          value={usAMTEnabled ? 'on' : 'off'}
                          onChange={(v: string) => setUsAMTEnabled(v === 'on')}
                          options={[
                            { label: 'Off', value: 'off' },
                            { label: 'On', value: 'on' },
                          ]}
                        />
                      </div>
                      {usAMTEnabled && (
                        <>
                          <div>
                            <Label
                              htmlFor="amtAdj"
                              className="text-xs mb-1 block"
                              title="Add-backs and preference items"
                            >
                              AMT adjustments
                            </Label>
                            <InputAdornment
                              id="amtAdj"
                              min={0}
                              step={100}
                              value={usAMTAdjustments}
                              onChange={(e) => setUsAMTAdjustments(Number(e.target.value))}
                              prefix="$"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="amtEx"
                              className="text-xs mb-1 block"
                              title="AMT exemption amount"
                            >
                              AMT exemption
                            </Label>
                            <InputAdornment
                              id="amtEx"
                              min={0}
                              step={100}
                              value={usAMTExemption}
                              onChange={(e) => setUsAMTExemption(Number(e.target.value))}
                              prefix="$"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="amtRate"
                              className="text-xs mb-1 block"
                              title="AMT tentative minimum tax rate"
                            >
                              AMT rate
                            </Label>
                            <select
                              id="amtRate"
                              className="w-full h-8 text-sm px-2 rounded-md bg-transparent border border-input"
                              value={usAMTRate}
                              onChange={(e) => setUsAMTRate(e.target.value as '26' | '28')}
                            >
                              <option value="26">26%</option>
                              <option value="28">28%</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </details>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-2">
                  <div>
                    <Label
                      htmlFor="allowance"
                      className="text-xs mb-1 block"
                      title="Tax-free allowance for investment income"
                    >
                      Sparer-Pauschbetrag
                    </Label>
                    <InputAdornment
                      id="allowance"
                      className="h-8 text-sm"
                      min={0}
                      step={50}
                      value={deAllowance}
                      onChange={(e) => setDeAllowance(Number(e.target.value))}
                      prefix="€"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="church"
                      className="text-xs mb-1 block"
                      title="Church tax rate varies by state"
                    >
                      Church tax
                    </Label>
                    <select
                      id="church"
                      className="w-full h-8 text-sm px-2 rounded-md bg-transparent border border-input"
                      value={deChurchTaxPct}
                      onChange={(e) => setDeChurchTaxPct(Number(e.target.value) as 0 | 8 | 9)}
                    >
                      <option value={0}>No church tax</option>
                      <option value={8}>8%</option>
                      <option value={9}>9%</option>
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="steuerklasse"
                      className="text-xs mb-1 block"
                      title="German payroll withholding class"
                    >
                      Steuerklasse
                    </Label>
                    <select
                      id="steuerklasse"
                      className="w-full h-8 text-sm px-2 rounded-md bg-transparent border border-input"
                      value={deTaxClass}
                      onChange={(e) => setDeTaxClass(e.target.value as any)}
                    >
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                      <option value="VI">VI</option>
                    </select>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Note: Affects payroll withholding in reality; this tool estimates annual tax.
                    </div>
                  </div>
                  {status === 'married' && (
                    <div>
                      <Label htmlFor="spouseSalary" className="text-xs mb-1 block">
                        Spouse salary (annual)
                      </Label>
                      <InputAdornment
                        id="spouseSalary"
                        min={0}
                        step={1000}
                        value={deSpouseSalary}
                        onChange={(e) => setDeSpouseSalary(Number(e.target.value))}
                        prefix="€"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="childrenCount" className="text-xs mb-1 block">
                      Children
                    </Label>
                    <InputAdornment
                      id="childrenCount"
                      min={0}
                      step={1}
                      value={deChildrenCount}
                      onChange={(e) =>
                        setDeChildrenCount(Math.max(0, Math.floor(Number(e.target.value))))
                      }
                    />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Affects PV childless surcharge and class II relief.
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Vorabpauschale</Label>
                    <div className="flex items-center justify-between h-8 rounded-md border border-input px-2">
                      <span className="text-[11px] text-muted-foreground">Include</span>
                      <div className="scale-90 origin-right">
                        <Switch
                          checked={deVorabEnabled}
                          onCheckedChange={(v) => setDeVorabEnabled(Boolean(v))}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Advanced payroll parameters removed; using statutory constants (employee pays ~half). */}
                  {deVorabEnabled && (
                    <details
                      className="col-span-full border border-border/50 rounded-lg p-2 mt-1"
                      open={deVorabEnabled}
                    >
                      <summary className="cursor-pointer text-xs font-medium opacity-80 select-none">
                        Vorabpauschale (InvStG §18)
                      </summary>
                      <div className="grid md:grid-cols-3 gap-2 mt-2">
                        <div>
                          <Label className="text-xs mb-1 block">Start value 1 Jan</Label>
                          <InputAdornment
                            className="h-8 text-sm"
                            min={0}
                            step={100}
                            value={deVorabStartValue}
                            onChange={(e) =>
                              setDeVorabStartValue(Number((e.target as HTMLInputElement).value))
                            }
                            prefix="€"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Months held in year (0-12)</Label>
                          <InputAdornment
                            className="h-8 text-sm"
                            min={0}
                            step={1}
                            value={deVorabMonthsEligible}
                            onChange={(e) =>
                              setDeVorabMonthsEligible(Number((e.target as HTMLInputElement).value))
                            }
                            suffix="mo"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Distributions during year</Label>
                          <InputAdornment
                            className="h-8 text-sm"
                            min={0}
                            step={50}
                            value={deVorabDistributions}
                            onChange={(e) =>
                              setDeVorabDistributions(Number((e.target as HTMLInputElement).value))
                            }
                            prefix="€"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">
                            Year-end value 31 Dec optional
                          </Label>
                          <InputAdornment
                            className="h-8 text-sm"
                            min={0}
                            step={100}
                            value={deVorabEndValue === '' ? '' : deVorabEndValue}
                            onChange={(e) =>
                              setDeVorabEndValue(
                                (e.target as HTMLInputElement).value === ''
                                  ? ''
                                  : Number((e.target as HTMLInputElement).value),
                              )
                            }
                            prefix="€"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Label className="text-xs">Basiszins</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Basiszins info"
                                  className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs text-[11px] leading-snug"
                              >
                                Annual base interest rate (Basiszins) set by the BMF. Used to
                                compute the imputed return (Basisertrag) for the Vorabpauschale:
                                start value × Basiszins × 70% × months/12. Applies to the prior year
                                and is collected in January. 2025 rate: 2.53%.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <InputAdornment
                            className="h-8 text-sm"
                            min={0}
                            step={0.01}
                            value={deVorabBasiszinsPct}
                            onChange={(e) =>
                              setDeVorabBasiszinsPct(Number((e.target as HTMLInputElement).value))
                            }
                            suffix="%"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Teilfreistellung</Label>
                          <select
                            className="w-full h-8 text-sm px-2 rounded-md bg-transparent border border-input"
                            value={deVorabTeilfreistellungPct}
                            onChange={(e) =>
                              setDeVorabTeilfreistellungPct(
                                Number(e.target.value) as 0 | 15 | 30 | 60 | 80,
                              )
                            }
                          >
                            <option value={0}>0% (e.g., bond funds)</option>
                            <option value={15}>15% (mixed)</option>
                            <option value={30}>30% (equity)</option>
                            <option value={60}>60% (REIT)</option>
                            <option value={80}>80% (special case)</option>
                          </select>
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Right: Results horizontal above a larger Breakdown */}
            <div className="md:pl-2 flex flex-col gap-3 md:sticky md:top-4 self-start">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Card className="bg-gradient-to-b from-muted/20 to-transparent border border-border/50 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-sm">Income tax</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">
                      {currency(result.incomeTax, result.locale, result.currencyCode)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-b from-muted/20 to-transparent border border-border/50 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-sm">Investment taxes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">
                      {currency(result.capitalTax, result.locale, result.currencyCode)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-b from-muted/20 to-transparent border border-border/50 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-sm">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold">
                      {currency(result.totalTax, result.locale, result.currencyCode)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Effective rate: {(result.effectiveRate * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
              {'_details' in result && (
                <Breakdown result={result as any} includeNIIT={includeNIIT} />
              )}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            This is not tax advice. Brackets and rules are simplified/approximate and may be
            outdated. Consult official sources or a tax professional.
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// ---- UI: Breakdown (collapsible, copyable, zero-suppressed) ----
function Breakdown({ result, includeNIIT }: { result: any; includeNIIT: boolean }) {
  const [copied, setCopied] = useState(false);

  const isUSA = result.currencyCode === 'USD';

  function copyToClipboard() {
    const lines: string[] = [];
    if (isUSA) {
      lines.push('USA breakdown');
      lines.push(`Ordinary income: ${fmt(result._details.ordinaryIncome)}`);
      lines.push(`Preferential income: ${fmt(result._details.prefIncome)}`);
      lines.push(`Standard deduction: ${fmt(result._details.standardDeduction)}`);
      if (result._details.itemizedDeductions)
        lines.push(`Itemized deductions: ${fmt(result._details.itemizedDeductions)}`);
      if (result._details.deductionUsed)
        lines.push(`Deduction used: ${fmt(result._details.deductionUsed)}`);
      lines.push(`Taxable ordinary: ${fmt(result._details.taxableOrdinary)}`);
      lines.push(`Taxable preferential: ${fmt(result._details.taxablePref)}`);
      lines.push(`Federal ordinary tax: ${fmt(result._details.federalOrdinaryTax)}`);
      lines.push(`Federal LTCG tax: ${fmt(result._details.federalLTCGTax)}`);
      if (result._details.capLossOrdinaryOffset)
        lines.push(`Capital loss used vs ordinary: ${fmt(result._details.capLossOrdinaryOffset)}`);
      if (result._details.qbi?.deduction)
        lines.push(`QBI deduction (199A): -${fmt(result._details.qbi.deduction)}`);
      if (result._details.stateTax) lines.push(`State tax: ${fmt(result._details.stateTax)}`);
      if (includeNIIT && result._details.niit) lines.push(`NIIT: ${fmt(result._details.niit)}`);
      if (result._details.amt?.topUp) lines.push(`AMT top-up: ${fmt(result._details.amt.topUp)}`);
      if (result._details.payroll) {
        const p = result._details.payroll;
        lines.push(
          `FICA: SS ${fmt(p.ss)}, Medicare ${fmt(p.medicare)}, Additional Medicare ${fmt(p.medicareAddl)}, Total ${fmt(p.total)}`,
        );
        lines.push(`Net wages after FICA: ${fmt(p.netAfterFICA)}`);
      }
    } else {
      lines.push('Germany breakdown');
      lines.push(`Taxable income (zvE approx.): ${fmt(result._details.taxableIncome)}`);
      lines.push(`Capital income after allowance: ${fmt(result._details.capAfterAllowance)}`);
      if (result._details.foreignDividends > 0) {
        lines.push(
          `Foreign dividends: ${fmt(result._details.foreignDividends)} · WHT ${result._details.foreignWHTPct}% · Treaty cap ${result._details.treatyCapPct}%`,
        );
      }
      if (result._details.taxClass) {
        lines.push(`Steuerklasse: ${result._details.taxClass}`);
      }
      if (typeof result._details.spouseSalary === 'number' && result._details.spouseSalary > 0) {
        lines.push(`Spouse salary: ${fmt(result._details.spouseSalary)}`);
      }
      if (typeof result._details.childrenCount === 'number') {
        lines.push(`Children: ${result._details.childrenCount}`);
      }
      if (result._details.vorab?.enabled) {
        const v = result._details.vorab;
        lines.push(`Vorabpauschale:`);
        lines.push(
          `  Basisertrag: ${fmt(v.basisertrag)} (Basiszins ${v.basiszinsPct}% · 70% · ${v.monthsEligible}/12)`,
        );
        lines.push(`  Distributions: ${fmt(v.distributions)} → Gross: ${fmt(v.gross)}`);
        lines.push(`  Teilfreistellung: ${v.teilfreistellungPct}% → Taxable: ${fmt(v.taxable)}`);
      }
      lines.push(`Church tax: ${result._details.churchTaxPct}%`);
      if (result._details.incomeSoliIncluded) lines.push('Income Soli 5.5% applied');
      if (result._details.payroll) {
        const p = result._details.payroll;
        lines.push(`RV: ${fmt(p.rv)}, ALV: ${fmt(p.alv)}, KV: ${fmt(p.kv)}, PV: ${fmt(p.pv)}`);
        lines.push(`Social total: ${fmt(p.socialSum)}`);
        lines.push(`zvE: ${fmt(p.zvE)}`);
        if (p.soliOnIncome) lines.push(`Soli (income): ${fmt(p.soliOnIncome)}`);
        if (p.churchTax) lines.push(`Church tax (income): ${fmt(p.churchTax)}`);
        lines.push(`Net salary: ${fmt(p.netSalary)}`);
      }
    }
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function fmt(v: number) {
    return currency(v, result.locale, result.currencyCode);
  }

  return (
    <Card className="bg-transparent border border-border/50">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Breakdown</CardTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 px-3" onClick={copyToClipboard}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        {isUSA ? (
          <div className="text-sm text-muted-foreground space-y-4">
            <Section title="Income base">
              <Row label="Ordinary income" value={fmt(result._details.ordinaryIncome)} />
              <Row label="Preferential income" value={fmt(result._details.prefIncome)} />
              <Row label="Standard deduction" value={fmt(result._details.standardDeduction)} />
              {result._details.itemizedDeductions > 0 && (
                <Row label="Itemized deductions" value={fmt(result._details.itemizedDeductions)} />
              )}
              <Row label="Deduction used" value={fmt(result._details.deductionUsed)} />
              {result._details.capLossOrdinaryOffset > 0 && (
                <Row
                  label="Capital loss vs ordinary"
                  value={fmt(result._details.capLossOrdinaryOffset)}
                />
              )}
              <Row label="Taxable ordinary" value={fmt(result._details.taxableOrdinary)} />
              <Row label="Taxable preferential" value={fmt(result._details.taxablePref)} />
            </Section>
            <Section title="Taxes">
              <Row
                label="Federal ordinary"
                value={fmt(result._details.federalOrdinaryTax)}
                note={`${result.totalTax > 0 ? ((result._details.federalOrdinaryTax / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
              />
              <Row
                label="Federal LTCG"
                value={fmt(result._details.federalLTCGTax)}
                note={`${result.totalTax > 0 ? ((result._details.federalLTCGTax / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
              />
              {result._details.qbi && result._details.qbi.deduction > 0 && (
                <Row
                  label="QBI deduction (199A)"
                  value={`-${fmt(result._details.qbi.deduction)}`}
                />
              )}
              {result._details.stateTax > 0 && (
                <Row
                  label="State"
                  value={fmt(result._details.stateTax)}
                  note={`${result.totalTax > 0 ? ((result._details.stateTax / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                />
              )}
              {includeNIIT && result._details.niit > 0 && (
                <Row
                  label="NIIT 3.8%"
                  value={fmt(result._details.niit)}
                  note={`${result.totalTax > 0 ? ((result._details.niit / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                />
              )}
              {result._details.amt && result._details.amt.topUp > 0 && (
                <Row
                  label="AMT top-up"
                  value={fmt(result._details.amt.topUp)}
                  note={`${result.totalTax > 0 ? ((result._details.amt.topUp / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                />
              )}
              {result._details.payroll && (
                <>
                  <Row
                    label="FICA: Social Security"
                    value={fmt(result._details.payroll.ss)}
                    note={`${result.totalTax > 0 ? ((result._details.payroll.ss / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                  />
                  <Row
                    label="FICA: Medicare"
                    value={fmt(result._details.payroll.medicare)}
                    note={`${result.totalTax > 0 ? ((result._details.payroll.medicare / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                  />
                  {result._details.payroll.medicareAddl > 0 && (
                    <Row
                      label="FICA: Additional Medicare"
                      value={fmt(result._details.payroll.medicareAddl)}
                      note={`${result.totalTax > 0 ? ((result._details.payroll.medicareAddl / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                    />
                  )}
                </>
              )}
            </Section>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground space-y-4">
            <div className="flex flex-wrap gap-2">
              {result._details.incomeSoliIncluded && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                  Income Soli 5.5%
                </span>
              )}
              {result._details.churchTaxPct > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                  Church {result._details.churchTaxPct}%
                </span>
              )}
              {result._details.taxClass && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                  Tax class: {result._details.taxClass}
                </span>
              )}
              {result._details.saxony && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                  Saxony PV
                </span>
              )}
              {result._details.payrollPrecision === 'detailed' && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                  IV Faktor: {result._details.ivFaktor}
                  {result._details.ivFaktorAuto ? ' (auto)' : ''}
                </span>
              )}
              {typeof result._details.spouseSalary === 'number' &&
                result._details.spouseSalary > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                    Spouse:{' '}
                    {currency(result._details.spouseSalary, result.locale, result.currencyCode)}
                  </span>
                )}
              {typeof result._details.childrenCount === 'number' && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                  Children: {result._details.childrenCount}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs">
                Payroll
              </span>
            </div>
            <Section title="Income base">
              <Row label="Taxable income (zvE)" value={fmt(result._details.taxableIncome)} />
              <Row label="Capital after allowance" value={fmt(result._details.capAfterAllowance)} />
              {result._details.foreignDividends > 0 && (
                <Row
                  label="Foreign dividends"
                  value={`${fmt(result._details.foreignDividends)} · WHT ${result._details.foreignWHTPct}% · Cap ${result._details.treatyCapPct}%${result._details.dtaMode === 'simple' ? ' (Simple 15%)' : ''}`}
                />
              )}
            </Section>
            {result._details.vorab?.enabled && (
              <Section title="Vorabpauschale">
                <Row label="Basisertrag" value={fmt(result._details.vorab.basisertrag)} />
                <Row label="Distributions" value={fmt(result._details.vorab.distributions)} />
                <Row label="Gross Vorab" value={fmt(result._details.vorab.gross)} />
                <Row
                  label="Teilfreistellung"
                  value={`${result._details.vorab.teilfreistellungPct}%`}
                />
                <Row label="Taxable Vorab" value={fmt(result._details.vorab.taxable)} strong />
              </Section>
            )}
            {result._details.payroll && (
              <Section title="Payroll">
                <Row label="RV" value={fmt(result._details.payroll.rv)} hideZero />
                <Row label="ALV" value={fmt(result._details.payroll.alv)} hideZero />
                <Row label="KV" value={fmt(result._details.payroll.kv)} hideZero />
                <Row label="PV" value={fmt(result._details.payroll.pv)} hideZero />
                <Row label="Social total" value={fmt(result._details.payroll.socialSum)} hideZero />
                <Row label="zvE (approx)" value={fmt(result._details.payroll.zvE)} />
                <Row label="ESt (income tax)" value={fmt(result._details.payroll.est)} />
                {result._details.payroll.soliOnIncome > 0 && (
                  <Row
                    label="Soli (income)"
                    value={fmt(result._details.payroll.soliOnIncome)}
                    note={`${result.totalTax > 0 ? ((result._details.payroll.soliOnIncome / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                  />
                )}
                {result._details.payroll.churchTax > 0 && (
                  <Row
                    label="Church tax (income)"
                    value={fmt(result._details.payroll.churchTax)}
                    note={`${result.totalTax > 0 ? ((result._details.payroll.churchTax / result.totalTax) * 100).toFixed(1) : '0.0'}% of total`}
                  />
                )}
                <Row label="Net salary" value={fmt(result._details.payroll.netSalary)} strong />
              </Section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="space-y-2">
      <div className="text-foreground font-medium">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  hideZero,
  note,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hideZero?: boolean;
  note?: string;
}) {
  // Hide rows that are exactly 0 when hideZero is true
  if (hideZero && /(^€?\s?0\b|^\$\s?0\b)/.test(value)) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border/30 last:border-b-0">
      <div className="text-sm">{label}</div>
      <div className="text-right">
        <div
          className={
            strong ? 'font-semibold text-foreground text-base leading-5' : 'text-sm leading-5'
          }
        >
          {value}
        </div>
        {note && <div className="text-[11px] text-muted-foreground mt-0.5">{note}</div>}
      </div>
    </div>
  );
}
