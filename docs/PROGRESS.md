# PROGRESS — Estado de los hitos

| Hito | Estado | Fecha | Notas |
|---|---|---|---|
| M0 — Arranque del monorepo | ✅ Hecho (con 2 pendientes externos) | 09/10/2026 | Rama `feat/m0-bootstrap`. Firebase CLI vía `pnpm exec firebase` (sin instalación global). Monorepo, core de Functions, reglas + pruebas, web con marca y 3 temas, `/dev/brand`, CI. Pendiente fuera del código: DSN de Sentry UE y alertas de presupuesto (requieren cuentas reales). |
| M1 — Público: landing, lista de espera y textos legales | ✅ Hecho | 09/10/2026 | Landing prerenderizada, `/como-funciona`, `/precios`, `/lista-espera` (+ `/confirmar`), `/legal/:slug`; `joinWaitlist`/`confirmWaitlist`, `mailQueue` + N-19; Lighthouse landing 92/100/100/100. Rama `feat/m1-public`. |
| M2 — Cuenta, sesión y onboarding (pasos 1–2) | ⏳ Siguiente | — | Persistir tema con `updateSettings` (TODO en `ThemeProvider`). CTA de la landing → «Crear cuenta gratis». Enlace a Ayuda en el pie. Precargar datos de la lista de espera al registrarse (FR-19). |
| M3 — Casa, fotos, preferencias y publicación | Pendiente | — | |
| M4 — Verificación de identidad y panel de administración base | Pendiente | — | |
| M5 — Descubrir, Explorar y ficha de casa | Pendiente | — | |
| M6 — Me gusta, match y chat | Pendiente | — | |
| M7 — Premium y crecimiento | Pendiente | — | |
| M8 — Intercambios, valoraciones y notificaciones | Pendiente | — | |
| M9 — Moderación DSA, advertencias, ayuda, quejas, patrocinados, métricas y privacidad | Pendiente | — | |
| M10 — Endurecimiento y lanzamiento | Pendiente | — | |

## M0 — Detalle de la DoD

- [x] `pnpm i && pnpm dev` levanta la web en `localhost:5173` + emuladores (auth, firestore, functions, storage, hosting; UI en `:4000`).
- [x] Favicon, manifest y logo visibles (`/favicon.ico`, `/site.webmanifest`, `TinHomeLogo`).
- [x] `/dev/brand` correcto en claro, oscuro y negro; sin parpadeo al recargar (el `data-theme` está puesto antes de que React pinte; comprobado con Chromium a 360 px y 1280 px).
- [x] `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde (shared 19, functions 23, web 20; cobertura de `shared/domain` 100 %).
- [x] Primera prueba de reglas pasando: `pnpm test:rules` (11 pruebas: denegación por defecto en Firestore y Storage, `users`, `config`, fotos y documentos de verificación).
- [ ] **Sentry (UE) capturando un error de prueba sin PII:** integración hecha (`lib/sentry.ts`, `scrubEvent` probado, botón en `/dev/brand`). Falta crear el proyecto Sentry en región UE y poner `VITE_SENTRY_DSN` (requiere cuenta + DPA, LEG-08).
- [ ] **Alertas de presupuesto:** se crean en Cloud Billing (50/80/100 %) al crear `tinhome-staging`/`tinhome-prod`; no se pueden crear desde el repositorio.

## M1 — Detalle de la DoD

- [x] Un visitante se apunta, recibe (en consola) el email N-19, confirma y ve su ciudad: **E2E-01 en verde** (Playwright, emuladores reales, móvil Pixel 7). En este sandbox se ejecutó con Firestore y Functions como emuladores separados (ver §5 «entorno de desarrollo en la nube»); en local/CI basta `pnpm test:e2e`.
- [x] Lighthouse móvil en la landing ≥ 90 en rendimiento y accesibilidad: **92 / 100** (buenas prácticas 100, SEO 100; CLS 0; TBT ~120 ms; 3 ejecuciones estables) sobre la compilación de producción servida con compresión.
- [x] Pruebas: shared 32 (dominio 100 %), functions 26 unitarias + 12 de integración, web 37 de componentes/páginas, reglas 17, E2E 3.
- [x] Contratos sincronizados (zod ↔ `05_API_CONTRACT.md` ↔ `openapi.yaml`); esquema `04` actualizado (`waitlist`, `demandCounters`, `rateLimits`, TTL).
- [x] UI: carga/vacío/error en cada vista, textos en `es.json`, solo tokens, 360 px sin scroll horizontal, revisada en claro/oscuro/negro, teclado (resumen de errores enlazado a cada campo) y accesibilidad Lighthouse 100 en las 5 páginas públicas.
- [x] Sin PII en logs (IP con hash, email nunca en logs; el proveedor de consola solo funciona en el emulador).
- [x] Seed: 4 ciudades (2 abiertas, 2 en lista de espera), 4 ventanas de 2027, 9 textos legales PROVISIONAL, demanda de ejemplo (un par por debajo de P-18 que no se publica).
- [x] Casos importantes registrados en `10_DECISIONS_AND_OPEN_ITEMS.md` §5 (18 filas M1).

Pendiente de M1 para más adelante: rendimiento de páginas secundarias (M10), J-08 recálculo de demanda (M9), `HttpEmailProvider` (M8, DEC-69).
