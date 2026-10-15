/** Saving of the yearly plan versus 12 monthly payments, as a whole percentage (≥ 0). */
export function yearlySavingPercent(monthlyCents: number, yearlyCents: number): number {
  const twelveMonths = monthlyCents * 12;
  if (twelveMonths <= 0) return 0;
  return Math.max(0, Math.round(((twelveMonths - yearlyCents) * 100) / twelveMonths));
}
