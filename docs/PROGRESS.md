# PROGRESS — Estado de los hitos

| Hito | Estado | Fecha | Notas |
|---|---|---|---|
| M0 — Arranque del monorepo | ✅ Hecho (con 2 pendientes externos) | 09/10/2026 | Rama `feat/m0-bootstrap`. Firebase CLI vía `pnpm exec firebase` (sin instalación global). Monorepo, core de Functions, reglas + pruebas, web con marca y 3 temas, `/dev/brand`, CI. Pendiente fuera del código: DSN de Sentry UE y alertas de presupuesto (requieren cuentas reales). |
| M1 — Público: landing, lista de espera y textos legales | ⏳ Siguiente | — | Incluir: logos redimensionados para web (los PNG pesan 200–570 KB) para cumplir Lighthouse ≥ 90. |
| M2 — Cuenta, sesión y onboarding (pasos 1–2) | Pendiente | — | Persistir tema con `updateSettings` (TODO en `ThemeProvider`). |
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
