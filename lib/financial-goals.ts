export type GoalInputs = { target: number; saved: number; years: number; rate: number; inflation: number };

export function projectGoal(goal: GoalInputs) {
  if (![goal.target, goal.saved, goal.years, goal.rate, goal.inflation].every(Number.isFinite) || goal.target <= 0 || goal.saved < 0 ||
    goal.years < 1 / 12 || goal.years > 60 || goal.rate <= -100 || goal.rate > 50 ||
    goal.inflation < 0 || goal.inflation > 30) return null;
  const months = Math.round(goal.years * 12);
  const annualLog = Math.log1p(goal.rate / 100);
  const monthlyLog = annualLog / 12;
  const monthlyRate = Math.expm1(monthlyLog);
  const factor = Math.exp(monthlyLog * months);
  const futureTarget = goal.target * Math.exp(Math.log1p(goal.inflation / 100) * months / 12);
  const annuity = monthlyRate === 0 ? months : Math.expm1(monthlyLog * months) / monthlyRate;
  const contribution = Math.max(0, (futureTarget - goal.saved * factor) / annuity);
  const withoutGrowth = Math.max(0, (futureTarget - goal.saved) / months);
  let balance = goal.saved;
  const projection = [{ month: 0, balance, contributed: goal.saved }];
  for (let month = 1; month <= months; month++) {
    balance = balance * (1 + monthlyRate) + contribution;
    if (month % 12 === 0 || month === months) {
      projection.push({ month, balance, contributed: goal.saved + month * contribution });
    }
  }
  return { months, futureTarget, contribution, withoutGrowth, projection,
    remaining: Math.max(0, futureTarget - goal.saved),
    progress: Math.min(100, goal.saved / futureTarget * 100) };
}
