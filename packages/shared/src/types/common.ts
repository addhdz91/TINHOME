declare const isoDateBrand: unique symbol;

/** Calendar date `YYYY-MM-DD` without time (BR-32, ADR-015). Build it with `asIsoDate`. */
export type IsoDate = string & { readonly [isoDateBrand]: true };

/** Pure-domain result type (06_CODING_STANDARDS.md §1). */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** Injectable time source: the domain never calls `new Date()` itself. */
export interface Clock {
  now(): Date;
}
