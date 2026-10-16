/** Deepest offset a client may ask for: Firestore bills every skipped document. */
export const MAX_OFFSET = 1_000;

/** Numeric pagination cursor → offset in `[0, MAX_OFFSET]` (anything else → 0). */
export function cursorOffset(cursor: string | undefined): number {
  const value = Number(cursor ?? 0);
  if (!Number.isInteger(value) || value < 0) return 0;
  return Math.min(value, MAX_OFFSET);
}
