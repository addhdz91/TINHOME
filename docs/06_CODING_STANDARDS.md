# 06 · CODING STANDARDS — TinHome

| Campo | Valor |
|---|---|
| Versión | 2.0 · 08/10/2026 |
| Aplica a | `apps/web`, `functions`, `packages/shared`, `scripts`, `tests` |

> Estas reglas existen para que todo el código —escrito por personas o por IA— parezca escrito por la misma persona. **Si una regla te obliga a algo absurdo en un caso concreto, no la rompas en silencio: déjalo comentado con `// STANDARDS-EXCEPTION: motivo`.**

---

## 1. TypeScript

- `tsconfig` base en la raíz con: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`, `verbatimModuleSyntax: true`, `module`/`moduleResolution` acordes al paquete (`Bundler` en web, `NodeNext` en functions).
- **Prohibido** `any`. Usa `unknown` + validación (zod) o tipos genéricos. `as` solo para estrechar tras una comprobación, nunca para «callar» al compilador. `// @ts-ignore` prohibido; `// @ts-expect-error` solo en pruebas con comentario.
- Tipos de dominio **solo** en `@tinhome/shared`. Los tipos de entrada/salida de callables se infieren de zod: `type LikeHomeInput = z.infer<typeof LikeHomeInput>`.
- Enums como **uniones de literales** + objeto `as const` (no `enum` de TS):
  ```ts
  export const HOME_STATUS = ['DRAFT', 'PUBLISHED', 'PAUSED', 'HIDDEN_BY_ADMIN'] as const;
  export type HomeStatus = (typeof HOME_STATUS)[number];
  ```
- Uniones discriminadas para resultados: `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` en el dominio puro.
- Funciones exportadas con **tipo de retorno explícito**.
- Importes en céntimos (`number` entero, nombre `…Cents`); fechas de calendario como `IsoDate` (`string` con *brand*); nunca `Date` para fechas sin hora.

## 2. Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables, funciones | `camelCase`, verbos para funciones | `likesRemaining`, `computeCompatibility()` |
| Booleanos | prefijo `is/has/can/should` | `isTop`, `canLike` |
| Tipos, interfaces, componentes | `PascalCase` | `HomeCard`, `SwipeDeck` |
| Constantes globales | `UPPER_SNAKE_CASE` | `MAX_PHOTOS` |
| Ficheros de componentes React | `PascalCase.tsx` | `MatchCelebration.tsx` |
| Otros ficheros | `kebab-case.ts` | `text-validation.ts` |
| Hooks | `useXxx` en `use-xxx.ts` | `useDiscoverDeck` en `use-discover-deck.ts` |
| Callables | `verboObjeto` en `camelCase`; admin con prefijo `admin` | `proposeExchange`, `adminModerate` |
| Esquemas zod | `NombreCallable` + `Input`/`Output` | `ProposeExchangeInput` |
| Colecciones Firestore | `camelCase` plural | `legalAcceptances` |
| Códigos de error | `E_UPPER_SNAKE` | `E_LIKE_LIMIT` |
| Claves i18n | `pantalla.seccion.elemento` | `discover.empty.title` |
| Eventos de analítica | `snake_case` pasado | `match_created` |

Idioma: **código, identificadores y comentarios técnicos en inglés**; textos de usuario en español (solo en `es.json` y plantillas de email); documentación del proyecto en español.

## 3. Estructura de carpetas (por *feature*)

```
apps/web/src/features/matches/
├─ pages/            MatchesPage.tsx, MatchDetailPage.tsx
├─ components/       MatchListItem.tsx, ContactCard.tsx, NextStepsCard.tsx
├─ api/              use-matches.ts, use-unmatch.ts, use-match-contact.ts
├─ lib/              (utilidades solo de esta feature)
└─ index.ts          (exporta rutas y lo que otras features necesiten)
```
- Una *feature* no importa archivos internos de otra; solo su `index.ts`.
- Componentes genéricos en `src/components`; primitivas shadcn en `src/components/ui` (no editarlas salvo tokens/estilos).
- En `functions/src/modules/<modulo>/`: `callables.ts`, `triggers.ts`, `service.ts` (lógica con Firestore), y el dominio puro siempre en `@tinhome/shared/domain`.

## 4. React

- Componentes **funcionales** con props tipadas (`interface XxxProps`). Sin `React.FC`.
- Un componente por fichero; < 200 líneas; si crece, extraer subcomponentes o hooks.
- **Sin lógica de negocio en componentes:** usan hooks de `api/` y funciones de `@tinhome/shared`.
- Estados de **carga, vacío y error** obligatorios en toda vista con datos (`02_UX_UI_SPEC.md` §11).
- Accesibilidad: primitivas Radix/shadcn; `aria-*` correctos; nunca `div` clicable sin rol y teclado.
- Estilos solo con clases Tailwind basadas en **tokens** (`bg-surface`, `text-muted`); prohibidos colores hex o arbitrarios (`bg-[#…]`). Variantes con `cva`; combinación con `cn()`.
- Textos con `t('clave')`; prohibidos literales visibles en JSX (lo comprueba ESLint `i18next/no-literal-string`).
- Formularios: `react-hook-form` + `zodResolver(Esquema)`; mensajes de error desde `es.json`.
- Datos: TanStack Query; claves de query centralizadas por feature (`matchKeys.list(uid)`); mutaciones optimistas con `onMutate`/`onError` (rollback) y `toast`.
- Rutas con `lazy()`; nada de importaciones del área `admin` desde el área de usuario.
- Imágenes con `width`/`height` o `aspect-ratio`, `loading="lazy"` salvo la primera tarjeta del mazo, `alt` descriptivo.

## 5. Dominio puro (`packages/shared/src/domain`)

- **Sin dependencias** de Firebase, React ni Node: funciones puras, deterministas.
- El tiempo **se inyecta** (`now: Date` como parámetro o un `Clock`); nunca `new Date()` dentro del dominio.
- Cada regla BR-xx implementada en una función con su ID en el JSDoc:
  ```ts
  /** BR-05 — Requisitos para dar me gusta. */
  export function getLikeBlockers(ctx: LikeContext): Blocker[] { … }
  ```
- Cobertura ≥ 90 % en `domain/`.

## 6. Cloud Functions

Plantilla obligatoria de una callable:

```ts
export const likeHome = onCall(callableOptions, async (request) => {
  const auth = requireAuth(request);                      // 1. sesión
  await requireUserGuards(auth.uid, ['EV', 'ID', 'ACT', 'LEG', 'CO']); // 2. guardas
  const input = parseInput(LikeHomeInput, request.data);  // 3. validación zod → E_VALIDATION
  const params = await getParams();                       // 4. parámetros (caché 60 s)
  const result = await likeService.like(auth.uid, input, params, clock.now()); // 5–7. dominio + transacción + efectos
  return LikeHomeOutput.parse(result);                    // 8. salida validada
});
```

- `callableOptions` común: `{ region: 'europe-southwest1', enforceAppCheck: true, cors: [orígenes permitidos], memory/timeouts por defecto }`.
- **Errores:** lanzar siempre `appError('E_CODIGO', { fields?, meta? })` (crea `HttpsError` con `details.code`). Nunca `throw new Error('texto')` hacia el cliente. Errores inesperados → `E_INTERNAL` y log con `requestId`.
- **Transacciones** para todo lo que lee y escribe varios documentos relacionados (me gusta + match, contadores, derechos Premium). IDs deterministas para evitar duplicados.
- **Idempotencia** en webhooks (`stripeEvents/{id}`) y en callables con `clientRequestId`.
- **Auditoría** (`audit.write(...)`) en toda acción de admin y en accesos a documentos de identidad.
- **Efectos secundarios** (emails, notificaciones, analítica) a través de colas (`mailQueue`, `notifications`), nunca bloqueando la respuesta salvo que sea imprescindible.
- **Logs** con `logger` estructurado; prohibido loguear teléfonos, emails completos, números de documento, tokens o URLs firmadas.
- Secretos con `defineSecret`; configuración con `defineString`/parámetros; nada en código.

## 7. Firestore

- Toda lectura/escritura tipada con *converters* (`withConverter`) generados a partir de los tipos de `@tinhome/shared`.
- `serverTimestamp()` para `createdAt`/`updatedAt`.
- Nunca confiar en datos del cliente para campos calculados (`visible`, `rating`, `premiumUntil`, contadores).
- Cualquier cambio de reglas va con pruebas en `tests/rules`.

## 8. Manejo de errores en el cliente

- `AppError` con `code`; `toUserMessage(error)` → `t('errors.' + code)`; fallback `errors.E_INTERNAL`.
- Errores de red: reintento automático (TanStack Query, 2 intentos con backoff) salvo mutaciones no idempotentes.
- *Error boundary* por ruta con pantalla amable y botón «Reintentar».
- Nunca mostrar trazas ni mensajes técnicos al usuario.

## 9. Comentarios y documentación

- Comenta el **porqué**, no el qué. Referencia IDs del pack: `// BR-15: máx. 1 propuesta pendiente por match`.
- JSDoc en funciones exportadas del dominio y de `core/`.
- `TODO` solo con referencia: `// TODO(DEC-75): sustituir precio cuando se decida`.
- Si cambias comportamiento, actualiza el documento del pack afectado en el mismo commit.

## 10. Pruebas

- Unitarias junto al código (`*.test.ts`) con Vitest; nombres en inglés: `it('creates a match when the like is mutual')`.
- Patrón *Arrange–Act–Assert*; reloj fijo (`2027-03-01T10:00:00+01:00`) en pruebas del dominio.
- Pruebas de callables contra emuladores (`functions/test/*.int.test.ts`).
- Componentes con Testing Library por **rol y texto**, no por clases.
- E2E (Playwright) para los flujos críticos de `09_TESTING_AND_QA.md`.

## 11. Formato, lint y commits

- Prettier (ancho 100, comillas simples, punto y coma, *trailing commas*). ESLint: `typescript-eslint` (strict-type-checked), `react-hooks`, `jsx-a11y`, `import/order`, `i18next/no-literal-string` (web).
- Commits **Conventional Commits** en inglés: `feat(matches): add unmatch confirmation dialog`, `fix(functions): …`, `docs(pack): …`, `test(rules): …`.
- Ramas: `feat/<id>-descripcion`, `fix/<id>-descripcion`.
- Nada se fusiona con lint, typecheck o pruebas en rojo.

## 12. Dependencias

- Antes de añadir una dependencia: ¿lo resuelve ya el stack (`03_TECHNICAL_SPEC.md` §2)? Si no, justificarla en el PR y, si es estructural, crear un ADR.
- Prohibidas: librerías de estado global (Redux, Zustand) sin ADR; moment.js; lodash completo (usar funciones nativas o `es-toolkit` puntual); SDKs de analítica/publicidad de terceros.
