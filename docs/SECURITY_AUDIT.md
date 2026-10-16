# Auditoría de seguridad previa a producción — TinHome Fase 1

| Campo | Valor |
|---|---|
| Fecha | 16/10/2026 |
| Rama | `feat/m10-hardening` (copia en `claude/clever-darwin-uyw8yd`) |
| Referencias | OWASP Top 10 (2021) · OWASP ASVS 4.0.3 (V1–V14) |
| Alcance | `apps/web`, `functions`, `packages/shared`, `firestore.rules`, `storage.rules`, `firebase.json`, `scripts/` (seed, roles, Identity Platform, GCP), `.github/workflows`, dependencias del monorepo |
| Entorno de pruebas dinámicas | **Solo emuladores locales** (`demo-tinhome`). No se ha tocado ningún proyecto real: no existen todavía staging ni producción con credenciales |
| Veredicto | **NO AUTORIZADO para producción todavía** (ver §6). Sin vulnerabilidades críticas ni altas abiertas en el código; quedan verificaciones esenciales que solo se pueden hacer en staging |

## 1. Método y herramientas (todo ejecutado, con resultado real)

| Comprobación | Herramienta | Resultado |
|---|---|---|
| Análisis estático de seguridad (SAST) | Semgrep 1.181 con las reglas oficiales `semgrep-rules` (javascript, typescript, generic/secrets, github-actions): 444 reglas, 455 ficheros | 784 avisos: 720 de estilo i18n y 64 revisados uno a uno; **ningún positivo real** (HTML de emails ya escapado con `escapeHtml`, `confirm()` es una función propia, `NOTICE_TITLE[kind]` con enum cerrado) |
| Lint y tipos | ESLint (typescript-eslint estricto) · `tsc --strict` | Ver §5 |
| Revisión manual de código | 3 revisiones en paralelo (autorización/IDOR/reglas · entradas/inyección/archivos · configuración/abuso/logs/datos) más verificación propia de cada hallazgo | 32 hallazgos (§3 y §4) |
| Auditoría de dependencias | `pnpm audit` y `pnpm audit --prod` | Producción: **0 vulnerabilidades** tras la corrección. Desarrollo: 5 en herramientas que no se despliegan (§4) |
| Secretos | `git grep` de patrones de claves (Stripe, Google, AWS, GitHub, claves privadas, `whsec_`) en **todo el historial** (31 commits) y en los ficheros versionados | Ningún secreto real. Solo `sk_test_dummy` en pruebas. `.env*` ignorado; `.env.example` sin secretos |
| Pruebas de reglas | `@firebase/rules-unit-testing` contra el emulador | Ver §5 |
| Pruebas de integración | Callables contra emuladores de Auth, Firestore y Storage | Ver §5 |
| Pruebas dinámicas (DAST) | `curl` contra el emulador de Functions con usuarios del seed: 17 sondas (sin sesión, token falso, roles, IDOR, inyección NoSQL, path traversal, prototype pollution, asignación masiva, cuerpo de 12 MB, campos largos, XSS, redirección, método, webhook sin firma) y suplantación de IP con `X-Forwarded-For` | Todas con la respuesta esperada (401/403/400/405/302 a dominio propio) |
| Cabeceras HTTP | Build de producción servido por el emulador de Hosting, `curl -I` de `/`, `/entrar`, `/registro`, `/app/*`, `/admin`, `/legal/*`, `/assets/*`, `/sw.js` | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy y COOP en todas; caché correcta (§3, hallazgo 23) |
| Presupuesto de bundle | `pnpm --filter @tinhome/web size` | 212,7 KB (límite 250) y 279,1 KB shell (límite 300) |

## 2. Resumen

| Severidad | Encontradas | Corregidas y verificadas | Corregidas, pendientes de verificar en staging | Riesgo residual aceptado |
|---|---|---|---|---|
| Crítica | 0 | — | — | — |
| Alta | 1 | 1 | — | — |
| Media | 13 | 9 | 4 (configuración de nube) | — |
| Baja | 14 | 10 | 1 | 3 |
| Informativa | 4 | 3 | — | 1 |

## 3. Hallazgos corregidos

Columnas: **Sev.** severidad · **Evidencia** lo que se observó · **Corrección** · **Verificación** cómo se comprobó (resultado real).

| # | Vulnerabilidad (OWASP / ASVS) | Sev. | Archivo y línea | Evidencia | Corrección aplicada | Verificación |
|---|---|---|---|---|---|---|
| 1 | Sesiones revocadas, cuentas expulsadas o borradas seguían funcionando hasta 1 h (A07 · V3.3.1, V3.3.3) | **Alta** | `functions/src/core/callable.ts:38`, `functions/src/core/privileged-session.ts:43` | El SDK de Functions verifica el token sin `checkRevoked`; solo las cuentas admin tenían comprobación viva. Expulsión, baja y «cerrar sesión en todos los dispositivos» no cortaban el token ya emitido | Toda callable con sesión comprueba en Auth que la cuenta existe, está habilitada y que el token es posterior a la última revocación (`E_REAUTH_REQUIRED`); caché de 30 s por instancia, que se borra en la instancia que revoca. La web refresca el token y, si la sesión ya no vale, cierra sesión (`apps/web/src/app/auth/AuthProvider.tsx:41`) | `privileged-session.int.test.ts`: token anterior a la revocación rechazado, expulsión efectiva al instante, cuenta inexistente rechazada; DAST 1–2 (401) |
| 2 | Límites por IP evitables con `X-Forwarded-For` falso (A04/A07 · V11.1.4) | Media | `functions/src/core/rate-limit.ts:50` | El framework de Functions activa `trust proxy` (`@google-cloud/functions-framework` 5.0.5, `server.js:89`): `req.ip` es la **primera** entrada de XFF, que escribe el cliente. Lista de espera, denuncias, reclamaciones y FAQ se podían inundar rotando la cabecera | Se usa la **última** entrada (la que añade el frontal de Google), validada como IP | `rate-limit.test.ts`; DAST en emulador: con la primera entrada rotando y la última fija, bloqueado en la petición 11 (límite 10). **PENDIENTE** confirmar el formato de XFF tras el frontal real en staging |
| 3 | El equipo podía leer el inicio del último mensaje de cualquier chat (A01 · V4.2.1, regla «el equipo no lee chats») | Media | `firestore.rules:24` | `matches` permitía lectura a `isAdmin()` y el documento lleva `lastMessage.text` | Lectura solo para participantes | `tests/rules/match.test.ts`: admin no lee el match ni lista `matches` |
| 4 | Un mensaje ocultado por moderación seguía llegando al destinatario (A01 · V4.2.1) | Media | `functions/src/modules/moderation/moderate.ts:169` | Solo se marcaba `hiddenByModeration`; el texto seguía en el documento que los participantes leen | Al ocultar se vacía el texto (y la vista previa si era el último) y el original se guarda solo en servidor (`hiddenMessages`), restaurable y purgado con el chat (J-14) | `security.int.test.ts` («hiding a message…») |
| 5 | Cuentas suspendidas podían confirmar intercambios y compartir o leer teléfonos; un denunciante suspendido podía provocar retenciones preventivas (A01 · V4.1.3) | Media | `functions/src/modules/exchange/service.ts:250`, `functions/src/modules/match/chat.ts:176`, `functions/src/modules/moderation/reports.ts:174` | El contrato exige `ACT` en `respondExchange`, `sharePhoneInChat` y `getMatchContact`; no se comprobaba. `shouldHold` solo miraba la identidad del denunciante | Comprobación de cuenta activa en las tres. Un denunciante no activo puede denunciar (como cualquier visitante) pero no dispara retención | `security.int.test.ts`: suspendido → `E_ACCOUNT_SUSPENDED` en las tres; denuncia de suspendido sin retención |
| 6 | Un admin podía expulsar a un superadmin, a otro admin o a sí mismo (A01 · V4.1.5) | Media | `functions/src/modules/moderation/moderate.ts:314` | Sin comprobación del rol del objetivo en `adminModerate` / `adminSetUserStatus` | Acciones restrictivas sobre cuentas del equipo solo por superadmin (rol leído en Auth); nadie se sanciona a sí mismo | `security.int.test.ts` («sanctions on staff accounts») |
| 7 | Cualquier usuario verificado leía el documento completo de cualquier casa visible, también la de quien le había bloqueado (A01 · V4.2.1, BR-10) | Media | `firestore.rules:20` | El documento incluye datos de moderación y verificación (`locationCheck.decidedBy`, `photoChangeLog`, hashes); la web solo lo usa para la casa propia | Lectura solo para el propietario y el equipo; el resto va por `getHomeDetail` y el mazo, que aplican bloqueos y campos públicos | `tests/rules/home.test.ts` y E2E completos (§5) |
| 8 | Sin tope de instancias: coste ilimitado ante una inundación de peticiones o subidas (A04 · V11.1.4) | Media | `functions/src/core/options.ts:28` | Sin `maxInstances` en ninguna función; el trigger de fotos usa 1 GiB por subida | `setGlobalOptions` y topes por tipo (callables 20, HTTP 10, triggers 10, fotos 5) | Tipos y pruebas en verde. **PENDIENTE** comprobar los topes en el despliegue de staging |
| 9 | Procesado de fotos: sin límite de píxeles (bomba de descompresión), cualquier formato que libvips decodifique (SVG, TIFF…), ficheros huérfanos si fallaba la decodificación, carrera que superaba el máximo de fotos (A04/A08 · V12.1, V12.2) | Media | `functions/src/modules/home/photos.ts:25` | `sharp()` sin `limitInputPixels` (por defecto ~268 Mpx) y error de decodificación fuera del `try` | `limitInputPixels` de 40 Mpx, solo jpeg/png/webp/heif, todo el pipeline en `try` con limpieza y máximo de fotos comprobado dentro de la transacción | `home.int.test.ts`: SVG disfrazado, JPEG truncado y PNG de 64 Mpx rechazados sin dejar nada en Storage |
| 10 | Documentos de identidad y exportaciones RGPD «borrados» recuperables 30 días por el versionado del bucket (V8.3.8, RGPD art. 17) | Media | `scripts/ops/configure-gcp.sh:46` | Versionado con borrado de versiones antiguas a 30 días para todo el bucket | Las versiones no vigentes de `private/` se borran al día siguiente | Sintaxis comprobada (`bash -n`). **PENDIENTE** aplicar con `APPLY=1` en cada proyecto |
| 11 | Lecturas de datos personales por el equipo sin rastro (búsqueda por email o teléfono, ficha, denuncias, CSV) (A09 · V7.1.3) | Media | `functions/src/modules/admin/callables.ts:71` (y `moderation/callables.ts`) | Solo se auditaban las acciones, no las consultas | `user.search` (solo el hash de la búsqueda), `user.view`, `report.view`, `export.csv` en `auditLog` | `security.int.test.ts` (sin el email en el registro) |
| 12 | Identity Platform sin restricción de región de SMS ni reCAPTCHA: SMS pumping a números de tarificación especial y password spraying contra la API de Auth (A07 · V2.2.1) | Media | `scripts/configure-auth.ts:41` | El script aplicaba política de contraseñas, protección contra enumeración y MFA, nada más | SMS solo a España; reCAPTCHA Enterprise en contraseña y teléfono en modo **AUDIT**, con protección de fraude de SMS | Tipos comprobados. **PENDIENTE** aplicar (`pnpm ops:auth`, `APPLY=1`) y pasar a ENFORCE cuando staging confirme que la web envía los tokens |
| 13 | Funciones con la cuenta de servicio por defecto (suele tener Editor del proyecto) (A05 · V14.1.1, mínimo privilegio) | Media | `functions/src/core/options.ts:19` y `scripts/ops/configure-gcp.sh` | Ninguna opción `serviceAccount` ni paso de IAM | Cuenta `tinhome-functions` con roles mínimos (Firestore, Auth, bucket, secretos uno a uno, firma de URLs) y `FUNCTIONS_SERVICE_ACCOUNT` en las opciones globales | **PENDIENTE** aplicar en staging y retirar Editor de la cuenta por defecto |
| 14 | Dependencia vulnerable en ruta de producción: `@grpc/grpc-js` 1.9.16 vía `firebase` → `@firebase/firestore` (GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4) (A06) | Media | `pnpm-workspace.yaml:17` | `pnpm audit --prod`: 1 alta + 1 baja | `overrides` a 1.13.6 (misma versión mayor) | `pnpm audit --prod`: 0. Reglas, integración y E2E en verde con la versión nueva (el SDK usa gRPC en Node) |
| 15 | Clics de patrocinados inflables con un bucle de peticiones (fraude de métricas, coste de escrituras) | Baja | `functions/src/modules/sponsored/service.ts:189` | `/r/{id}` escribía un documento por petición sin límite | Siempre redirige, pero cuenta como mucho 5 clics por IP, partner y hora | `sponsored.int.test.ts` (8 peticiones → 5 contadas) |
| 16 | «Deshacer» ilimitado para cuentas gratis (función Premium) con un `sessionId` nuevo por llamada (lógica de negocio, V11.1.1) | Baja | `functions/src/modules/discover/service.ts:278` | El contador se guardaba por el `sessionId` que elige el cliente | El servidor usa `auth_time` del token (un inicio de sesión = una sesión); `sessionId` se ignora | `discover.int.test.ts` |
| 17 | Identificadores con `/` llegaban a rutas de Firestore (`matches/${id}`): podían direccionar subcolecciones (A03 · V5.1.3) | Baja | `packages/shared/src/schemas/common.ts:18` | Solo se validaba la longitud. Sin exposición de datos encontrada | `DocId` (`[A-Za-z0-9_-]{1,256}`) en todos los identificadores de entrada; `matchId/messageId` solo en denuncias de mensajes | `security.int.test.ts`; DAST 5–7 (400) |
| 18 | `cursor` numérico sin límite: hacer saltar al servidor millones de documentos (facturados) (A04) | Baja | `functions/src/core/pagination.ts:5` | `Number(input.cursor)` directo a `.offset()` | Desplazamiento máximo 1000 | `pagination.test.ts` |
| 19 | Rutas de adjuntos sin formato estricto y capturas de denuncias que sobrevivían a la baja (V12.3.1, RGPD) | Baja | `packages/shared/src/schemas/common.ts:21`, `functions/src/modules/privacy/deletion.ts` | Solo `startsWith`; la purga omitía `private/reports/{uid}/` | Patrón exacto `private/reports/{uid}/{uuid}`; la baja purga esa carpeta | Tipos y pruebas en verde. La purga, por revisión de código |
| 20 | Ruta de avatares escribible por cualquier usuario sin procesado (alojamiento gratuito, EXIF/GPS) (V12.1.1) | Baja | `storage.rules` (regla eliminada) | Nada de la app usaba `avatars/` | Regla eliminada (denegación por defecto) | `tests/rules/home.test.ts` |
| 21 | `PUBLIC_URL` y `STORAGE_BUCKET` con valores por defecto peligrosos (localhost, bucket adivinado) (A05) | Baja | `functions/src/core/public-url.ts:11`, `functions/src/core/storage.ts:10` | Sin variable, emails y URLs de Stripe apuntaban a localhost | Fuera del emulador: error si falta `PUBLIC_URL`; el bucket sale de `FIREBASE_CONFIG` | Pruebas en verde (emulador) |
| 22 | CORS aceptaba cualquier sitio `*.web.app` / `*.firebaseapp.com` (A05 · V14.5.3) | Baja | `functions/src/core/options.ts:19` | Expresión regular abierta a sitios de terceros | Orígenes exactos del proyecto más `CORS_ORIGINS` | Tipos. **PENDIENTE** comprobar el preflight en staging |
| 23 | HTML de rutas de la SPA con la caché por defecto: tras un despliegue con un parche de seguridad, clientes con HTML viejo (A05) | Baja | `firebase.json:106` | Solo `/index.html` y `/app.html` tenían `no-cache` (Hosting compara con la ruta pedida) | `no-cache` en `/`, rutas sin extensión y páginas prerenderizadas | Emulador de Hosting: `no-cache` en `/`, `/entrar`, `/registro`, `/app/*`, `/legal/*`; `immutable` en `/assets/*` |
| 24 | CI con permisos por defecto del token y acciones fijadas por etiqueta (A08, cadena de suministro) | Baja | `.github/workflows/ci.yml:10` | Sin `permissions:`; `actions/*@v4` | `permissions: contents: read` y acciones fijadas por SHA de commit | Formato comprobado; los SHA resueltos con `git ls-remote` |
| 25 | Logo de partner con URL `//host` (carga de recursos de terceros) | Baja | `packages/shared/src/schemas/sponsored.ts:7` | La regex de rutas propias aceptaba `//evil.example/x.png` | Se rechaza la doble barra | Tipos; revisión de la expresión |
| 26 | Fotos de casas en la caché del service worker tras cerrar sesión (dispositivo compartido) | Info | `apps/web/src/lib/pwa.ts:17` | La caché `tinhome-images-*` persistía | Se borra cuando la sesión termina | Tipos y lint; prueba manual **PENDIENTE** en un navegador con el build |
| 27 | El despliegue subía `test/`, `.tmp/` y logs de `functions/` | Info | `firebase.json` (`functions.ignore`) | Lista de exclusión incompleta | Añadidos | Revisión |
| 28 | Opciones por callable ignoradas (`timeoutSeconds`, `memory` de exportaciones) (disponibilidad) | Info | `functions/src/core/callable.ts:30` | `defineCallable` no fusionaba `options` | Se fusionan | Tipos e integración en verde |

Antes de esta auditoría ya se habían corregido (revisión de acceso del 15/10/2026, `10 §5`): política de contraseñas aplicada en servidor, comprobación viva de las sesiones admin y revocación al cambiar un rol.

## 4. Riesgos residuales (no corregidos, con motivo)

| # | Riesgo | Sev. | Motivo y mitigación |
|---|---|---|---|
| R1 | Las reglas de Firestore deciden el rol admin con el token: un admin degradado puede leer desde el SDK colecciones del equipo (`reports`, `verifications`, `users`…) hasta 1 h | Baja | `adminSetRole` revoca sus sesiones (no puede renovar el token) y todas las callables comprueban el rol en vivo. Recomendación: mover las lecturas del panel a callables y dejar en reglas solo `adminAlerts` |
| R2 | `publicProfiles` lo puede leer cualquier usuario verificado, también alguien bloqueado | Baja | Solo nombre visible y datos públicos de perfil; la ficha y el mazo sí aplican el bloqueo. Revisar cuando haya avatares |
| R3 | Vulnerabilidades en dependencias de **desarrollo**: `basic-ftp`, `braces` (alta), `uuid`, `@opentelemetry/core` (moderada) vía `firebase-tools`; `esbuild` (baja) vía `tsup` | Baja | No se despliegan ni procesan entradas externas (CLI y build local). `braces` no tiene versión corregida. Revisar al actualizar `firebase-tools` |
| R4 | `moderationActions.adminUid` visible para la persona sancionada; nombres sin filtro de URLs en asuntos de email | Info | Sin impacto directo; anotado para Fase 2 |

## 5. Pruebas ejecutadas en la versión final

| Suite | Resultado |
|---|---|
| Lint (ESLint + Prettier) | Sin errores ni avisos (`--max-warnings 0`) |
| Tipos (`tsc` estricto, 3 paquetes) | Sin errores |
| Unitarias (shared · functions · web) | 313 en verde (136 shared · 34 functions · 143 web) |
| Integración (callables contra emuladores) | 154 en verde (6 de ellas en `security.int.test.ts`) |
| Reglas de Firestore y Storage | 54 en verde |
| E2E Playwright (incluye accesibilidad en 3 temas) | 21 en verde |
| `pnpm audit --prod` | 0 vulnerabilidades |
| DAST en emulador (17 sondas + XFF + cabeceras) | Todas con el resultado esperado |

Nuevas pruebas de regresión: `functions/test/security.int.test.ts`, `functions/src/core/rate-limit.test.ts`, `functions/src/core/pagination.test.ts`, casos añadidos en `privileged-session.int.test.ts`, `home.int.test.ts`, `discover.int.test.ts`, `sponsored.int.test.ts`, `tests/rules/match.test.ts` y `tests/rules/home.test.ts`.

## 6. Veredicto y condiciones para autorizar producción

**No se autoriza todavía el paso a producción.** El código no tiene vulnerabilidades críticas ni altas abiertas, no hay secretos expuestos y los controles de acceso están probados. Pero faltan **pruebas esenciales que solo se pueden hacer en un entorno real**, que la petición exige no dar por buenas sin ejecutar:

| # | Control PENDIENTE | Cómo cerrarlo |
|---|---|---|
| P1 | App Check **forzado** en Firestore, Storage y Functions con reCAPTCHA Enterprise | Consola de Firebase tras ver tráfico verificado en las métricas |
| P2 | Identity Platform aplicado (contraseñas, enumeración, MFA, SMS solo ES, reCAPTCHA AUDIT → ENFORCE) | `GCLOUD_PROJECT=… pnpm ops:auth` y `APPLY=1`; probar registro y SMS |
| P3 | IP real tras el frontal de Google (formato de `X-Forwarded-For`) | En staging, llamar a una callable con XFF falso y comprobar en `rateLimits` que cuenta la IP real |
| P4 | Cuenta de servicio de mínimo privilegio y retirada de Editor | `scripts/ops/configure-gcp.sh` con `APPLY=1`; `FUNCTIONS_SERVICE_ACCOUNT` en `functions/.env.<proyecto>` |
| P5 | Copias, PITR, TTL, ciclo de vida de `private/` y **ensayo de restauración** | `configure-gcp.sh` + `docs/runbooks/backups-and-restore.md` |
| P6 | Cabeceras y CSP en el dominio real (HTTPS, HSTS, `upgrade-insecure-requests`) | `curl -I https://<dominio>/` y observatorio de cabeceras |
| P7 | CORS de las callables desde el dominio real y rechazo de otro origen | Preflight con `Origin` ajeno |
| P8 | Alertas de monitorización (errores, webhook, picos de `E_RATE_LIMIT` y `E_REAUTH_REQUIRED`) | `configure-gcp.sh` + políticas de alerta en Cloud Monitoring |
| P9 | Topes de instancias y presupuesto de facturación con alertas | Consola tras el primer despliegue |
| P10 | Textos legales definitivos y validación del mecanismo de consentimiento por el abogado | Fuera del código (10 §3) |

Cuando P1–P9 estén hechos y registrados en `docs/runbooks/deploy-and-launch.md`, y la E2E pase **contra staging**, se puede repetir esta auditoría en su parte dinámica y autorizar.
