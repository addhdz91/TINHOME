import { useEffect, type ReactNode } from 'react';

/** Removes `inert` from the prerendered root once React has taken it over (NFR-02). */
export function Interactive({ root, children }: { root: HTMLElement; children: ReactNode }) {
  useEffect(() => root.removeAttribute('inert'), [root]);
  return children;
}
