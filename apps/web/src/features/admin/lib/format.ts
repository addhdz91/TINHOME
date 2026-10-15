/** «hace 3 h», «hace 2 días» — age of a queue item (Intl, Spanish). */
export function relativeAge(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 1) return formatter.format(Math.round(diffMs / 60_000), 'minute');
  if (Math.abs(hours) < 48) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}
