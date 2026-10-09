import '@testing-library/jest-dom/vitest';
import '@/i18n';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Lazy routes import whole pages on first use; give findBy* time in slow CI runners.
configure({ asyncUtilTimeout: 5000 });

// Public data comes from an in-memory fixture instead of Firestore.
vi.mock('@/lib/firestore-public', () => import('./public-data'));

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
  window.localStorage.clear();
});

// jsdom has no matchMedia.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
