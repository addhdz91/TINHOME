# PROGRESS — Estado de los hitos

| Hito | Estado | Fecha | Notas |
|---|---|---|---|
| M0 — Arranque del monorepo | ✅ Hecho (con 2 pendientes externos) | 09/10/2026 | Rama `feat/m0-bootstrap`. Firebase CLI vía `pnpm exec firebase` (sin instalación global). Monorepo, core de Functions, reglas + pruebas, web con marca y 3 temas, `/dev/brand`, CI. Pendiente fuera del código: DSN de Sentry UE y alertas de presupuesto (requieren cuentas reales). |
| M1 — Público: landing, lista de espera y textos legales | ✅ Hecho | 09/10/2026 | Landing prerenderizada, `/como-funciona`, `/precios`, `/lista-espera` (+ `/confirmar`), `/legal/:slug`; `joinWaitlist`/`confirmWaitlist`, `mailQueue` + N-19; Lighthouse landing 92/100/100/100. Rama `feat/m1-public`. |
| M2 — Cuenta, sesión y onboarding (pasos 1–2) | ✅ Hecho | 09/10/2026 | Registro email/Google, verificación, entrar/recuperar, `AuthProvider` + guardas, `AppShell`, onboarding 1–2 (teléfono), referidos, reaceptación, cerrar sesión en todos los dispositivos, `/ayuda`. Rama `feat/m2-account`. |
| M3 — Casa, fotos, preferencias y publicación | ✅ Hecho | 10/10/2026 | Pasos 3–6 del onboarding, editor de casa con vista previa, fotos (trigger sharp: EXIF fuera, 3 WebP, dHash, retención por duplicado/cambios), preferencias de viaje, declaración responsable, publicar, `/app/mi-casa`, `/app/viaje`. Rama `feat/m3-home`. |

| M4 — Verificación de identidad y panel de administración base | ⏳ Siguiente | — | |
| M5 — Descubrir, Explorar y ficha de casa | Pendiente | — | |
| M6 — Me gusta, match y chat | Pendiente | — | |
| M7 — Premium y crecimiento | Pendiente | — | |
| M8 — Intercambios, valoraciones y notificaciones | Pendiente | — | |
| M9 — Moderación DSA, advertencias, ayuda, quejas, patrocinados, métricas y privacidad | Pendiente | — | |
| M10 — Endurecimiento y lanzamiento | Pendiente | — | |

## M3 — Detalle de la DoD

- ✅ Un usuario publica su casa con 5 fotos — E2E-03 (`pablo@demo.tinhome`).
- ✅ Textos con teléfono o precio rechazados con mensaje — prueba de integración + E2E-03.
- ✅ EXIF eliminado — prueba de integración (JPEG con GPS → WebP sin EXIF).
- ✅ Casa no visible hasta identidad y ubicación aprobadas — `visibilityProblems` (BR-04), integración + E2E.
- ✅ Foto duplicada de otra casa del seed → retención preventiva — integración; el seed rellena `photoHashIndex` con las fotos de Javier.
- Pruebas: web 80, integración 38, reglas 27, E2E 8/8.
- Limitación del sandbox: el proxy bloquea la llamada interna Storage → Functions del emulador; aquí E2E-03 se validó con un puente temporal que invoca el mismo `processHomePhoto` (no se versiona). En CI/local el trigger corre normal.

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

## M2 — Detalle de la DoD

- [x] **E2E:** registro → verificar email (emulador de Auth) → teléfono (código SMS del emulador) → llega al paso 3. También: menor rechazado, usuario demo entra en su paso guardado y el modal de reaceptación bloquea hasta aceptar (FR-58). 7/7 E2E en verde (con M1).
- [x] **Menores rechazados:** formulario (dominio compartido), servidor (`E_UNDERAGE`, T-D01 en dominio e integración) y borrado de la cuenta de Auth si el servidor la rechaza.
- [x] **Reglas** de `users` y `publicProfiles` (y `legalAcceptances`, `referrals`, `referralCodes`, `faqs`): 23 pruebas de reglas en total.
- [x] Pruebas: shared 60 (dominio 100 % líneas, 96 % ramas), functions 27 unitarias + 26 de integración (Auth + Firestore), web 76, reglas 23, E2E 7.
- [x] Contratos sincronizados (`Me.settings`, errores y efectos de las 6 callables en `05` y `openapi`); `04` actualizado (`waitlistPrefill`, `referralCodes`).
- [x] UI en claro/oscuro/negro a 360 px sin desbordes ni errores de consola; teclado y lector (etiquetas, errores enlazados, modal con foco atrapado); textos en `es.json`.
- [x] Landing sin regresión: Lighthouse 90–92 / 100 / 100 / 100 (ahora hidratada).
- [x] Seed: 4 usuarios demo (Auth + `users` + `publicProfiles`, superadmin con claim), 11 artículos de ayuda, Términos con reaceptación para el usuario demo Marta.
- [x] 17 casos importantes registrados en `10_DECISIONS_AND_OPEN_ITEMS.md` §5.

Pendiente fuera del código: política de contraseñas y bloqueo por intentos en Identity Platform (staging/prod); personalizar la plantilla de verificación de Firebase.
