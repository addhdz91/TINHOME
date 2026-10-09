/** Only internal app paths are accepted as `?next=` (no open redirects). */
export function safeNext(value: string | null, fallback = '/app'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return fallback;
  return value;
}
