export function loanRepayment(principal: number, annualRate: number, months: number, extra: number) {
  if (![principal, annualRate, months, extra].every(Number.isFinite) || principal <= 0 ||
      annualRate < 0 || annualRate > 100 || !Number.isInteger(months) || months < 1 || months > 600 || extra < 0) return null;
  const rate = annualRate / 1200;
  const payment = rate ? principal * rate / -Math.expm1(-months * Math.log1p(rate)) : principal / months;
  if (!Number.isFinite(payment)) return null;
  let balance = principal;
  let interest = 0;
  let duration = 0;
  while (duration < months && balance > principal * 1e-12) {
    const accrued = balance * rate;
    interest += accrued;
    balance -= Math.min(balance, payment + extra - accrued);
    duration++;
  }
  return { payment, interest, duration, monthsSaved: months - duration, interestSaved: Math.max(0, payment * months - principal - interest) };
}

export function breakEven(shares: number, entry: number, entryFee: number, exitFee: number) {
  if (![shares, entry, entryFee, exitFee].every(Number.isFinite) ||
    shares <= 0 || entry <= 0 || entryFee < 0 || exitFee < 0) return null;
  const totalCost = shares * entry + entryFee;
  const exitPrice = (totalCost + exitFee) / shares;
  return Number.isFinite(exitPrice) ? { totalCost, exitPrice, movePct: (exitPrice / entry - 1) * 100 } : null;
}
