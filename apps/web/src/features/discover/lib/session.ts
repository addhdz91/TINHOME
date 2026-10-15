const KEY = 'tinhome-app-session';

/** AC-20.3 — id of this app session (free users can undo one pass per session). */
export function appSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, created);
    return created;
  } catch {
    return memorySession;
  }
}

const memorySession = crypto.randomUUID();
