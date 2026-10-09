import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './es.json';

export const defaultNS = 'translation';
export const resources = { es: { translation: es } } as const;

// DEC-53 — Spanish only; texts live in es.json, never in JSX.
void i18next.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  defaultNS,
  resources,
  interpolation: { escapeValue: false },
  // Resources are bundled: initialise synchronously (also required by the build-time prerender).
  initAsync: false,
  returnNull: false,
});

export { i18next };
