# 07 · ARCHITECTURE DECISION RECORDS

Formato: **Estado · Contexto · Decisión · Alternativas descartadas · Consecuencias**. Los ADR no se editan una vez aceptados: se **sustituyen** con uno nuevo que lo indique. Para proponer uno, copia la plantilla del final.

| ADR | Título | Estado |
|---|---|---|
| ADR-001 | Fase 1 como plataforma de matching sin operativa física | Aceptado |
| ADR-002 | TypeScript estricto con React | Aceptado |
| ADR-003 | Firebase como backend gestionado | Aceptado |
| ADR-004 | Región única `europe-southwest1` | Aceptado |
| ADR-005 | Escrituras solo por callables; lecturas con reglas | Aceptado |
| ADR-006 | Monorepo pnpm con contratos en zod | Aceptado |
| ADR-007 | Sin chat interno: contacto por teléfono/WhatsApp tras el match | **Sustituido por ADR-018** |
| ADR-008 | Verificación de identidad manual, sin biometría, con borrado a 30 días | Aceptado |
| ADR-009 | Stripe Checkout + Portal y derechos Premium multiorigen | Aceptado |
| ADR-010 | Ranking de Descubrir calculado en servidor | Aceptado |
| ADR-011 | Analítica propia sin cookies y patrocinados propios | Aceptado |
| ADR-012 | Tailwind + shadcn/ui + motion con tokens | Aceptado |
| ADR-013 | PWA en lugar de apps nativas | Aceptado |
| ADR-014 | No almacenar la dirección exacta | Aceptado |
| ADR-015 | Fechas de calendario como texto y zona `Europe/Madrid` | Aceptado |
| ADR-016 | Email por adaptador y cola | Aceptado |
| ADR-017 | Ventanas de intercambio y ciudades por estado para la liquidez | Aceptado |
| ADR-018 | Chat en Firestore con escritura por callable | Aceptado |
| ADR-019 | Verificación de ubicación única y minimizada | Aceptado |
| ADR-020 | Web push con Firebase Cloud Messaging | Aceptado |
| ADR-021 | Sentry (UE) para errores del navegador | Aceptado |
| ADR-022 | Detección de fotos duplicadas con dHash e índice por bandas | Aceptado |

---

### ADR-001 — Fase 1 como plataforma de matching sin operativa física
- **Contexto:** el pack v1.x incluía limpieza profesional, caja de llaves, depósito de 200 €, hoteles y seguro. La junta del 08/10/2026 concluyó que el mayor riesgo es la **liquidez** (que coincidan ciudades y fechas), que el presupuesto (< 5.000 €) no cubre la operativa y que el riesgo legal de custodiar dinero y llaves es alto.
- **Decisión:** la Fase 1 es una plataforma de **descubrimiento y match** (HomeExchange + mecánica de deslizar) monetizada con **Premium** y **patrocinados**. Los usuarios cierran el acuerdo directamente. La operativa física pasa a una Fase 2 opcional («Pack Protección»).
- **Alternativas:** lanzar con operativa completa (coste y riesgo altos); solo lista de espera (no valida el match).
- **Consecuencias:** −60 % de alcance aprox.; sin custodia de fondos ni llaves; el diferenciador inicial es la experiencia y la liquidez concentrada. El modelo de datos debe permitir añadir la Fase 2 sin migraciones destructivas.

### ADR-002 — TypeScript estricto con React
- **Contexto:** desarrollo con apoyo de IA; necesidad de contratos fiables entre cliente y servidor (DEC-74).
- **Decisión:** TypeScript con `strict` y opciones adicionales en frontend (React 19 + Vite) y backend (Functions, Node 22).
- **Alternativas:** JavaScript puro (más rápido al principio, más errores en ejecución).
- **Consecuencias:** tipos compartidos en `@tinhome/shared`; el compilador detecta cambios incompatibles de contrato.

### ADR-003 — Firebase como backend gestionado
- **Contexto:** un desarrollador principal que domina React/Node/Firebase; presupuesto mínimo; necesidad de auth (email, Google, teléfono, MFA), base de datos en tiempo real, almacenamiento y funciones.
- **Decisión:** Firebase (Auth + Identity Platform, Firestore, Storage, Functions 2nd gen, Hosting, App Check, Scheduler).
- **Alternativas:** Supabase (SQL potente, pero el equipo no lo domina y el teléfono/MFA requieren más trabajo); servidor Node + PostgreSQL propio (más mantenimiento).
- **Consecuencias:** modelado NoSQL con proyecciones y contadores; consultas complejas en funciones; riesgo de dependencia del proveedor aceptado.

### ADR-004 — Región única `europe-southwest1`
- **Contexto:** datos personales de residentes en España (RGPD); latencia.
- **Decisión:** Firestore, Storage y Functions en `europe-southwest1` (Madrid).
- **Consecuencias:** la región de Firestore es irreversible; fijarla al crear el proyecto. Comprobar disponibilidad de cada servicio en la región; si alguno no lo está, usar `europe-west1` documentándolo en un ADR nuevo.

### ADR-005 — Escrituras solo por callables; lecturas con reglas
- **Contexto:** reglas de negocio con límites, contadores y transacciones (me gusta → match, Premium).
- **Decisión:** el cliente **no escribe** documentos de negocio (salvo `notifications.readAt` y subidas a Storage). Lee directamente lo que las reglas permiten, en tiempo real cuando aporta.
- **Consecuencias:** reglas simples de escritura (todo denegado), validación centralizada, auditoría fiable; algo más de latencia en acciones (mitigada con UI optimista).

### ADR-006 — Monorepo pnpm con contratos en zod
- **Decisión:** `apps/web`, `functions`, `packages/shared`. Los esquemas zod de `shared` son la fuente de verdad de las callables; `openapi.yaml` documenta el contrato y debe mantenerse sincronizado (comprobación en CI recomendada con `zod-to-openapi` en Fase 2).
- **Consecuencias:** un solo `pnpm install`; `functions` debe empaquetar `shared` en el despliegue (bundling con `tsup`/`esbuild`).

### ADR-007 — Sin chat interno *(Sustituido por ADR-018 el 09/10/2026)*
- **Contexto:** el chat exige moderación, almacenamiento de mensajes, notificaciones push y más obligaciones DSA.
- **Decisión:** tras el match se muestra el **teléfono verificado** con botones Llamar y WhatsApp.
- **Alternativas:** chat en Firestore (Fase 2 si las métricas lo justifican).
- **Consecuencias:** menos coste y riesgo; la conversación ocurre fuera, por lo que el **intercambio declarado** (FR-30) es la forma de medir la conversión.

### ADR-008 — Verificación manual sin biometría
- **Contexto:** la AEPD considera de alto riesgo la biometría para identificación; los documentos de identidad son datos muy sensibles.
- **Decisión:** comparación **visual** por una persona; sin reconocimiento facial ni plantillas; visor seguro con marca de agua y auditoría; documentos borrados a los P-13 (30) días de la decisión; solo se conserva el hash con *pepper* del número de documento.
- **Consecuencias:** carga manual para el equipo (aceptable con el volumen del piloto); EIPD obligatoria antes de producción.

### ADR-009 — Stripe Checkout + Portal y derechos multiorigen
- **Decisión:** suscripciones con **Stripe Checkout** (alojado; PCI y SCA resueltos) y **Customer Portal** (cancelación sencilla al final del periodo). El acceso Premium se modela con `entitlements` de varios orígenes (Stripe, fundador, referido, admin) y `premiumUntil` = máximo vigente.
- **Consecuencias:** promociones (fundadores, referidos) sin cupones de Stripe; job J-09 de reconciliación ante webhooks perdidos.

### ADR-010 — Ranking en servidor
- **Decisión:** `getDiscoverDeck` y `searchHomes` filtran (bloqueos, pasos, visibilidad) y puntúan en servidor con funciones puras de `shared/domain/ranking.ts`.
- **Consecuencias:** la lógica de orden no se expone ni se manipula; para > 10.000 casas por ciudad habrá que materializar candidatos (Fase 2).

### ADR-011 — Analítica propia sin cookies y patrocinados propios
- **Contexto:** evitar banner de consentimiento y transferencias a terceros; la publicidad programática es irrelevante con poco tráfico y daña la confianza.
- **Decisión:** eventos de producto vía `trackEvent` a Firestore, sin cookies ni PII; patrocinados gestionados por TinHome con redirección propia que cuenta clics.
- **Consecuencias:** métricas suficientes para el embudo; sin atribución publicitaria avanzada.

### ADR-012 — Tailwind + shadcn/ui + motion con tokens
- **Decisión:** UI con primitivas accesibles (Radix vía shadcn/ui), estilos con Tailwind basados en variables CSS (tokens) y animación de gestos con `motion`.
- **Consecuencias:** cambiar la marca (DEC-62) solo requiere cambiar tokens; componentes accesibles por defecto.

### ADR-013 — PWA en lugar de apps nativas
- **Decisión:** web responsive instalable (manifest, service worker). Sin push nativo en Fase 1 (emails + centro de avisos).
- **Consecuencias:** un solo código; evaluar Capacitor o nativo en Fase 3 según uso móvil.

### ADR-014 — No almacenar la dirección exacta
- **Decisión:** solo ciudad y zona. La dirección se la comunican los usuarios entre ellos.
- **Consecuencias:** menos riesgo ante filtraciones; si la Fase 2 la necesita (limpieza), se añadirá en una subcolección privada.

### ADR-015 — Fechas de calendario como texto
- **Decisión:** disponibilidad e intercambios como `YYYY-MM-DD` (sin hora). Cálculos diarios (límite de me gusta, jobs) en `Europe/Madrid` con `@date-fns/tz`. Reloj inyectable en el dominio.
- **Consecuencias:** sin errores de zona horaria al mostrar fechas; pruebas deterministas.

### ADR-016 — Email por adaptador y cola
- **Decisión:** `EmailProvider` con implementación de consola (dev) y HTTP (prod, proveedor `[PENDIENTE DEC-69]`); envíos encolados en `mailQueue`.
- **Consecuencias:** cambiar de proveedor sin tocar la lógica; reintentos y trazabilidad.

### ADR-017 — Ventanas de intercambio y ciudades por estado
- **Contexto:** sin coincidencia de ciudad y fechas no hay intercambio.
- **Decisión:** ventanas definidas por TinHome (Semana Santa, puentes, quincenas) + fechas flexibles; ciudades en `WAITLIST` hasta alcanzar el umbral; demanda visible.
- **Consecuencias:** el matching favorece «Encaje perfecto»; el lanzamiento se controla por ciudad.

### ADR-018 — Chat en Firestore con escritura por callable
- **Contexto:** la junta técnica (09/10/2026) decidió chat gratis tras el match y me gusta con mensaje para Premium; compartir el teléfono pasa a ser voluntario.
- **Decisión:** mensajes en `matches/{id}/messages`, lectura en tiempo real por reglas, escritura por la callable `sendMessage` (`minInstances: 1`) para validar participantes, bloqueos, retenciones, longitud y ritmo, y para mantener contadores en una transacción.
- **Alternativas:** escritura directa desde el cliente con reglas (menos latencia, pero sin límite de ritmo fiable ni contadores consistentes); servicio de chat externo (coste, datos fuera de la UE).
- **Consecuencias:** ~200–400 ms por envío, ocultados con UI optimista; coste fijo pequeño por la instancia mínima; moderación solo sobre mensajes denunciados.

### ADR-019 — Verificación de ubicación única y minimizada
- **Contexto:** evitar casas publicadas con fotos de otra vivienda; la ubicación es un dato personal.
- **Decisión:** una comprobación desde el móvil en la casa, contra el radio de la ciudad; se guarda el resultado y coordenadas redondeadas a ~1 km durante 30 días. No se usa la ubicación de cada foto (el EXIF se sigue eliminando).
- **Consecuencias:** fricción baja y una señal antifraude razonable; se puede falsear con herramientas, por eso se combina con documentos, fotos duplicadas y denuncias.

### ADR-020 — Web push con FCM
- **Decisión:** FCM web push con permiso solicitado en contexto (tras el primer match). En iOS solo con la PWA instalada.
- **Consecuencias:** sin app nativa; si no hay push, email resumen (J-13).

### ADR-021 — Sentry (UE) para errores del navegador
- **Decisión:** `@sentry/react` con ingesta en la UE, sin PII y con *scrubbing*; requiere contrato de encargado.
- **Alternativas:** endpoint propio (menos funcionalidad, más trabajo).
- **Consecuencias:** visibilidad de fallos en móviles reales desde el primer día.

### ADR-022 — dHash e índice por bandas para fotos duplicadas
- **Decisión:** huella dHash de 64 bits por foto; índice en 8 bandas de 8 bits; umbral de Hamming P-36 ≤ 7.
- **Consecuencias:** detección barata dentro de la plataforma; no cubre fotos copiadas de portales externos.

---

### Plantilla

```
### ADR-0XX — Título
- **Estado:** Propuesto | Aceptado | Sustituido por ADR-0YY
- **Fecha:** DD/MM/AAAA
- **Contexto:**
- **Decisión:**
- **Alternativas descartadas:**
- **Consecuencias:**
```
