# PROGRESS — Estado de los hitos

| Hito | Estado | Fecha | Notas |
|---|---|---|---|
| M0 — Arranque del monorepo | ✅ Hecho (con 2 pendientes externos) | 09/10/2026 | Rama `feat/m0-bootstrap`. Firebase CLI vía `pnpm exec firebase` (sin instalación global). Monorepo, core de Functions, reglas + pruebas, web con marca y 3 temas, `/dev/brand`, CI. Pendiente fuera del código: DSN de Sentry UE y alertas de presupuesto (requieren cuentas reales). |
| M1 — Público: landing, lista de espera y textos legales | ✅ Hecho | 09/10/2026 | Landing prerenderizada, `/como-funciona`, `/precios`, `/lista-espera` (+ `/confirmar`), `/legal/:slug`; `joinWaitlist`/`confirmWaitlist`, `mailQueue` + N-19; Lighthouse landing 92/100/100/100. Rama `feat/m1-public`. |
| M2 — Cuenta, sesión y onboarding (pasos 1–2) | ✅ Hecho | 09/10/2026 | Registro email/Google, verificación, entrar/recuperar, `AuthProvider` + guardas, `AppShell`, onboarding 1–2 (teléfono), referidos, reaceptación, cerrar sesión en todos los dispositivos, `/ayuda`. Rama `feat/m2-account`. |
| M3 — Casa, fotos, preferencias y publicación | ✅ Hecho | 10/10/2026 | Pasos 3–6 del onboarding, editor de casa con vista previa, fotos (trigger sharp: EXIF fuera, 3 WebP, dHash, retención por duplicado/cambios), preferencias de viaje, declaración responsable, publicar, `/app/mi-casa`, `/app/viaje`. Rama `feat/m3-home`. |
| M4 — Verificación de identidad y panel de administración base | ✅ Hecho | 10/10/2026 | Paso 5 real (documentos + ubicación), `/app/verificacion` (+ `/ubicacion` con QR), revisión en `/admin` (rol + 2FA, visor seguro con marca de agua y auditoría), fundadores y referidos, J-04/J-10, N-03/N-04/N-13, KPIs. Rama `feat/m4-verification`. |
| M5 — Descubrir, Explorar y ficha de casa | ✅ Hecho | 10/10/2026 | Mazo con Encaje perfecto primero y BR-14, deslizar con teclado/gestos, pasar/deshacer, Explorar con filtros (Premium), ficha de casa, 60 casas de catálogo en el seed, E2E-05. Rama `feat/m5-discover`. |
| M6 — Me gusta, match y chat | ✅ Hecho | 10/10/2026 | Me gusta con límites, match recíproco con celebración, me gusta recibidos, chat de texto en tiempo real (BR-22/36), bloquear, deshacer match, kit de acuerdo en PDF, N-07, E2E-06 (< 1 s). Rama `feat/m6-match`. |
| M7 — Premium y crecimiento | ✅ Hecho | 14/10/2026 | Checkout/Portal de Stripe (simulados en el emulador), webhook idempotente con firma, J-09, derechos encadenados, desistimiento con reautenticación y reembolso P-07, N-12, `/app/premium`, `/app/invita`, me gusta con mensaje, E2E-07. Rama `feat/m7-premium`. |
| M8 — Intercambios, valoraciones y notificaciones | ✅ Hecho (push real pendiente de staging) | 14/10/2026 | Declarar/confirmar/cancelar intercambio desde el chat, ficha con línea de tiempo y cuenta atrás, J-01/J-02/J-03/J-06/J-13, valoraciones de doble ciego con Casa Top, centro de avisos en tiempo real, preferencias por categoría y canal, `HttpEmailProvider`, 7 plantillas nuevas, web push FCM (`PushPrompt`, service worker, guía iOS), E2E-08. Rama `feat/m8-exchanges`. |
| M9 — Moderación DSA, advertencias, ayuda, quejas, patrocinados, métricas y privacidad | ⏳ En curso | 14/10/2026 | M9a: denuncias, retención preventiva, moderación con declaración de motivos, advertencias, recursos, alertas, J-07/J-11/J-12, E2E-09. M9b: quejas con número y plazo, «Mis solicitudes», cola de quejas, editor de FAQ y `rateFaq`, `/denunciar`. Rama `feat/m9-moderation`. Falta: admin de usuarios/ciudades/parámetros/textos/métricas/auditoría, patrocinados, RGPD y baja. |
| M10 — Endurecimiento y lanzamiento | Pendiente | — | |

## M8 — Detalle de la DoD

- ✅ Ciclo completo con reloj inyectado: propuesto → confirmado → (N-09) → completado (J-02, N-10) → valoraciones de doble ciego publicadas (N-11) — integración `exchange lifecycle with an injected clock`.
- ✅ Casa Top se activa al cumplir BR-13 (media ≥ P-04 con ≥ P-05 publicadas), también cuando J-03 publica una pendiente — misma prueba.
- ✅ Todos los emails tienen versión texto — prueba de plantillas (N-06, N-08 ×5, N-09, N-10, N-11, N-20, N-21) y `simpleEmail`.
- ⚠️ «Un mensaje nuevo genera push en un navegador con permiso concedido»: el envío está implementado y probado con un emisor falso (tokens, preferencias, vista previa, tokens caducados) y el service worker muestra y abre la notificación; el push real necesita FCM y la clave VAPID del proyecto, que no existen en el emulador. Queda para la prueba en staging.
- ✅ E2E-08: Sofía declara desde el chat, Javier recibe el aviso y confirma desde el mensaje de sistema, la ficha de Sofía se actualiza en tiempo real; doble ciego en un intercambio completado y la valoración aparece en la casa.
- Pruebas: shared 125, functions 31 unitarias + 101 de integración, web 128, reglas 43, E2E 16/16 (dos pasadas seguidas con seed).

## M7 — Detalle de la DoD

- ✅ Suscribirse → Premium activo al instante y `homes.ownerPremium` — integración y E2E-07 (checkout simulado).
- ✅ Cancelar al final del periodo mantiene Premium hasta `currentPeriodEnd`; `END_PERIOD` lo retira — integración + E2E-07.
- ✅ Desistimiento en 14 días con reautenticación, una sola vez, con reembolso P-07 y N-12 — integración + E2E-07.
- ✅ Webhook: firma inválida → 400, eventos repetidos sin efecto, evento falsificado rechazado — integración.
- ✅ Referidos: resumen con enlace, invitados y recompensas del año — integración + componente.
- Pruebas: shared 112, functions 28 unitarias + 94 de integración, web 118, reglas 39, E2E 15/15.
- Pendiente fuera del código: cuenta de Stripe (precios mensual/anual con IVA, Portal configurado, endpoint de webhook con versión de API fijada) y secretos `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` en staging/producción.

## M6 — Detalle de la DoD

- ✅ Me gusta recíproco → match con ID determinista y celebración — integración + E2E-06.
- ✅ Mensaje en < 1 s en el otro navegador — E2E-06 (con mensaje de calentamiento; en producción `minInstances: 1`).
- ✅ Solo participantes con match activo leen mensajes — reglas.
- ✅ Teléfonos, emails y pagos en el chat se bloquean o avisan (BR-22) — dominio + integración.

## M5 — Detalle de la DoD

- ✅ Encaje perfecto primero, luego BR-14 — dominio + E2E-05.
- ✅ Pasar con teclado y no vuelve (BR-11) — E2E-05.
- ✅ Filtros Premium bloqueados para gratis (`E_PREMIUM_REQUIRED`) — integración + componente.
- Verificación manual pendiente: 60 fps en un móvil de gama media (no medible en el sandbox).

## M4 — Detalle de la DoD

- ✅ Admin aprueba → la casa pasa a visible y, si corresponde, Premium de fundador — integración (`approval makes the home visible, awards founder and referral rewards`) y E2E-04 (Marta).
- ✅ Los documentos no son legibles desde el cliente — pruebas de reglas de Storage (ni propietario ni admin) y de Firestore (`verifications` solo admin con 2FA).
- ✅ Cada apertura queda en `auditLog` — integración (`verification.view`, `verification.file.open`).
- ✅ Ubicación fuera del radio → `FAIL` y la casa no se hace visible — integración y E2E-04 con geolocalización simulada (Valencia → casa de Madrid).
- Pruebas: dominio 88, web 93, integración 58, reglas 34, E2E 10/10.
- Límite del entorno: el emulador de Auth no admite TOTP; el admin demo usa SMS como segundo factor (la guarda del servidor exige cualquier segundo factor). El alta TOTP guiada está implementada para producción y no se ha podido probar aquí.

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
