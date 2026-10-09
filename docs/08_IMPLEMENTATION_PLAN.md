# 08 · IMPLEMENTATION PLAN — Hitos para construir TinHome Fase 1

| Campo | Valor |
|---|---|
| Versión | 2.0 · 08/10/2026 |
| Calendario de negocio | Semanas 1–13 (12/10/2026 → 10/01/2027); apertura prevista el 11/01/2027 |

> **Para agentes de IA (Claude Code):** construye **un hito cada vez y en orden**. Al empezar un hito, lee las secciones citadas. Al terminar, cumple su *Definición de terminado* (DoD) y la general (§2), haz commit y para a informar: qué se hizo, cómo probarlo y qué quedó pendiente. No adelantes trabajo de hitos posteriores salvo andamiaje imprescindible.

---

## 1. Hitos

### M0 — Arranque del monorepo
- **Leer:** `03_TECHNICAL_SPEC.md` §2–3, `06_CODING_STANDARDS.md`, `07_ADR.md`.
- **Hacer:**
  - pnpm workspaces (`apps/web`, `functions`, `packages/shared`), `tsconfig` base estricto, ESLint + Prettier + Husky + lint-staged, Vitest en los tres paquetes.
  - Vite + React + TS, Tailwind v4 importando **`assets/brand/tokens.css`** (copiado a `apps/web/src/styles/tokens.css`) con los temas **claro, oscuro y negro**, shadcn/ui inicializado y mapeado a los tokens, fuentes autoalojadas (Nunito + Inter), i18next con `es.json`, router con layout público, de app y de admin (vacíos).
  - **Marca:** copiar `assets/brand/favicon/*`, `site.webmanifest` y `og-image` a `apps/web/public/` (rutas de `11_BRAND_GUIDELINES.md` §7); logos a `apps/web/src/assets/brand/`; pegar `head-snippet.html` en `index.html`; componentes `TinHomeLogo` (C-25) y `ThemeSwitcher` (C-26); página interna `/dev/brand` (solo en desarrollo) que muestre tokens, botones y logo en los tres temas.
  - Firebase: `firebase.json` con emuladores (auth, firestore, functions, storage, hosting), `firestore.rules`/`storage.rules` de `04_DATABASE_SCHEMA.md` §4, `firestore.indexes.json`, proyecto `demo-tinhome`.
  - `packages/shared`: constantes, tipos y esquemas base; `functions/src/core` con `appError`, guardas, `getParams`, `audit`, `clock`, `logger`.
  - Scripts raíz: `dev` (web + emuladores), `build`, `test`, `test:rules`, `lint`, `typecheck`, `seed`, `emulators`.
  - GitHub Actions de CI (§14 de la spec técnica).
- **DoD:** `pnpm i && pnpm dev` levanta la web en `localhost:5173` con emuladores; favicon y logo visibles; `/dev/brand` correcto en claro, oscuro y negro sin parpadeo al recargar; `pnpm lint typecheck test` en verde; primera prueba de reglas pasando (denegación por defecto); Sentry (UE) capturando un error de prueba sin PII; alertas de presupuesto creadas.

### M1 — Público: landing, lista de espera y textos legales
- **Leer:** PRD FR-17–19, FR-57; UX S-01, S-16.
- **Hacer:** landing completa (sin registro aún), `/como-funciona`, `/precios` (precios desde `config/public`), `/lista-espera` con `joinWaitlist`/`confirmWaitlist` (doble opt-in, email por consola en dev), `/legal/:slug` desde `legalDocs` (Markdown seguro con `react-markdown` sin HTML), `CityProgress` y `DemandCounter` leyendo `cities`/`demandStats`. `scripts/seed.ts` con ciudades, ventanas, textos legales provisionales y `config`.
- **DoD:** un visitante se apunta, recibe (en consola) el email, confirma y ve su ciudad; Lighthouse móvil ≥ 90 en rendimiento y accesibilidad en la landing.

### M2 — Cuenta, sesión y onboarding (pasos 1–2)
- **Leer:** FR-01–07, FR-58; UX S-02, S-03, §2.3; API §2.1.
- **Hacer:** registro (email + Google), `completeSignup`, verificación de email, entrar/recuperar, `getMe`, `AuthProvider`, guardas de ruta, `AppShell` (barra inferior/lateral), onboarding con `ProgressStepper`, paso de teléfono (Phone Auth vinculado + `confirmPhoneLinked`), referidos por `/i/:code`, modal de reaceptación legal, política de contraseñas, `signOutEverywhere` y emails de seguridad (FR-71), centro de ayuda público `/ayuda` con FAQ de `faqs` (FR-66, lectura) y enlace a Ayuda en toda la app.
- **DoD:** E2E: registro → verificar email (emulador) → teléfono (código del emulador) → llega al paso 3. Menores rechazados. Pruebas de reglas de `users`/`publicProfiles`.

### M3 — Casa, fotos, preferencias y publicación (pasos 3, 4 y 6)
- **Leer:** FR-10–16; BR-03, BR-22, BR-23; UX S-03, C-11, C-12; spec §5.4 (fotos), §9.
- **Hacer:** formulario por subpasos con vista previa de tarjeta en vivo, `upsertHome` con validación de textos (cliente y servidor), subida de fotos a `homes/{uid}/raw` + trigger sharp (EXIF fuera, 3 tamaños WebP, `dhash`), índice `photoHashIndex` y retención por fotos duplicadas o cambios masivos (FR-64, FR-65), reordenar/borrar, `updateTravelPrefs` (destinos, ventanas, rangos, viajeros), declaración responsable, `publishHome` con *blockers*, pantalla Mi casa y Perfil con % completado, trigger de visibilidad (BR-04) y contadores de ciudad.
- **DoD:** un usuario publica su casa con 5 fotos; textos con teléfono/precio rechazados con mensaje; EXIF eliminado (prueba de integración); casa no visible hasta identidad y ubicación aprobadas; una foto duplicada de otra casa del seed activa la retención preventiva.

### M4 — Verificación de identidad y panel de administración base
- **Leer:** FR-08, FR-09, FR-40, FR-48, FR-49; BR-19, BR-20, BR-24, BR-25; ADR-008; UX S-14, §9.
- **Hacer:** paso 5 (subida de documentos a `private/verifications`, autorización del arrendador si `TENANT` con enlace al modelo), `submitIdentityVerification` con hash del documento y detección de duplicados; `/admin` con TOTP obligatorio, `scripts/set-role.ts`, cola y detalle de verificaciones con `SecureDocViewer`, `adminGetVerificationFileUrl` (auditado), `adminDecideVerification`; **verificación de ubicación** (`LocationCheck`, `verifyHomeLocation`, QR en escritorio, `requestLocationReview`, `adminDecideLocationReview`, job J-10) (FR-63); triggers de fundador y recompensa de referido; job J-04; emails N-03/N-04/N-13; panel de inicio con KPIs básicos.
- **DoD:** admin aprueba → la casa pasa a visible, el usuario recibe Premium de fundador si corresponde; los documentos no son legibles desde el cliente (prueba de reglas de Storage); cada apertura queda en `auditLog`; la ubicación fuera del radio devuelve `FAIL` y no hace visible la casa (prueba con coordenadas simuladas en Playwright).

### M5 — Descubrir, Explorar y ficha de casa
- **Leer:** FR-20–22; BR-04, BR-11, BR-14; spec §8; UX S-04–S-06, C-02–C-07.
- **Hacer:** dominio `compatibility.ts` y `ranking.ts` con pruebas exhaustivas; `getDiscoverDeck`, `searchHomes`, `getHomeDetail`; `SwipeDeck` con gestos, botones, teclado, precarga y anuncios ARIA; `passHome`/`undoPass`; Explorar con filtros (los Premium con candado); ficha completa; estados vacío/bloqueado/lista de espera.
- **DoD:** con datos de `seed`, el mazo muestra primero Encaje perfecto; 60 fps al deslizar en un móvil medio (perfil de Chrome); navegación completa solo con teclado; bloqueados y pasados no aparecen.

### M6 — Me gusta, match y chat
- **Leer:** FR-23–29, FR-41; BR-05–BR-10, BR-12; UX S-07, S-08, C-05, C-08, C-09.
- **Hacer:** `likeHome` (transacción, límites diarios y por hora, match con ID determinista), pantalla de celebración, `listLikesReceived` (gratis difuminado / Premium lista), lista de **chats** en tiempo real y **conversación** (`ChatThread`, `MessageComposer`, `sendMessage` con `minInstances: 1`, `markConversationRead`, `deleteMessageForMe`, mensajes de sistema, aviso de pagos, modo sin conexión) (FR-60), compartir teléfono voluntario (`sharePhoneInChat`, `getMatchContact` con WhatsApp) (FR-28), `unmatch`, `blockUser`/`unblockUser`/`listBlocked`, `BlockerSheet` y `PaywallSheet` contextuales, kit de acuerdo PDF (pdf-lib) con plantilla de `legalDocs/acuerdo-intercambio`, notificación N-07.
- **DoD:** pruebas de concurrencia (dos me gusta simultáneos → un solo match); el 11.º me gusta de un usuario gratis devuelve `E_LIKE_LIMIT` y muestra la hoja; tras deshacer match el chat y el teléfono dejan de ser accesibles; un mensaje llega al otro usuario en < 1 s (dos navegadores en Playwright); el mensaje 21 en un minuto devuelve `E_RATE_LIMIT`.

### M7 — Premium y crecimiento
- **Leer:** FR-34–40; BR-17–BR-20, BR-34; spec §10; UX S-12, S-13.
- **Hacer:** página de planes, `createCheckoutSession` (aceptación de inicio inmediato), `stripeWebhook` idempotente, `entitlements` y `premiumUntil`, `createPortalSession`, `withdrawSubscription`, job J-09, ventajas Premium aplicadas en servidor (**me gusta con mensaje** FR-61 con su hoja y su visualización destacada en el receptor, me gusta ilimitados, lista de recibidos, filtros, deshacer, impulso de ranking, sin intersticiales), `getReferralSummary` y pantalla Invita y gana con Web Share.
- **DoD:** flujo completo en modo test de Stripe con `stripe listen`: pagar → Premium activo → cancelar en portal → sigue activo hasta fin de periodo; desistimiento dentro de 14 días reembolsa (P-07); referido verificado otorga 30 días a ambos.

### M8 — Intercambios, valoraciones y notificaciones
- **Leer:** FR-30–33, FR-46; BR-13, BR-15, BR-16; UX S-09, S-10, §8; spec §5.5, §11.
- **Hacer:** `proposeExchange`/`respondExchange`/`cancelExchange`, ficha con línea de tiempo, jobs J-01, J-02, J-03, J-06; `submitReview` con doble ciego; recálculo de `rating` e `isTop`; centro de avisos (tiempo real, marcar leído), preferencias de notificación, `mailQueue` + plantillas N-01…N-28 + `HttpEmailProvider` configurable; **web push** con FCM (`PushPrompt`, `registerPushToken`, service worker, guía de instalación en iOS) (FR-70) y job J-13 de resumen de no leídos.
- **DoD:** pruebas con reloj inyectado del ciclo completo propuesto → confirmado → completado → valoraciones publicadas; Casa Top se activa al cumplir BR-13; todos los emails tienen versión texto; un mensaje nuevo genera push en un navegador con permiso concedido.

### M9 — Moderación DSA, advertencias, ayuda, quejas, patrocinados, métricas y privacidad
- **Leer:** FR-41–45, FR-47, FR-50–56, FR-59; BR-26–BR-30; UX §9.
- **Hacer:** `ReportDialog` con los motivos de FR-42 (incluidos «Fotos que no son de su vivienda» y «Trato grosero») desde ficha, perfil, valoraciones y **mensajes**; alertas de administración en tiempo real + email (N-26) y job J-12; **retención preventiva** (FR-69) y **advertencias** con escalado propuesto (FR-68, `strikes`, J-11, `StrikeNotice`); **quejas y reclamaciones** (`submitComplaint`, «Mis solicitudes», cola de admin) (FR-67); editor de FAQ y `rateFaq` (FR-66); `submitReport` y `/denunciar` (`submitPublicReport` con App Check y límite por IP), cola de moderación con plantillas de declaración de motivos y vista previa, `adminModerate`, `submitAppeal`/`adminDecideAppeal`, usuarios (buscar, ficha, conceder Premium, suspender, expulsar, roles), ciudades, ventanas, parámetros, partners + `getSponsored` + `/r/:partnerId`, textos legales con versiones, métricas y CSV, auditoría, RGPD (`submitGdprRequest`, `exportMyData`, baja con J-05), job J-07 y J-08, `trackEvent`.
- **DoD:** toda acción restrictiva genera declaración de motivos y email; recurso revisable; exportación de datos descargable; baja completa purga en el emulador; una denuncia «Fotos que no son de su vivienda» de un usuario verificado oculta la casa al instante y avisa al admin; la tercera advertencia propone expulsión y requiere confirmación; una queja recibe número de seguimiento y plazo.

### M10 — Endurecimiento y lanzamiento
- **Leer:** `09_TESTING_AND_QA.md`; NFR-01–10.
- **Hacer:** auditoría de accesibilidad (axe + manual con lector de pantalla), rendimiento (LCP, tamaños de bundle, imágenes), revisión de reglas, CSP y cabeceras, PWA (manifest, iconos, offline del shell), **copias de seguridad** (PITR + programadas) y *runbook* de restauración probado en staging (NFR-12), E2E completos, despliegue a staging, ensayo con 20 usuarios beta, checklist de lanzamiento (§3).
- **DoD:** todos los criterios de §2 y §3 cumplidos.

---

## 2. Definición de terminado (general, cada hito)

- [ ] Código en TypeScript estricto sin errores; lint y formato en verde.
- [ ] Pruebas unitarias del dominio nuevo (≥ 90 % en `shared/domain`), integración de callables con emuladores y reglas actualizadas.
- [ ] Contratos sincronizados: esquema zod ↔ `05_API_CONTRACT.md` ↔ `openapi.yaml`.
- [ ] UI con estados de carga/vacío/error, textos en `es.json`, tokens, móvil 360 px, teclado y lector de pantalla.
- [ ] Sin PII en logs; secretos fuera del código.
- [ ] Documentación del pack actualizada si cambió algo; decisiones nuevas en `10_DECISIONS_AND_OPEN_ITEMS.md` o ADR.
- [ ] `seed` actualizado para poder probar la funcionalidad a mano.

## 3. Checklist de lanzamiento (11/01/2027)

**Producto**
- [ ] Ciudades del corredor configuradas con umbral; ventanas de 2027 creadas.
- [ ] ≥ 150 casas visibles por ciudad (o decisión explícita de retrasar).
- [ ] E2E críticos en verde contra staging; beta cerrada sin errores bloqueantes.

**Negocio y legal** (fuera del código; ver `10_DECISIONS_AND_OPEN_ITEMS.md`)
- [ ] Sociedad constituida; Stripe en modo live a su nombre; precios definitivos (DEC-75).
- [ ] Textos legales validados por el abogado y publicados (Términos con rol de TinHome, DSA, privacidad, cookies, normas, declaración, autorización del arrendador, acuerdo de intercambio).
- [ ] EIPD de la verificación de identidad; registro de actividades; contratos de encargo (Google, Stripe, email).
- [ ] Respuesta escrita sobre registro de viajeros y DAC7.
- [ ] Proveedor de email con SPF, DKIM y DMARC (DEC-69).
- [ ] Marca solicitada en la OEPM.
