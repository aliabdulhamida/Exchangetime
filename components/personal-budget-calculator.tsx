'use client';

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/components/ui/use-mobile';
import { cn } from '@/lib/utils';

type BudgetStep = 'income' | 'costs' | 'plan';
type FixedCostMode = 'total' | 'breakdown';
type IncomeBasis = 'monthly' | 'annual';
type SupportedCurrency = 'EUR' | 'USD' | 'GBP';

interface IncomeSourceItem {
  id: string;
  name: string;
  amount: number;
}

interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

interface PersistedBudgetState {
  currency: SupportedCurrency;
  fixedCosts: FixedCostItem[];
  fixedCostMode?: FixedCostMode;
  fixedCostTotal?: number;
  incomeBasis: IncomeBasis;
  incomeSources: IncomeSourceItem[];
  reserveCash: number;
  reserveTargetMonths: number;
  targetInvestmentPct: number;
  income?: number;
}

const STORAGE_KEY = 'exchangetime.personal-budget.v6';
const LEGACY_STORAGE_KEYS = [
  'exchangetime.personal-budget.v5',
  'exchangetime.personal-budget.v4',
  'exchangetime.personal-budget.v3',
  'exchangetime.personal-budget.v2',
  'exchangetime.personal-budget.v1',
] as const;

const STEP_ORDER: BudgetStep[] = ['income', 'costs', 'plan'];
const STEP_COPY: Record<BudgetStep, { description: string; label: string; title: string }> = {
  income: {
    description: 'Add each recurring income source and keep a live monthly total.',
    label: 'Step 1',
    title: 'Income',
  },
  costs: {
    description: 'Start with one fixed-cost total, then expand into rows only if you need detail.',
    label: 'Step 2',
    title: 'Costs',
  },
  plan: {
    description: 'Set reserve cash, reserve target, and portfolio split to finish the plan.',
    label: 'Step 3',
    title: 'Plan',
  },
};

const LEGACY_DEFAULT_INCOME_SOURCES: IncomeSourceItem[] = [
  { id: 'income-1', name: 'Salary', amount: 0 },
];
const LEGACY_DEFAULT_FIXED_COSTS: FixedCostItem[] = [
  { id: 'housing', name: 'Housing', amount: 0 },
  { id: 'utilities', name: 'Utilities', amount: 0 },
  { id: 'insurance', name: 'Insurance', amount: 0 },
  { id: 'transport', name: 'Transport', amount: 0 },
];

function sanitizeAmount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function sanitizePercent(value: number, fallback = 60, min = 0, max = 100) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitizeMonths(value: number, fallback = 6, min = 1, max = 24) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeCurrency(value: unknown): SupportedCurrency {
  return value === 'USD' || value === 'GBP' ? value : 'EUR';
}

function sanitizeIncomeBasis(value: unknown): IncomeBasis {
  return value === 'annual' ? 'annual' : 'monthly';
}

function sanitizeIncomeSources(
  items: IncomeSourceItem[] | undefined,
  legacyIncome?: number,
): IncomeSourceItem[] {
  const cleaned = Array.isArray(items)
    ? items
        .map((item, index) => ({
          amount: sanitizeAmount(Number(item?.amount)),
          id: typeof item?.id === 'string' && item.id.length > 0 ? item.id : `income-${index + 1}`,
          name: typeof item?.name === 'string' ? item.name : '',
        }))
        .slice(0, 12)
    : [];

  if (cleaned.length > 0) return cleaned;

  const legacyAmount = sanitizeAmount(Number(legacyIncome));
  if (legacyAmount > 0) {
    return [{ id: 'income-1', name: 'Income', amount: legacyAmount }];
  }

  return [];
}

function sanitizeFixedCosts(items: FixedCostItem[] | undefined): FixedCostItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items
    .map((item, index) => ({
      amount: sanitizeAmount(Number(item?.amount)),
      id: typeof item?.id === 'string' && item.id.length > 0 ? item.id : `fixed-cost-${index + 1}`,
      name: typeof item?.name === 'string' ? item.name : '',
    }))
    .slice(0, 18);
}

function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((sum, item) => sum + sanitizeAmount(item.amount), 0);
}

function matchesLegacyIncomeScaffold(items: IncomeSourceItem[]) {
  return (
    items.length === LEGACY_DEFAULT_INCOME_SOURCES.length &&
    items.every((item, index) => {
      const legacy = LEGACY_DEFAULT_INCOME_SOURCES[index];
      return item.name.trim().toLowerCase() === legacy.name.toLowerCase() && item.amount === 0;
    })
  );
}

function matchesLegacyFixedCostScaffold(items: FixedCostItem[]) {
  return (
    items.length === LEGACY_DEFAULT_FIXED_COSTS.length &&
    items.every((item, index) => {
      const legacy = LEGACY_DEFAULT_FIXED_COSTS[index];
      return item.name.trim().toLowerCase() === legacy.name.toLowerCase() && item.amount === 0;
    })
  );
}

function FieldBlock({
  children,
  hint,
  id,
  label,
}: {
  children: ReactNode;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border/70" />
      <span className={cn('shrink-0 font-medium text-foreground', valueClassName)}>{value}</span>
    </div>
  );
}

export default function PersonalBudgetCalculator() {
  const isMobile = useIsMobile();
  const nextIncomeIdRef = useRef(0);
  const nextFixedCostIdRef = useRef(0);

  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<BudgetStep>('income');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [incomeBasis, setIncomeBasis] = useState<IncomeBasis>('monthly');
  const [currency, setCurrency] = useState<SupportedCurrency>('EUR');
  const [incomeSources, setIncomeSources] = useState<IncomeSourceItem[]>([]);
  const [fixedCostMode, setFixedCostMode] = useState<FixedCostMode>('total');
  const [fixedCostTotal, setFixedCostTotal] = useState(0);
  const [fixedCosts, setFixedCosts] = useState<FixedCostItem[]>([]);
  const [reserveCash, setReserveCash] = useState(0);
  const [reserveTargetMonths, setReserveTargetMonths] = useState(6);
  const [targetInvestmentPct, setTargetInvestmentPct] = useState(60);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let sourceKey: string | null = null;
    let rawState = window.localStorage.getItem(STORAGE_KEY);
    if (rawState) sourceKey = STORAGE_KEY;

    if (!rawState) {
      for (const key of LEGACY_STORAGE_KEYS) {
        const candidate = window.localStorage.getItem(key);
        if (candidate) {
          rawState = candidate;
          sourceKey = key;
          break;
        }
      }
    }

    if (!rawState) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(rawState) as Partial<PersistedBudgetState>;
      const isLegacyState = sourceKey !== STORAGE_KEY;

      let restoredIncomeSources = sanitizeIncomeSources(parsed.incomeSources, parsed.income);
      let restoredFixedCosts = sanitizeFixedCosts(parsed.fixedCosts);

      if (isLegacyState && matchesLegacyIncomeScaffold(restoredIncomeSources)) {
        restoredIncomeSources = [];
      }

      if (isLegacyState && matchesLegacyFixedCostScaffold(restoredFixedCosts)) {
        restoredFixedCosts = [];
      }

      const breakdownTotal = sumAmounts(restoredFixedCosts);
      const restoredFixedCostMode: FixedCostMode =
        parsed.fixedCostMode === 'breakdown'
          ? 'breakdown'
          : parsed.fixedCostMode === 'total'
            ? 'total'
            : breakdownTotal > 0
              ? 'breakdown'
              : 'total';
      const restoredFixedCostTotal =
        restoredFixedCostMode === 'breakdown'
          ? breakdownTotal
          : sanitizeAmount(Number(parsed.fixedCostTotal ?? breakdownTotal));

      setIncomeBasis(sanitizeIncomeBasis(parsed.incomeBasis));
      setCurrency(sanitizeCurrency(parsed.currency));
      setIncomeSources(restoredIncomeSources);
      setFixedCostMode(restoredFixedCostMode);
      setFixedCostTotal(restoredFixedCostTotal);
      setFixedCosts(restoredFixedCosts);
      setReserveCash(sanitizeAmount(Number(parsed.reserveCash)));
      setReserveTargetMonths(sanitizeMonths(Number(parsed.reserveTargetMonths)));
      setTargetInvestmentPct(sanitizePercent(Number(parsed.targetInvestmentPct)));
      nextIncomeIdRef.current = Math.max(restoredIncomeSources.length, 0);
      nextFixedCostIdRef.current = Math.max(restoredFixedCosts.length, 0);
    } catch (error) {
      console.error('Failed to restore personal budget state', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  const breakdownFixedCostsTotal = useMemo(() => sumAmounts(fixedCosts), [fixedCosts]);
  const totalFixedCosts =
    fixedCostMode === 'breakdown' ? breakdownFixedCostsTotal : sanitizeAmount(fixedCostTotal);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;

    const payload: PersistedBudgetState = {
      currency,
      fixedCosts,
      fixedCostMode,
      fixedCostTotal: totalFixedCosts,
      incomeBasis,
      incomeSources,
      reserveCash: sanitizeAmount(reserveCash),
      reserveTargetMonths: sanitizeMonths(reserveTargetMonths),
      targetInvestmentPct: sanitizePercent(targetInvestmentPct),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist personal budget state', error);
    }
  }, [
    currency,
    fixedCostMode,
    fixedCosts,
    hydrated,
    incomeBasis,
    incomeSources,
    reserveCash,
    reserveTargetMonths,
    targetInvestmentPct,
    totalFixedCosts,
  ]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        currency,
        maximumFractionDigits: 2,
        style: 'currency',
      }),
    [currency],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
        style: 'percent',
      }),
    [],
  );

  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }),
    [],
  );

  const monthlyIncome = useMemo(() => {
    const totalIncome = sumAmounts(incomeSources);
    return incomeBasis === 'annual' ? totalIncome / 12 : totalIncome;
  }, [incomeBasis, incomeSources]);

  const monthlyFreeCash = monthlyIncome - totalFixedCosts;
  const positiveFreeCash = Math.max(0, monthlyFreeCash);
  const portfolioContribution = positiveFreeCash * (targetInvestmentPct / 100);
  const reserveBuildCash = Math.max(0, positiveFreeCash - portfolioContribution);
  const fixedCostRatio =
    monthlyIncome > 0 ? totalFixedCosts / monthlyIncome : totalFixedCosts > 0 ? 1 : 0;
  const actualInvestRate = monthlyIncome > 0 ? portfolioContribution / monthlyIncome : 0;
  const savingsRate =
    monthlyIncome > 0 ? monthlyFreeCash / monthlyIncome : monthlyFreeCash < 0 ? -1 : 0;
  const reserveTarget = totalFixedCosts * reserveTargetMonths;
  const reserveGap = Math.max(0, reserveTarget - reserveCash);
  const reserveRunwayMonths = totalFixedCosts > 0 ? reserveCash / totalFixedCosts : 0;
  const reserveTimelineMonths =
    reserveGap > 0 && reserveBuildCash > 0 ? Math.ceil(reserveGap / reserveBuildCash) : null;

  const summaryMessage =
    monthlyFreeCash < 0
      ? `Reduce fixed costs or add income to close the ${currencyFormatter.format(Math.abs(monthlyFreeCash))} monthly shortfall.`
      : reserveGap > 0
        ? reserveTimelineMonths
          ? `At the current split, the reserve target should be funded in about ${reserveTimelineMonths} month${reserveTimelineMonths === 1 ? '' : 's'}.`
          : `The reserve target is short ${currencyFormatter.format(reserveGap)} and no cash is currently left to build it.`
        : `${currencyFormatter.format(portfolioContribution)} per month is available for the portfolio after reserve funding.`;

  const summaryToneClass =
    monthlyFreeCash < 0
      ? 'border-rose-500/30 bg-rose-500/6'
      : reserveGap > 0
        ? 'border-amber-400/25 bg-amber-400/6'
        : 'border-border/70 bg-card/40';
  const freeCashValueClassName = monthlyFreeCash < 0 ? 'text-rose-200' : 'text-foreground';
  const reserveStatusLabel = reserveGap > 0 ? 'Reserve gap' : 'Reserve runway';
  const reserveStatusValue =
    reserveGap > 0
      ? currencyFormatter.format(reserveGap)
      : `${decimalFormatter.format(reserveRunwayMonths || 0)} mo`;

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const progressValue = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;
  const currentStepCopy = STEP_COPY[step];

  const fieldInputClassName =
    'h-11 rounded-xl border-border/70 bg-background/60 shadow-none transition-colors focus-visible:bg-background';
  const fieldSelectClassName = 'et-tool-select h-11 rounded-xl border-border/70 bg-background/60';

  function updateIncomeSource(
    id: string,
    field: keyof Pick<IncomeSourceItem, 'name' | 'amount'>,
    value: string,
  ) {
    setIncomeSources((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'amount' ? sanitizeAmount(Number(value)) : value,
            }
          : item,
      ),
    );
  }

  function addIncomeSource(name = '', amount = 0) {
    if (incomeSources.length >= 12) return;
    nextIncomeIdRef.current += 1;
    setIncomeSources((current) => [
      ...current,
      { id: `income-${nextIncomeIdRef.current}`, name, amount },
    ]);
  }

  function removeIncomeSource(id: string) {
    setIncomeSources((current) => current.filter((item) => item.id !== id));
  }

  function updateFixedCost(
    id: string,
    field: keyof Pick<FixedCostItem, 'name' | 'amount'>,
    value: string,
  ) {
    setFixedCosts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'amount' ? sanitizeAmount(Number(value)) : value,
            }
          : item,
      ),
    );
  }

  function addFixedCost(name = '', amount = 0) {
    if (fixedCosts.length >= 18) return;
    nextFixedCostIdRef.current += 1;
    setFixedCosts((current) => [
      ...current,
      { id: `fixed-cost-${nextFixedCostIdRef.current}`, name, amount },
    ]);
  }

  function removeFixedCost(id: string) {
    setFixedCosts((current) => current.filter((item) => item.id !== id));
  }

  function enableBreakdownMode() {
    setFixedCostMode('breakdown');
    setFixedCosts((current) => {
      if (current.length > 0 && sumAmounts(current) === sanitizeAmount(fixedCostTotal)) {
        return current;
      }
      nextFixedCostIdRef.current += 1;
      return [
        {
          id: `fixed-cost-${nextFixedCostIdRef.current}`,
          name: fixedCostTotal > 0 ? 'Fixed costs' : '',
          amount: sanitizeAmount(fixedCostTotal),
        },
      ];
    });
  }

  function enableTotalMode() {
    setFixedCostTotal(totalFixedCosts);
    setFixedCostMode('total');
  }

  function goToStep(nextStep: BudgetStep) {
    setStep(nextStep);
  }

  function goBack() {
    if (isFirstStep) return;
    setStep(STEP_ORDER[currentStepIndex - 1]);
  }

  function goNext() {
    if (isLastStep) return;
    setStep(STEP_ORDER[currentStepIndex + 1]);
  }

  const summaryContent = (
    <>
      <div className={cn('rounded-xl border p-4', summaryToneClass)}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Free cash / month
        </div>
        <div className={cn('mt-2 text-2xl font-semibold tracking-tight', freeCashValueClassName)}>
          {currencyFormatter.format(monthlyFreeCash)}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{summaryMessage}</p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/30 p-4">
        <div className="space-y-3">
          <SummaryRow label={reserveStatusLabel} value={reserveStatusValue} />
          <SummaryRow
            label="Portfolio / month"
            value={currencyFormatter.format(portfolioContribution)}
          />
          <SummaryRow label="Income / month" value={currencyFormatter.format(monthlyIncome)} />
          <SummaryRow label="Fixed costs" value={currencyFormatter.format(totalFixedCosts)} />
          <SummaryRow label="Savings rate" value={percentFormatter.format(savingsRate)} />
        </div>
      </div>
    </>
  );

  const settingsContent = (
    <div className="space-y-5">
      <FieldBlock id="budget-basis" label="Income basis">
        <div className="relative">
          <select
            id="budget-basis"
            className={fieldSelectClassName}
            value={incomeBasis}
            onChange={(event) => setIncomeBasis(sanitizeIncomeBasis(event.target.value))}
          >
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
          <ChevronDown className="et-tool-select-caret h-4 w-4" />
        </div>
      </FieldBlock>

      <FieldBlock id="budget-currency" label="Currency">
        <div className="relative">
          <select
            id="budget-currency"
            className={fieldSelectClassName}
            value={currency}
            onChange={(event) => setCurrency(sanitizeCurrency(event.target.value))}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
          <ChevronDown className="et-tool-select-caret h-4 w-4" />
        </div>
      </FieldBlock>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setSettingsOpen(false)}
      >
        Done
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="pr-16 sm:pr-20">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Personal Budget</h2>
            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {currentStepCopy.label} of {STEP_ORDER.length}
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {currentStepCopy.title}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {currentStepCopy.description}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <Progress value={progressValue} className="h-1.5 bg-muted/70" />

          <div className="hidden grid-cols-3 gap-2 md:grid">
            {STEP_ORDER.map((stepKey, index) => {
              const isActive = stepKey === step;
              return (
                <button
                  key={stepKey}
                  type="button"
                  onClick={() => goToStep(stepKey)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-left transition-colors',
                    isActive
                      ? 'border-foreground/20 bg-background text-foreground'
                      : 'border-border/70 bg-card/20 text-muted-foreground hover:bg-card/40 hover:text-foreground',
                  )}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                    {index + 1}
                  </div>
                  <div className="mt-1 text-sm font-medium">{STEP_COPY[stepKey].title}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0 pb-40 lg:pb-0">
          {step === 'income' ? (
            <section className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Recurring income</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Add your monthly or annual income sources. The live summary always converts
                      them to a monthly view.
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Income / month
                    </div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {currencyFormatter.format(monthlyIncome)}
                    </div>
                  </div>
                </div>

                <Separator />
              </div>

              {incomeSources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-5">
                  <p className="text-sm leading-6 text-muted-foreground">
                    No income sources yet. Start with your main paycheck, then add anything else
                    that lands regularly.
                  </p>
                  <Button type="button" className="mt-4" onClick={() => addIncomeSource()}>
                    <Plus className="h-4 w-4" />
                    Add income
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1 et-scrollbar sm:max-h-[32rem]">
                    {incomeSources.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/70 bg-card/20 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                          <FieldBlock id={`income-source-name-${item.id}`} label="Label">
                            <Input
                              id={`income-source-name-${item.id}`}
                              type="text"
                              placeholder={`Income ${index + 1}`}
                              value={item.name}
                              onChange={(event) =>
                                updateIncomeSource(item.id, 'name', event.target.value)
                              }
                              className={fieldInputClassName}
                            />
                          </FieldBlock>

                          <FieldBlock id={`income-source-amount-${item.id}`} label="Amount">
                            <Input
                              id={`income-source-amount-${item.id}`}
                              min={0}
                              step={50}
                              type="number"
                              value={item.amount}
                              onChange={(event) =>
                                updateIncomeSource(item.id, 'amount', event.target.value)
                              }
                              className={fieldInputClassName}
                            />
                          </FieldBlock>

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-11 w-full sm:w-11"
                              aria-label={`Remove ${item.name || `income ${index + 1}`}`}
                              onClick={() => removeIncomeSource(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addIncomeSource()}
                    disabled={incomeSources.length >= 12}
                  >
                    <Plus className="h-4 w-4" />
                    Add income
                  </Button>
                </div>
              )}

              <div className="rounded-xl border border-border/70 bg-card/20 p-4 sm:hidden">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Income / month
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {currencyFormatter.format(monthlyIncome)}
                </div>
              </div>
            </section>
          ) : null}

          {step === 'costs' ? (
            <section className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Monthly fixed costs</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Start with one monthly total. Open the breakdown only if you want line items.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={fixedCostMode === 'breakdown' ? enableTotalMode : enableBreakdownMode}
                  >
                    {fixedCostMode === 'breakdown' ? 'Use one total' : 'Break down costs'}
                  </Button>
                </div>

                <Separator />
              </div>

              <FieldBlock
                id="budget-fixed-cost-total"
                label="Monthly fixed-cost total"
                hint={
                  fixedCostMode === 'breakdown'
                    ? 'This total is derived from the breakdown below.'
                    : 'Use one number if you do not need a detailed list.'
                }
              >
                <Input
                  id="budget-fixed-cost-total"
                  min={0}
                  step={50}
                  type="number"
                  value={totalFixedCosts}
                  readOnly={fixedCostMode === 'breakdown'}
                  onChange={(event) =>
                    setFixedCostTotal(sanitizeAmount(Number(event.target.value)))
                  }
                  className={cn(
                    fieldInputClassName,
                    fixedCostMode === 'breakdown' ? 'cursor-default text-muted-foreground' : '',
                  )}
                />
              </FieldBlock>

              {fixedCostMode === 'breakdown' ? (
                <div className="space-y-4">
                  {fixedCosts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 px-4 py-5">
                      <p className="text-sm leading-6 text-muted-foreground">
                        No cost rows yet. Add your base recurring expenses and the total will update
                        automatically.
                      </p>
                      <Button type="button" className="mt-4" onClick={() => addFixedCost()}>
                        <Plus className="h-4 w-4" />
                        Add cost
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1 et-scrollbar sm:max-h-[32rem]">
                        {fixedCosts.map((item, index) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-border/70 bg-card/20 p-4"
                          >
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                              <FieldBlock id={`fixed-cost-name-${item.id}`} label="Label">
                                <Input
                                  id={`fixed-cost-name-${item.id}`}
                                  type="text"
                                  placeholder={`Cost ${index + 1}`}
                                  value={item.name}
                                  onChange={(event) =>
                                    updateFixedCost(item.id, 'name', event.target.value)
                                  }
                                  className={fieldInputClassName}
                                />
                              </FieldBlock>

                              <FieldBlock id={`fixed-cost-amount-${item.id}`} label="Amount">
                                <Input
                                  id={`fixed-cost-amount-${item.id}`}
                                  min={0}
                                  step={10}
                                  type="number"
                                  value={item.amount}
                                  onChange={(event) =>
                                    updateFixedCost(item.id, 'amount', event.target.value)
                                  }
                                  className={fieldInputClassName}
                                />
                              </FieldBlock>

                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-11 w-full sm:w-11"
                                  aria-label={`Remove ${item.name || `cost ${index + 1}`}`}
                                  onClick={() => removeFixedCost(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addFixedCost()}
                        disabled={fixedCosts.length >= 18}
                      >
                        <Plus className="h-4 w-4" />
                        Add cost
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-card/20 p-4">
                  <SummaryRow
                    label="Fixed costs"
                    value={currencyFormatter.format(totalFixedCosts)}
                  />
                  <div className="mt-3 text-sm leading-6 text-muted-foreground">
                    Use a single number if you already know your monthly base costs. Switch to the
                    breakdown only when you want to name each recurring expense.
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {step === 'plan' ? (
            <section className="space-y-6">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Reserve and portfolio plan
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Finish the monthly plan by deciding how much reserve cash you already have and
                    how aggressively to invest leftover cash.
                  </p>
                </div>

                <Separator />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldBlock
                  id="budget-reserve-cash"
                  label="Cash reserve"
                  hint="Cash already available for emergencies."
                >
                  <Input
                    id="budget-reserve-cash"
                    min={0}
                    step={100}
                    type="number"
                    value={reserveCash}
                    onChange={(event) => setReserveCash(sanitizeAmount(Number(event.target.value)))}
                    className={fieldInputClassName}
                  />
                </FieldBlock>

                <FieldBlock
                  id="budget-reserve-target-months"
                  label="Reserve target (months)"
                  hint="Common targets range from 3 to 12 months."
                >
                  <Input
                    id="budget-reserve-target-months"
                    min={1}
                    max={24}
                    step={1}
                    type="number"
                    value={reserveTargetMonths}
                    onChange={(event) =>
                      setReserveTargetMonths(sanitizeMonths(Number(event.target.value)))
                    }
                    className={fieldInputClassName}
                  />
                </FieldBlock>
              </div>

              <FieldBlock
                id="budget-investment-split"
                label="Portfolio split (%)"
                hint="Share of positive free cash sent to the portfolio."
              >
                <Input
                  id="budget-investment-split"
                  min={0}
                  max={100}
                  step={5}
                  type="number"
                  value={targetInvestmentPct}
                  onChange={(event) =>
                    setTargetInvestmentPct(sanitizePercent(Number(event.target.value)))
                  }
                  className={fieldInputClassName}
                />
              </FieldBlock>

              <div className="rounded-xl border border-border/70 bg-card/20 p-4">
                <div className="space-y-3">
                  <SummaryRow
                    label="Reserve target"
                    value={currencyFormatter.format(reserveTarget)}
                  />
                  <SummaryRow
                    label="Reserve build / month"
                    value={currencyFormatter.format(reserveBuildCash)}
                  />
                  <SummaryRow
                    label="Portfolio / month"
                    value={currencyFormatter.format(portfolioContribution)}
                  />
                  <SummaryRow
                    label="Invest rate"
                    value={percentFormatter.format(actualInvestRate)}
                  />
                  <SummaryRow
                    label="Fixed-cost ratio"
                    value={percentFormatter.format(fixedCostRatio)}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{summaryMessage}</p>
              </div>
            </section>
          ) : null}

          <div className="mt-8 hidden items-center justify-between gap-3 lg:flex">
            <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
              Back
            </Button>

            <Button type="button" onClick={goNext} disabled={isLastStep}>
              {isLastStep
                ? 'Final step'
                : `Next: ${STEP_COPY[STEP_ORDER[currentStepIndex + 1]].title}`}
            </Button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-4">{summaryContent}</div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-3 mt-auto border-t border-border/70 bg-background/95 px-3 pb-3 pt-3 backdrop-blur sm:-mx-4 sm:px-4 lg:hidden">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Free cash
            </div>
            <div className={cn('mt-1 text-sm font-semibold', freeCashValueClassName)}>
              {currencyFormatter.format(monthlyFreeCash)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Reserve
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">{reserveStatusValue}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Portfolio
            </div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              {currencyFormatter.format(portfolioContribution)}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground">{summaryMessage}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={isFirstStep}>
            Back
          </Button>
          <Button type="button" onClick={goNext} disabled={isLastStep}>
            {isLastStep
              ? 'Final step'
              : `Next: ${STEP_COPY[STEP_ORDER[currentStepIndex + 1]].title}`}
          </Button>
        </div>
      </div>

      {isMobile ? (
        <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DrawerContent className="border-border bg-card px-4 pb-6">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle>Advanced settings</DrawerTitle>
              <DrawerDescription>Currency and income basis live here.</DrawerDescription>
            </DrawerHeader>
            {settingsContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-full border-border bg-card sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Advanced settings</SheetTitle>
              <SheetDescription>Currency and income basis live here.</SheetDescription>
            </SheetHeader>
            <div className="mt-6">{settingsContent}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
