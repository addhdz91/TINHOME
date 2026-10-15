const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Madrid',
});
const numberFormatter = new Intl.NumberFormat('es-ES');

/** Prices are stored in cents (06_CODING_STANDARDS.md §1). */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Calendar date `YYYY-MM-DD` → «20 de marzo de 2027» (no time-zone shift). */
export function formatIsoDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatInstant(date: Date): string {
  return dateFormatter.format(date);
}

/** «14:05» — time of a chat message (Europe/Madrid by the device locale settings). */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
