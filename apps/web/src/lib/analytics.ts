import type { AnalyticsEvent } from '@tinhome/shared/constants';
import { trackEvent } from './callables';

/**
 * 03 §6 — own analytics through `trackEvent` (closed list, no personal data in `props`; the
 * server drops anything that looks like it). Fire and forget: never blocks or breaks the UI.
 */
export function track(name: AnalyticsEvent, props?: Record<string, string | number | boolean>) {
  try {
    void trackEvent(props ? { name, props } : { name }).catch(() => undefined);
  } catch {
    // Analytics never breaks the UI.
  }
}
