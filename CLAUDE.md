# CLAUDE.md — Instrucciones para Claude Code en TinHome

Eres el desarrollador principal de **TinHome Fase 1**: una PWA en español para que residentes en España **intercambien sus casas** haciendo match deslizando tarjetas (HomeExchange + mecánica de deslizar). TinHome conecta a las personas; **el acuerdo lo cierran ellas** (TinHome no es parte ni mueve dinero entre usuarios). Ingresos: suscripción **Premium** (Stripe) y **tarjetas patrocinadas** propias.

Stack: **TypeScript estricto · React 19 + Vite · Tailwind v4 + shadcn/ui + motion · Firebase (Auth/Identity Platform, Firestore, Storage, Functions 2nd gen Node 22, Hosting, App Check) · Stripe · pnpm monorepo** (`apps/web`, `functions`, `packages/shared`).

---

## 1. Antes de escribir código

1. Lee **`docs/08_IMPLEMENTATION_PLAN.md`** e identifica el **siguiente hito** sin terminar (M0 → M10). Trabaja **un hito cada vez**.
2. Lee las secciones que ese hito indica en «Leer». Orden de autoridad si algo choca: `01_PRD.md` > `04_DATABASE_SCHEMA.md` / `05_API_CONTRACT.md` > `03_TECHNICAL_SPEC.md` > `02_UX_UI_SPEC.md` > resto.
3. Si hay una contradicción o una decisión que no está en el pack: **no la inventes**. Anótala en `docs/10_DECISIONS_AND_OPEN_ITEMS.md` §5 y pregunta. Si es un `[PENDIENTE]`, usa el valor por defecto parametrizado.

## 2. Mapa del pack

| Necesito saber… | Documento |
|---|---|
| Qué hace el sistema, reglas (BR-xx), parámetros (P-xx) | `docs/01_PRD.md` |
| Cómo se ve y se siente: pantallas, componentes, tokens, textos | `docs/02_UX_UI_SPEC.md` |
| Arquitectura, stack, algoritmos, pagos, email, entornos | `docs/03_TECHNICAL_SPEC.md` |
| Colecciones, campos, índices, reglas de seguridad | `docs/04_DATABASE_SCHEMA.md` |
| Callables, entradas/salidas, errores | `docs/05_API_CONTRACT.md` + `docs/openapi.yaml` |
| Cómo escribir el código | `docs/06_CODING_STANDARDS.md` |
| Por qué está hecho así | `docs/07_ADR.md` |
| Qué construir y en qué orden | `docs/08_IMPLEMENTATION_PLAN.md` |
| Cómo probar | `docs/09_TESTING_AND_QA.md` |
| Qué está decidido y qué falta | `docs/10_DECISIONS_AND_OPEN_ITEMS.md` |
| Logo, favicon, colores corporativos, temas claro/oscuro/negro | `docs/11_BRAND_GUIDELINES.md` + `assets/brand/` |

## 3. Comandos

```bash
pnpm install                 # instala todo el monorepo
pnpm dev                     # web (5173) + emuladores Firebase
pnpm seed                    # datos de ejemplo en emuladores (Madrid/Valencia, 60 casas, usuarios demo)
pnpm test                    # unitarias + integración (con emuladores)
pnpm test:unit               # solo unitarias (sin Java)
pnpm test:int                # integración de callables contra el emulador de Firestore
pnpm test:rules              # reglas de Firestore y Storage
pnpm test:e2e                # Playwright (emuladores + seed + web); PLAYWRIGHT_CHROMIUM_PATH si Chromium ya está instalado
pnpm brand:assets            # regenera los logos WebP de la web desde assets/brand/logo (solo redimensiona)
pnpm lint && pnpm typecheck  # obligatorio antes de cada commit
stripe listen --forward-to http://127.0.0.1:5001/demo-tinhome/europe-southwest1/stripeWebhook
```

Firebase CLI: dependencia de desarrollo; úsala con `pnpm exec firebase …` (no hace falta instalación global).

Usuarios demo (emulador): `laura@demo.tinhome` (gratis, Madrid), `javier@demo.tinhome` (Premium, Valencia), `admin@demo.tinhome` (superadmin), `marta@demo.tinhome` (Valencia; debe reaceptar los Términos, para probar FR-58), `pablo@demo.tinhome` (Madrid, sin casa; lo usa E2E-03). Javier tiene una casa publicada con fotos. Contraseña: `Demo1234!`.

## 4. Reglas de oro (no negociables)

1. **TypeScript estricto. Sin `any`, sin `@ts-ignore`.** Tipos y esquemas zod en `packages/shared`.
2. **El servidor decide.** Toda escritura de negocio es una *callable* que valida con zod, aplica guardas y reglas BR-xx de `@tinhome/shared/domain` y usa transacciones. El cliente solo guía.
3. **Reglas de seguridad con denegación por defecto** y una prueba por cada permiso nuevo.
4. **Nada de datos personales sensibles en logs, URLs ni analítica.** Los documentos de identidad solo se ven por URL firmada auditada.
5. **UX de calidad alta** (es el producto): cada vista con estados de carga, vacío y error; mobile-first a 360 px; teclado y lector de pantalla; tokens de diseño (nunca hex); textos en `apps/web/src/i18n/es.json` (nunca literales en JSX). Comprueba `docs/02_UX_UI_SPEC.md` §11 antes de cerrar una pantalla.
5b. **Marca:** colores corporativos del logo (Violeta `#8257E5`, Azul `#0A6CF0`, Azul Cielo `#2191FC`, degradado violeta→azul) **solo a través de** `assets/brand/tokens.css`. Tres temas obligatorios: **claro, oscuro y negro**; prueba cada pantalla en los tres. Logo siempre con `TinHomeLogo` y los PNG de `assets/brand/logo/` (variante `light` en claro, `dark` en oscuro/negro, `mono-white` sobre degradado o fotos). Nunca redibujes ni recolorees el logo.
6. **No implementes la Fase 2** (limpieza, llaves, depósito, seguro, hoteles, pagos entre usuarios, fotos/archivos en el chat). El **chat de texto sí es Fase 1** (FR-60, ADR-018).
6b. **Seguridad de la comunidad:** denunciar en ≤ 2 toques desde casas, perfiles, valoraciones y mensajes; alertas a admin en tiempo real; advertencias y retención preventiva (FR-68, FR-69); el equipo nunca lee chats salvo los mensajes denunciados.
7. **Lenguaje de producto:** nunca «alquilar», «precio por noche», «alojamiento gratis» ni «Tinder» en la interfaz; nunca prometas seguros ni garantías.
8. **Contratos sincronizados:** si cambias una callable, actualiza esquema zod + `05_API_CONTRACT.md` + `openapi.yaml` + pruebas en el mismo commit.
9. **Tiempo inyectable** en el dominio; fechas de calendario como `YYYY-MM-DD`; zona `Europe/Madrid`.
10. **Pequeño y verificable:** commits pequeños con Conventional Commits; nunca fusionar con lint/typecheck/pruebas en rojo.

## 5. Flujo de trabajo por hito

1. Planifica en voz alta (lista de ficheros y pasos) antes de editar.
2. Empieza por `packages/shared` (tipos, esquemas, dominio + pruebas) → `functions` (callables/triggers + pruebas con emuladores + reglas) → `apps/web` (hooks de datos → componentes → páginas) → E2E.
3. Ejecuta `pnpm lint && pnpm typecheck && pnpm test` y corrige hasta verde.
4. Actualiza `pnpm seed` para que la funcionalidad se pueda probar a mano.
5. Revisa la DoD del hito y la general (`08_IMPLEMENTATION_PLAN.md` §2).
6. Informa al terminar: qué hiciste, cómo probarlo (pasos y usuarios demo), decisiones tomadas, pendientes. Luego espera.

## 6. Plantillas rápidas

- **Nueva callable:** `packages/shared/src/schemas/<modulo>.ts` (`XxxInput`/`XxxOutput`) → `functions/src/modules/<modulo>/callables.ts` (plantilla de `06_CODING_STANDARDS.md` §6) → exportar en `functions/src/index.ts` → `apps/web/src/lib/callables.ts` → hook en `features/<x>/api/` → pruebas.
- **Nueva pantalla:** ruta *lazy* en `features/<x>/index.ts` → página con esqueleto/vacío/error → textos en `es.json` → prueba de componente + E2E si es flujo crítico.
- **Nuevo parámetro:** `01_PRD.md` §9 → `shared/constants/params.ts` (por defecto) → `config/params` (seed) → `config/public` si lo necesita el cliente.

## 7. Cuando dudes

- ¿Regla de negocio? → `01_PRD.md` §8. ¿Texto para el usuario? → `02_UX_UI_SPEC.md` §7 y `05_API_CONTRACT.md` §3.
- ¿Algo legal (textos, datos personales, moderación)? → implementa el mecanismo y deja el texto como `PROVISIONAL`; nunca redactes cláusulas legales definitivas.
- ¿Una librería nueva? → justifícala; si es estructural, propón un ADR.
