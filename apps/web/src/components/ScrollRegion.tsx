import type { ReactNode } from 'react';

/**
 * WCAG 2.1.1 — a horizontally scrollable area (wide tables) must be reachable by keyboard:
 * a named, focusable region that scrolls with the arrow keys.
 */
export function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable
      tabIndex={0}
      className="overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {children}
    </div>
  );
}
