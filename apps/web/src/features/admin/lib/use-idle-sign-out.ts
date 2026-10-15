import { useEffect } from 'react';
import { ADMIN_IDLE_MINUTES } from '@tinhome/shared/constants';

const EVENTS = ['pointerdown', 'keydown', 'scroll', 'visibilitychange'] as const;

/** FR-48 — the admin session ends after 30 minutes without activity. */
export function useIdleSignOut(onIdle: () => void, minutes = ADMIN_IDLE_MINUTES): void {
  useEffect(() => {
    let timer = window.setTimeout(onIdle, minutes * 60_000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onIdle, minutes * 60_000);
    };
    for (const event of EVENTS) window.addEventListener(event, reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of EVENTS) window.removeEventListener(event, reset);
    };
  }, [onIdle, minutes]);
}
