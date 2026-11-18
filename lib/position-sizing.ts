type PositionInputs = {
  side: 'long' | 'short'; capital: number; riskPct: number; entry: number; stop: number;
  target: number; increment: number; commission: number; slippagePct: number; cashOnly: boolean;
};

export function sizePosition(input: PositionInputs) {
  const {side, capital, riskPct, entry, stop, target, increment, commission, slippagePct} = input;
  if (![capital, riskPct, entry, stop, target, increment, commission, slippagePct].every(Number.isFinite) ||
    capital <= 0 || riskPct <= 0 || riskPct > 100 || increment <= 0 || commission < 0 ||
    slippagePct < 0 || slippagePct > 100 || entry <= 0 || stop <= 0 || target <= 0 ||
    (side === 'long' ? !(stop < entry && entry < target) : !(target < entry && entry < stop))) return null;
  const budget = capital * riskPct / 100;
  const slippage = entry * slippagePct / 100;
  const costsPerUnit = 2 * (commission + slippage);
  const unitRisk = Math.abs(entry - stop) + costsPerUnit;
  const riskQuantity = Math.floor(budget / unitRisk / increment) * increment;
  const cashQuantity = Math.floor(capital / (entry + commission + slippage) / increment) * increment;
  const capped = input.cashOnly && side === 'long' && cashQuantity < riskQuantity;
  const quantity = capped ? cashQuantity : riskQuantity;
  const loss = quantity * unitRisk;
  const reward = quantity * (Math.abs(target - entry) - costsPerUnit);
  const exposure = quantity * entry;
  const costs = quantity * costsPerUnit;
  if (![quantity, loss, reward, exposure, costs].every(Number.isFinite)) return null;
  return {quantity, loss, reward, exposure, costs, budget, capped, riskQuantity,
    effectiveRiskPct: loss / capital * 100, unusedBudget: Math.max(0, budget - loss)};
}
