# 10 · DECISIONES Y PENDIENTES

| Campo | Valor |
|---|---|
| Versión | 2.0 · 08/10/2026 |

> **Para agentes de IA:** las decisiones `[PENDIENTE]` **no bloquean** el desarrollo: implementa con el valor por defecto y parametrizado. Nunca inventes un valor definitivo para un pendiente; si lo necesitas, pregunta. Registra aquí cualquier contradicción que encuentres.

## 1. Decisiones vigentes para la Fase 1

| DEC | Decisión | Fecha |
|---|---|---|
| DEC-12 | Nombre: **TinHome** | 24/09/2026 |
| DEC-24 | Verificación de identidad **manual** (DNI/NIE + selfie), mayores de 18 | 24/09/2026 |
| DEC-26 | ~~Sin chat~~ **Sustituida por DEC-84** | 24/09/2026 |
| DEC-32 | Valoraciones mutuas 1–5 publicadas a la vez (doble ciego) | 24/09/2026 |
| DEC-47 | Controles sociales: quitar me gusta, deshacer match, bloquear, denunciar | 24/09/2026 |
| DEC-52 | React + Firebase + Stripe, monolito modular | 24/09/2026 |
| DEC-53 | Solo español; textos fuera del código | 24/09/2026 |
| DEC-66 | Selfie comparada visualmente, sin biometría | 25/09/2026 |
| DEC-71 | Inquilinos: **autorización escrita del arrendador** obligatoria | 08/10/2026 |
| DEC-74 | **TypeScript** estricto con React (frontend) y en Functions | 08/10/2026 |
| DEC-76 | **Modelo Fase 1:** plataforma de matching (HomeExchange + deslizar); acuerdos directos entre usuarios; ingresos por Premium y patrocinados; operativa física en Fase 2 (ADR-001) | 08/10/2026 |
| DEC-77 | Ventanas de intercambio + fechas flexibles (ADR-017) | 08/10/2026 |
| DEC-78 | Socios fundadores: 100 por ciudad, 12 meses de Premium (P-08, P-09) | 08/10/2026 |
| DEC-79 | Referidos: 30 días de Premium para ambos al verificarse el invitado (P-10) | 08/10/2026 |
| DEC-80 | Umbral de apertura por ciudad: 150 casas verificadas (P-12) | 08/10/2026 |
| DEC-62 | **Identidad visual:** logo del Founder; colores corporativos Violeta `#8257E5`, Azul `#0A6CF0`, Azul Cielo `#2191FC`, Violeta Profundo `#6440CB` y degradado violeta→azul; tipografías Nunito + Inter (`11_BRAND_GUIDELINES.md`) | 09/10/2026 |
| DEC-82 | Tres temas: **claro, oscuro y negro (OLED)**, seleccionables (Sistema/Claro/Oscuro/Negro) | 09/10/2026 |
| DEC-84 | **Chat de texto gratis tras el match**; Premium puede enviar **me gusta con mensaje** antes del match (P-27) (ADR-018) | 09/10/2026 |
| DEC-85 | El **teléfono solo se comparte si el usuario quiere**, desde el chat | 09/10/2026 |
| DEC-86 | **Verificación de ubicación única desde la casa**, obligatoria para ser visible; se guarda solo el resultado (ADR-019) | 09/10/2026 |
| DEC-87 | **Advertencias con escalado** (advertencia → suspensión 7 días → expulsión, siempre confirmado por admin) y **retención preventiva** ante denuncias graves; aviso inmediato a admin | 09/10/2026 |
| DEC-88 | Centro de ayuda (FAQ), quejas y reclamaciones con número de seguimiento, web push, detección de fotos duplicadas, copias de seguridad y Sentry UE (junta técnica) | 09/10/2026 |

## 2. Decisiones sustituidas o aplazadas a la Fase 2

| DEC | Estado |
|---|---|
| DEC-01 (solo simultáneos y recíprocos) | En Fase 1 TinHome **no impone** la modalidad: los usuarios acuerdan. Las ventanas favorecen la simultaneidad. |
| DEC-04, DEC-07, DEC-09, DEC-10, DEC-14–17, DEC-36–44, DEC-51, DEC-56, DEC-64, DEC-65 | Operativa física, depósito y hoteles → **Fase 2** (Pack Protección). |
| DEC-11 (póliza colectiva) y DEC-72 (cargo adicional) | **Fase 2.** En Fase 1 no se anuncia ninguna cobertura. |
| DEC-19 (pagar para dar me gusta) | Sustituida por freemium con **me gusta diarios gratis** y Premium para visibilidad y ventajas. `[CONFIRMAR con el Founder]` |
| DEC-35 / DEC-73 (baja diferida) | **Ya no aplica**: sin intercambios gestionados, la baja de Premium es al final del periodo, sin permanencia. |

## 3. Pendientes

| ID | Tema | Valor por defecto en el código | Responsable | ¿Bloquea lanzamiento? |
|---|---|---|---|---|
| DEC-75 | Precios Premium (mensual/anual) | 9,99 €/mes y 79 €/año, IVA incluido (P-21, P-22) | Founder | Sí |
| DEC-63 | Reembolso por desistimiento | `FULL` (P-07) | Abogado | Sí |
| DEC-69 | Proveedor de email (servidores en la UE) | `ConsoleEmailProvider` en dev; `HttpEmailProvider` configurable | Founder | Sí |
| DEC-83 | Versión vectorial (SVG) del logo | PNG de alta resolución en `assets/brand/` | Founder + diseño | No |
| DEC-61 / P-17 | Plazo de conservación de moderación y datos tras la baja | 5 años bloqueados | Abogado | Sí (privacidad) |
| DEC-57 | Metas de validación | Las de `01_PRD.md` §2 | Founder | No |
| DEC-81 | Ciudades del corredor piloto | Madrid ⇄ Valencia (seed) | Founder | Sí |
| LEG-01 | ¿Aplica el registro de viajeros (RD 933/2021) al intercambio? | No implementado; modelo de datos ampliable | Abogado | Sí |
| LEG-02 | ¿Aplica DAC7 (intercambio como contraprestación en especie)? | No implementado | Asesoría fiscal | Sí |
| LEG-03 | Textos legales definitivos (todos los `legalDocs`) | Borradores marcados «PROVISIONAL» | Abogado | Sí |
| LEG-04 | Validación de patrocinados de seguros | Bloqueados (P-26 = false) | Abogado | No |
| LEG-05 | EIPD de la verificación de identidad **y de ubicación**, y conservación de chats | — | Founder + DPO/abogado | Sí |
| LEG-06 | Plazo máximo de respuesta a quejas y vías oficiales de reclamación a mostrar | 15 días (P-38) | Abogado | Sí |
| LEG-07 | Conservación de mensajes tras cerrar el chat | 12 meses (P-39) | Abogado | Sí |
| LEG-08 | Contrato de encargado con Sentry (UE) y con FCM (Google) | — | Founder | Sí |

## 4. Fase 2 y siguientes (no implementar ahora)

- **Pack Protección (opcional, de pago por intercambio):** limpieza con informe fotográfico, entrega de llaves y caja con código, depósito, cargo adicional y póliza colectiva. Especificación detallada disponible en el **pack v1.2** (BR-018 a BR-060, DEC-11, DEC-71, DEC-72) para reutilizarla.
- Chat interno (si las métricas muestran pérdida de conversión fuera de la app).
- Intercambios no recíprocos (exige revisar DAC7 y el régimen de alquiler).
- Notificaciones push, app nativa, mapa, varios idiomas, más países.
- Materialización de candidatos para el ranking a gran escala.

## 5. Contradicciones detectadas

| Fecha | Documentos | Descripción | Resolución |
|---|---|---|---|
| 09/10/2026 | `10_DECISIONS` §4 ↔ DEC-84, DEC-88 | §4 sigue listando «Chat interno» y «Notificaciones push» como Fase 2, pero DEC-84 (chat) y DEC-88 (web push) los incluyen en Fase 1. | Se sigue DEC-84/DEC-88 y `CLAUDE.md` (chat y push son Fase 1). Pendiente de limpiar §4. |
| 09/10/2026 | `07_ADR` ADR-013 ↔ ADR-020 | ADR-013 dice «Sin push nativo en Fase 1»; ADR-020 introduce web push con FCM. | Prevalece ADR-020 (más reciente). Proponer marcar ADR-013 como parcialmente sustituido. |
| 09/10/2026 | `04_DATABASE_SCHEMA` §3 ↔ `03_TECHNICAL_SPEC` §5.5 | El esquema atribuye la purga de mensajes de chats cerrados a J-05; la spec la asigna a J-14. | Se implementará como J-14 (spec técnica). |
| 09/10/2026 | `03_TECHNICAL_SPEC` §2 («última estable») | TypeScript 7.0 es la última estable pero `typescript-eslint` solo admite `< 6.1`; `eslint-plugin-jsx-a11y` no admite ESLint 10. | Se fija **TypeScript 6.0** y **ESLint 9** hasta que el ecosistema los soporte. |
| 09/10/2026 | `03_TECHNICAL_SPEC` §2 (Sentry `sendDefaultPii: false`) | Sentry v11 eliminó `sendDefaultPii`. | Se usa `dataCollection` con todo desactivado + `beforeSend` con limpieza (misma intención, NFR-13). |
| 09/10/2026 | `assets/brand/tokens.css` | Para previsualizar el tema claro dentro de un contenedor oscuro (ThemeSwitcher, `/dev/brand`) hace falta poder anidar el tema claro. | Se añadió el selector `[data-theme='light']` junto a `:root` (sin cambiar ningún color). |
| 09/10/2026 | `03_TECHNICAL_SPEC` §5.1 (CORS) | No está decidido el dominio público de producción. | CORS admite `*.web.app`/`*.firebaseapp.com` y orígenes extra por `CORS_ORIGINS`. **Pregunta abierta:** ¿dominio definitivo? (Sin respuesta del Founder: opción conservadora, no se asume ningún dominio propio.) |
| 09/10/2026 | `11_BRAND_GUIDELINES` §2–3 ↔ NFR de rendimiento (Lighthouse ≥ 90 en M1) — **actualizado en M1, ver fila «Logos WebP»** | Los PNG oficiales del logo pesan 200–570 KB; usarlos tal cual penaliza el LCP. Generar versiones redimensionadas no está previsto en el manual. | Opción conservadora (Founder no disponible): en M0 se usan los PNG oficiales sin modificar. En M1, si Lighthouse lo exige, se propondrán derivados **solo redimensionados** (sin redibujar ni recolorear) y se pedirá validación; mientras, pendiente DEC-83 (SVG). |
| 09/10/2026 | `CLAUDE.md` §3 ↔ entorno | No hay herramientas globales instaladas (Firebase CLI). | `firebase-tools` es dependencia de desarrollo en la raíz; los scripts usan `pnpm exec firebase`. |
| 09/10/2026 | `08_IMPLEMENTATION_PLAN` M0 (DoD: Sentry y alertas de presupuesto) | Ambos requieren cuentas reales (Sentry UE con DPA; Cloud Billing de `tinhome-staging`/`prod`) que no existen todavía. | Integración de Sentry hecha y desactivada sin `VITE_SENTRY_DSN`; alertas de presupuesto anotadas como tarea manual al crear los proyectos. M0 se da por cerrado con estos dos puntos pendientes fuera del código. |
| 09/10/2026 | M1 · S-01 ↔ plan M1 | La landing pide CTA «Crear cuenta gratis», pero el registro llega en M2 («landing completa, sin registro aún»). | CTA principal «Apúntate a la lista de espera» → `/lista-espera`. Cambiar a «Crear cuenta gratis» en M2. |
| 09/10/2026 | M1 · S-01 pie ↔ hitos M2/M9 | El pie debe enlazar «Denunciar contenido» (`/denunciar`, M9) y Ayuda (`/ayuda`, M2), que aún no existen. | «Denunciar contenido» apunta a `/legal/info-dsa` (punto de contacto DSA) hasta M9 (`TODO(M9)` en `PublicLayout`). Ayuda se añadirá en M2. Nunca enlaces rotos. |
| 09/10/2026 | M1 · `02_UX` §2.2 | El doble opt-in necesita una página de aterrizaje que no está en la tabla de rutas. | Nueva ruta pública `/lista-espera/confirmar?token=…` (añadida a §2.2). El token se borra de la barra de direcciones al confirmar. |
| 09/10/2026 | M1 · FR-19 / `05` §2.4 | No se especifica si destinos y ventanas son obligatorios ni sus límites. | Destinos: 1 a P-23, sin la propia ciudad ni duplicados. Ventanas: 0 a 10 activas (opcionales = «fechas flexibles»). Ciudades `CLOSED` no se ofrecen. |
| 09/10/2026 | M1 · `04` §2.15 / §2.21 | `legalAcceptances` exige `uid`, pero el visitante de la lista de espera no tiene cuenta. | El consentimiento se guarda en el propio documento: `privacyVersion` + `privacyAcceptedAt`. El servidor exige que la versión aceptada sea la vigente (`E_LEGAL_VERSION`). |
| 09/10/2026 | M1 · FR-18 ↔ reglas públicas de `demandStats` | Las reglas hacen `demandStats` legible por todos, así que un contador < P-18 sería visible aunque la UI no lo muestre. | Nueva colección solo servidor `demandCounters` con el recuento bruto; `demandStats` (pública) solo se escribe cuando el par llega a P-18. `confirmWaitlist` actualiza ambos en la transacción; el recálculo completo nocturno es J-08 (M9). El cliente vuelve a filtrar por P-18. |
| 09/10/2026 | M1 · `03` §7 límites | No hay parámetro de límite para la callable pública `joinWaitlist`. | Constantes técnicas en `shared/constants/limits.ts`: 10 solicitudes/h por IP (hash, nunca la IP en claro), reenvío del email ≥ 60 s, enlace válido 7 días. Nueva colección `rateLimits` con TTL. Propuesta: convertirlas en P-xx si negocio quiere ajustarlas. |
| 09/10/2026 | M1 · FR-19 privacidad | ¿Qué responde `joinWaitlist` si el email ya está confirmado o se da de baja? | Respuesta idéntica siempre (`{ ok: true }`, sin enumeración). Confirmado/convertido: no se cambia nada ni se envía email. Pendiente: actualiza preferencias y reenvía si pasaron 60 s. Dado de baja: vuelve a pendiente con nuevo consentimiento. Email normalizado (espacios y mayúsculas); los alias `+tag` y puntos cuentan como buzones distintos. |
| 09/10/2026 | M1 · DEC-69 / ADR-016 | Sin proveedor de email decidido. | `ConsoleEmailProvider` solo funciona dentro del emulador (fuera rechaza para no volcar datos en logs). En producción, sin `EMAIL_PROVIDER` el envío queda `FAILED` tras 5 intentos. `HttpEmailProvider` en M8. **Riesgo anotado:** `mailQueue.data` conserva el enlace con token hasta el TTL (90 días); colección solo servidor. Propuesta para M8: vaciar `data` al marcar `SENT`. |
| 09/10/2026 | M1 · Logos WebP (sustituye la opción conservadora de M0) | La DoD de M1 exige Lighthouse ≥ 90 y los PNG oficiales (200–570 KB) lo impedían. | Copias **solo redimensionadas** a WebP (48/96/192 px de alto) generadas con `pnpm brand:assets` en `apps/web/src/assets/brand/web/`; los originales de `assets/brand/` no se tocan. Comprobación visual: idénticos. `TinHomeLogo` usa `srcset`. Si el Founder prefiere otra vía, basta con borrar la carpeta y volver a los PNG. |
| 09/10/2026 | M1 · rendimiento de la landing (SPA) | Sin JavaScript no se pintaba nada: rendimiento 80–85. | La landing se **prerenderiza en la compilación** (`entry-prerender.tsx` + `scripts/prerender.ts`) en `dist/index.html`; el resto de rutas usan el shell `dist/app.html` (reescritura de Hosting `** → /app.html`). Las secciones con datos se cargan en diferido. Limitación: antes de que cargue el JS, en tema oscuro/negro el logo prerenderizado es la variante clara durante un instante. |
| 09/10/2026 | M1 · `08` M1 DoD ↔ `09` §4 | El plan pide Lighthouse móvil ≥ 90 en rendimiento y accesibilidad; QA pide rendimiento ≥ 85 y accesibilidad ≥ 95, y LCP < 2,5 s en 4G. | Se cumplen los dos: landing **92 / 100 / 100 / 100** (rend./acces./buenas prácticas/SEO). El LCP es 2,6 s con la red «slow 4G» por defecto de Lighthouse (más lenta que 4G). Las páginas secundarias (lista de espera 66, legal 68) quedan para M10 (zod + SDK de Functions + react-markdown). |
| 09/10/2026 | M1 · `11_BRAND` §4 (un degradado por pantalla) ↔ S-01 | S-01 pide degradado en el CTA, en el halo del mock y en el sello «ME GUSTA». | Se respeta lo que pide S-01 en el héroe. Las barras de `CityProgress` usan `primary` (no degradado) para no multiplicar degradados. |
| 09/10/2026 | M1 · C-06 «Encaje perfecto» (accent sólido) | Texto blanco sobre `--accent` (#2191FC) da 3,2:1: no cumple AA (falló en Lighthouse). | El chip usa `primary` + `primary-foreground`. **Aplica también a M5** (C-06): no usar `accent` con texto blanco. |
| 09/10/2026 | M1 · FR-34 ↔ `config/public` | P-27 (me gusta con mensaje al día) no está en `config/public`, pero la página de precios lo muestra. | Se muestra el valor por defecto de `PARAM_DEFAULTS`. Propuesta: añadir `premiumMessageLikesPerDay` a `config/public`. |
| 09/10/2026 | M1 · LEG-03 | Textos legales sin redactar. | Seed con borradores **PROVISIONAL** (versión `0.1-provisional`) con solo encabezados; ninguna cláusula redactada. Se renderizan con Markdown sin HTML (`skipHtml`, enlaces solo http(s)/mailto/relativos, sin imágenes). |
| 09/10/2026 | M1 · entorno de desarrollo en la nube | El proxy del sandbox bloquea la llamada local con la que `firebase-tools` registra triggers de Firestore («request blocked … 127.0.0.1»), así que `emulators:exec` con functions + firestore falla aquí. | No ocurre en local ni en CI. Aquí E2E-01 se validó arrancando Firestore y Functions como emuladores separados (sin registrar el trigger) con un `firebase.json` temporal, sin desactivar el proxy. |
| 09/10/2026 | M1 · posición en la lista | `confirmWaitlist` devuelve `position?` sin definición. | `position` = valor de `cities.counters.waitlist` tras sumar al confirmado (orden de confirmación en su ciudad). Solo en la primera confirmación; los contadores del seed son ficticios. |
| 09/10/2026 | M2 · `05` §4 `Me` | El tema elegido (C-26) se guarda en la cuenta con `updateSettings`, pero `Me` no lo devolvía, así que otro dispositivo no podía aplicarlo. | `Me.settings.theme` añadido (zod, `05`, `openapi`). Regla: el tema de la cuenta manda en todos los dispositivos; si la cuenta sigue en `system` y el dispositivo eligió otro, se guarda el del dispositivo. |
| 09/10/2026 | M2 · FR-01 / BR-20 códigos de invitación | Hace falta garantizar códigos únicos y resolver `?ref=` sin consultas; no se dice qué pasa con un código inválido. | Nueva colección solo servidor `referralCodes/{código}` (reserva con `create` en la transacción). Un código desconocido **se ignora** (no bloquea el registro). Códigos de 8 caracteres sin ambiguos (sin 0/O/1/I/L). |
| 09/10/2026 | M2 · FR-19 precarga desde la lista de espera | No se especifica dónde guardar los datos de la lista de espera para precargarlos. | `completeSignup` marca la entrada `CONVERTED` y copia `{ cityId, destinations, windowIds }` en `users.waitlistPrefill` (S); los pasos 3–4 la usarán en M3. |
| 09/10/2026 | M2 · FR-01 AC-01.2 menores | La cuenta de Firebase Auth se crea en el cliente antes de `completeSignup`. | El formulario valida la edad antes de crear nada (dominio compartido `isAdult`, T-D01); el servidor es la autoridad y, si responde `E_UNDERAGE`, el cliente borra la cuenta de Auth recién creada: no quedan cuentas de menores. |
| 09/10/2026 | M2 · FR-71 política de contraseñas | La política (≥ 10, letras y números, comunes rechazadas) es de Identity Platform y el emulador no la aplica. | Validación en cliente con la misma regla y una lista corta de contraseñas comunes. **Pendiente de infraestructura:** activar la política de contraseñas y el bloqueo por intentos en Identity Platform de staging/prod. La contraseña demo `Demo1234!` (9 caracteres) es anterior a la política y solo existe en el emulador. |
| 09/10/2026 | M2 · N-01 verificación de email | N-01 figura en el catálogo de emails propios. | Se usa la plantilla de verificación de **Firebase Auth** (idioma `es`, enlace de vuelta a `/app/onboarding/2`); personalizar el texto en la consola de Firebase. N-02 (bienvenida) se encola al completar el registro. |
| 09/10/2026 | M2 · S-02 «Cambiar email» | Cambiar el email de una cuenta sin verificar exige reautenticación y un segundo flujo. | «¿Te has equivocado de email?» cierra la sesión y lleva a crear la cuenta con el correcto. Queda una cuenta de Auth sin verificar; **propuesta:** job de limpieza de cuentas sin verificar > 30 días (M9/M10). |
| 09/10/2026 | M2 · S-03 «Guardar y salir» | Si sale a `/app/perfil`, la guarda de onboarding (pasos 2–4 obligatorios) le devuelve al paso pendiente. | «Guardar y salir» lleva a la landing; el progreso ya está guardado en el servidor. |
| 09/10/2026 | M2 · S-03 código SMS «6 casillas» | Seis inputs separados dificultan pegar, el autocompletado y los lectores de pantalla. | Un único campo con `autocomplete="one-time-code"`, `inputmode=numeric`, 6 dígitos y espaciado visual. Mismo resultado visual, mejor accesibilidad. |
| 09/10/2026 | M2 · BR-02 teléfono único | No hay índice propio de teléfonos. | Lo garantiza Firebase Auth al vincular (`auth/credential-already-in-use` → «Este número ya está en otra cuenta»). `users.phoneE164` se guarda para BR-20 (referidos). |
| 09/10/2026 | M2 · BR-05 orden de bloqueos | T-D02 pide «orden de resolución» sin definirlo. | `ACCOUNT_RESTRICTED` primero (no se resuelve con el onboarding) y después en el orden del asistente: EMAIL, PHONE, HOME_INCOMPLETE, NO_AVAILABILITY, IDENTITY_*, DECLARATION, HOME_NOT_PUBLISHED, CITY_WAITLIST, LEGAL_OUTDATED (`shared/constants/enums.ts`). |
| 09/10/2026 | M2 · alcance de pantallas | El `AppShell` enlaza a Descubrir, Explorar, Me gusta y Chats (M5–M6) y el onboarding tiene pasos 3–6 (M3–M4). | Pantallas «Disponible muy pronto» (vacío con explicación) para no tener enlaces rotos. El Perfil (S-11) muestra en M2 progreso, tema, ayuda y sesión; Ajustes (S-15) llega con sus hitos. |
| 09/10/2026 | M2 · FR-66 ayuda | «¿Te ha servido?» (`rateFaq`) y «Contactar con TinHome» (quejas) son de M9. | El centro de ayuda (lectura, búsqueda sin acentos, categorías, accesos rápidos de S-19) está en M2; esos dos elementos se añaden en M9. Artículos de ejemplo en el seed (ayuda de producto, no textos legales). |
| 09/10/2026 | M2 · FR-58 textos a reaceptar | Qué textos cuentan para `legalPending` y cuáles se pueden aceptar desde la app. | `legalPending` mira los textos del registro (Términos y Privacidad); `acceptLegalDocs` admite `terminos`, `privacidad` y `normas-comunidad`. El modal no se puede cerrar; la alternativa es cerrar sesión. Seed: `marta@demo.tinhome` aceptó una versión anterior (usuario demo añadido). |
| 09/10/2026 | M2 · rendimiento (corrige la limitación de M1) | Con `createRoot` React sustituía el HTML prerenderizado y el LCP empeoraba (83–90). | La landing se **hidrata** (`hydrateRoot`) con los mismos `Providers`; el logo elige variante tras hidratar y las secciones diferidas muestran su esqueleto hasta entonces (sin error #419). Resultado: 90–92 / 100 / 100 / 100. La sesión (Auth SDK) solo se monta en las páginas de acceso y en `/app`. |
| 09/10/2026 | M2 · navegación con chunks diferidos | React Router mantiene la pantalla anterior mientras carga una ruta diferida: en redes lentas parece que el clic no hace nada. | Barra de progreso `NavigationProgress` en los layouts (UX-7). |
| 09/10/2026 | M2 · `Me.roles` | Un superadmin ¿también lista `admin`? | `roles` refleja el claim tal cual (`['superadmin']`); las guardas tratan a superadmin como admin. |
| 10/10/2026 | M3 · borradores de casa | AC-06.1 exige guardar entre subpasos, pero `HomeInput` es completo. | `upsertHome` acepta `HomeDraftInput` (parcial, `cityId` obligatorio); BR-03 se comprueba al publicar. Contrato y openapi actualizados. |
| 10/10/2026 | M3 · URLs de fotos | `<img>` no envía cabeceras de autenticación. | Las fotos procesadas se sirven con URL de token de descarga de Firebase (públicas pero no adivinables); los originales `raw` se borran tras procesar. |
| 10/10/2026 | M3 · color sobre fotos | El texto blanco sobre fotos no tenía token. | Nuevo token `--on-media` y utilidad `bg-card-scrim` en `tokens.css` (sin hex en componentes). |
| 10/10/2026 | M3 · paso 6 desde el 5 | La verificación (paso 5) se puede posponer. | El paso 6 es accesible cuando el usuario llega al 5. |
| 10/10/2026 | M3 · `demandStats` | `updateTravelPrefs` dice «recalcula demandStats». | Se deja al job J-08 (M9) para no duplicar lógica; anotado en el contrato. |
| 10/10/2026 | M3 · texto «inquilino» | «Vivo de alquiler» contiene vocabulario prohibido (CLAUDE.md §4.7). | «Soy inquilino o inquilina (…)». |
| 10/10/2026 | M3 · desbordamiento a 360 px | Las opciones largas del `select` ensanchaban la rejilla (la página hacía zoom). | `minmax(0,1fr)` + `min-w-0`; E2E-03 comprueba que no hay scroll horizontal. |
| 10/10/2026 | M3 · seed | Hace falta casa publicada y fotos de ejemplo. | Seed sube un lote de 15 ilustraciones abstractas al emulador de Storage (reutilizables en M5), crea la casa publicada de Javier, indexa sus dHash y añade `pablo@demo.tinhome` para E2E-03. `pnpm test:e2e` arranca también Storage. |
| 10/10/2026 | M3 · logs | El redactor de PII oculta tramos numéricos dentro de UUID. | Se acepta (sobre-redactar es seguro). |
| 10/10/2026 | M4 · lectura de `verifications` | 04 permitía al propietario leer su verificación, pero el documento lleva `docNumberHash` y `duplicateOfUid` (uid de otra persona). | Reglas: solo admin con 2FA. El propietario usa la nueva callable `getMyVerification` (vista sin hashes). Contrato, openapi y 04 actualizados. |
| 10/10/2026 | M4 · documento duplicado | BR-02 dice «un documento por cuenta», FR-09 dice «alerta si el hash ya existe». | Se sigue FR-09 (más conservador para no bloquear por error): el envío no se bloquea, se marca `duplicateOfUid` y se crea la alerta `VERIFICATION_DUPLICATE` (tipo nuevo). La persona revisora decide. |
| 10/10/2026 | M4 · DNI/NIE | El pack no fija el formato. | Solo DNI o NIE españoles con letra de control válida (`isValidSpanishId`). Pasaportes y otros documentos: pendiente de decisión de negocio. |
| 10/10/2026 | M4 · pepper del hash | — | Secreto `DOC_HASH_PEPPER` (Secret Manager, `defineSecret`); en emulador y pruebas un valor local. Una función desplegada sin el secreto falla con `E_INTERNAL` (no hashea con un valor por defecto). Pendiente: crear el secreto en staging/producción. |
| 10/10/2026 | M4 · URL de documentos en el emulador | Las URL firmadas V4 necesitan cuenta de servicio, que el emulador no tiene. | En el emulador `adminGetVerificationFileUrl` devuelve una URL `data:` (sigue auditada). Se añade `contentType` a la salida para que el visor sepa si es PDF. |
| 10/10/2026 | M4 · PDF sin descarga | El visor seguro no debe permitir descargar, pero el visor de PDF del navegador tiene botón de descarga. | Se muestra con `#toolbar=0`, sin menú contextual y con marca de agua; sigue siendo posible descargar con herramientas del navegador. Si se exige más, renderizar con pdf.js en canvas (pendiente, librería grande). |
| 10/10/2026 | M4 · segundo factor en el emulador | El emulador de Auth no implementa TOTP. | El seed inscribe un segundo factor SMS al admin demo y el login acepta TOTP o SMS. La guarda `ADM` del servidor exige cualquier segundo factor (`sign_in_second_factor`). En producción el alta guiada ofrece TOTP; conviene restringir el SMS para admins en Identity Platform. |
| 10/10/2026 | M4 · reenvío tras «Pedir información» | ¿Se completa la misma verificación o se crea otra? | Se crea otra con todos los documentos; la anterior queda con `filesPurgeAt = ahora` (J-04 la borra). «Pedir información» también fija `filesPurgeAt` a P-13 días por si la persona no vuelve. |
| 10/10/2026 | M4 · lectura imprecisa | El contrato listaba `E_LOCATION_INACCURATE` como error y `INACCURATE` como resultado. | Se devuelve como resultado (la UI muestra consejos) y cuenta como intento; se añade `attemptsLeft`. |
| 10/10/2026 | M4 · ubicación ya verificada | — | Una lectura posterior fallida no deshace `PASS`/`MANUAL_APPROVED` (ADR-019: comprobación única). Cambiar la ciudad la reinicia (M3). |
| 10/10/2026 | M4 · aviso a admins de nuevas verificaciones | 05 dice «avisa a admins». | Se ven en el panel (KPI con antigüedad); solo los duplicados generan alerta. Las alertas en tiempo real con sonido llegan en M9. |
| 10/10/2026 | M4 · bienvenida de fundador (FR-40) | — | Diálogo una vez por dispositivo (`localStorage`); la insignia en tarjeta y perfil llega con la ficha y el perfil públicos (M5). |
| 10/10/2026 | M4 · `set-role` | — | `pnpm set-role <email> <admin\|superadmin\|none>`; escribe en `auditLog` con actor `script:set-role`. |
