# 01 · PRD — TinHome Fase 1 (Matching de intercambio de casas)

| Campo | Valor |
|---|---|
| Versión | 2.2 |
| Fecha | 09/10/2026 (2.2: chat, ubicación, advertencias, ayuda, quejas, push) |
| Estado | Aprobado para desarrollo (los elementos `[PENDIENTE]` se implementan parametrizados) |
| Propietario | Founder / Product Owner |
| Sustituye a | Pack v1.2 (modelo con limpieza, llaves y depósito → pasa a Fase 2) |

> **Para agentes de IA:** este documento define **QUÉ** debe hacer el sistema. El **CÓMO** está en `03_TECHNICAL_SPEC.md`, `04_DATABASE_SCHEMA.md` y `05_API_CONTRACT.md`. La experiencia de usuario está en `02_UX_UI_SPEC.md`. Si encuentras una contradicción entre documentos, **prevalece este PRD**; no la resuelvas por tu cuenta: anótala en `10_DECISIONS_AND_OPEN_ITEMS.md` y pregunta.

---

## 1. Resumen del producto

**TinHome** es una aplicación web (PWA, mobile-first) para que particulares residentes en España **intercambien sus casas para viajar**. Combina:

- **Lo mejor de HomeExchange:** casas reales, verificación de identidad, valoraciones mutuas, sin dinero entre usuarios.
- **Lo mejor de Tinder:** descubrir casas deslizando tarjetas, «me gusta», **match** cuando el interés es mutuo, y un plan **Premium** que da más visibilidad y ventajas.

**TinHome conecta a las personas; el acuerdo lo cierran ellas directamente.** TinHome **no es parte** del acuerdo de intercambio, no cobra ni paga nada entre usuarios y no gestiona llaves, limpieza ni seguros en esta fase.

### 1.1 Modelo de ingresos (Fase 1)

| Fuente | Descripción | Estado |
|---|---|---|
| Suscripción Premium | Mensual o anual, vía Stripe | Precio `[PENDIENTE DEC-75]`, parametrizado |
| Espacios patrocinados (afiliación) | Tarjetas de socios (limpieza, consigna de llaves, transporte…) marcadas «Patrocinado», sin cookies de terceros | Parametrizado; categoría «seguros» desactivada hasta validación legal |

### 1.2 Qué NO incluye la Fase 1 (no implementar)

Limpieza profesional, caja de llaves, depósito/fianza, hoteles, incidencias, seguro, pagos entre usuarios, chat interno, app nativa, mapa, idiomas distintos del español, operación fuera de España, intercambios por puntos. Todo eso es **Fase 2+** (ver `10_DECISIONS_AND_OPEN_ITEMS.md` §4).

---

## 2. Objetivos y métricas

| ID | Objetivo | Métrica | Meta de validación (propuesta) |
|---|---|---|---|
| OBJ-1 | Validar demanda antes de abrir | Inscritos por ciudad en lista de espera | ≥ 300 por ciudad del corredor |
| OBJ-2 | Densidad de oferta | Casas verificadas y publicadas por ciudad | ≥ 150 por ciudad para abrir (P-12) |
| OBJ-3 | Liquidez | % de matches con intercambio declarado y confirmado en 60 días | ≥ 15 % (si no, revisar modelo) |
| OBJ-4 | Monetización | % de usuarios verificados con Premium de pago | Seguimiento semanal |
| OBJ-5 | Confianza | Valoración media; denuncias por 100 usuarios | ≥ 4,5; tendencia descendente |

**Métrica guía (north star):** intercambios confirmados por ambas partes al mes.

---

## 3. Usuarios y roles

| Rol | Descripción |
|---|---|
| Visitante | Sin cuenta. Ve la landing, cómo funciona, precios, contador de lista de espera, textos legales y puede enviar una denuncia pública (DSA). |
| Usuario | Persona física ≥ 18 años residente en España con una casa. Estados de cuenta y verificación en §6. |
| Usuario Premium | Usuario con derecho Premium vigente (pago, fundador, referido o concedido por admin). |
| Administrador (`admin`) | Verificación, moderación, soporte. Requiere 2FA. |
| Superadministrador (`superadmin`) | Todo lo anterior + ciudades, ventanas, parámetros, partners, textos legales, métricas, auditoría, roles. Requiere 2FA. |

### 3.1 Personas (para decisiones de UX)

- **Laura, 34, Madrid** — piso alquilado de 60 m², viaja 3–4 veces al año, todo desde el móvil. Quiere ahorrar alojamiento; teme que su casero se entere y a desconocidos.
- **Javier, 52, Valencia** — segunda residencia en la costa que usa en verano. Quiere usarla como moneda para viajar a ciudades.
- **Marta, 28, Sevilla** — estudio pequeño; quiere probar gratis si alguien se interesa por su casa antes de pagar.
- **Carmen, docente, 41, Madrid** — vacaciones fijas (Semana Santa, verano); necesita fechas que coincidan.
- **Ana, gestión TinHome** — verifica documentos y modera desde el ordenador; necesita colas claras y acciones rápidas.

---

## 4. Glosario

| Término | Definición |
|---|---|
| Casa | Vivienda que un usuario ofrece para intercambiar. Máximo una por usuario. |
| Destinos deseados | Ciudades a las que el usuario quiere viajar (máx. 5) o «cualquier ciudad abierta». |
| Ventana | Periodo de intercambio predefinido por TinHome (p. ej., «Semana Santa 2027»). Los usuarios se apuntan a ventanas. |
| Fechas flexibles | Rangos de fechas propios del usuario (máx. 5), además de las ventanas. |
| Me gusta / Paso | Señal positiva / descarte sobre una casa en Descubrir. |
| Match | Me gusta mutuo entre dos usuarios. Desbloquea el contacto. |
| Encaje perfecto | Match o tarjeta en la que la ciudad de cada uno está en los destinos deseados del otro **y** comparten al menos una ventana o fechas solapadas. |
| Intercambio declarado | Registro, dentro de un match, de que ambos han acordado intercambiar en unas fechas. Lo crea uno y lo confirma el otro. Habilita las valoraciones. |
| Casa Top | Casa con valoración media ≥ P-04 y ≥ P-05 valoraciones publicadas. |
| Socio fundador | Uno de los primeros P-08 usuarios con identidad aprobada de cada ciudad. Recibe Premium gratis P-09 meses. |
| Ciudad abierta / en lista de espera | Estado de la ciudad. Solo en ciudades abiertas se puede dar «me gusta». |
| Derecho Premium | Periodo durante el que el usuario disfruta de Premium; puede venir de Stripe, fundador, referido o admin. |
| Declaración de motivos | Explicación enviada al usuario cuando se restringe su contenido o cuenta (art. 17 DSA). |
| Chat | Conversación de texto entre los dos usuarios de un match activo, dentro de TinHome. |
| Me gusta con mensaje | Ventaja Premium: enviar un mensaje corto junto al me gusta, antes de que haya match. |
| Verificación de ubicación | Comprobación única, hecha desde el móvil estando en la casa, de que la casa está en la ciudad declarada. |
| Advertencia (*strike*) | Falta registrada tras una moderación confirmada; se acumulan y escalan (advertencia → suspensión → expulsión). |
| Retención preventiva | Ocultación temporal de una casa mientras se revisa una denuncia grave o una alerta automática. |
| Queja o reclamación | Solicitud de un usuario **contra TinHome** (servicio, cobros, decisiones), distinta de denunciar a otro usuario. |

---

## 5. Alcance funcional — mapa de módulos

| Módulo | Código | Resumen |
|---|---|---|
| Cuenta y acceso | AUTH | Registro email/contraseña y Google, verificación de email, sesión, recuperación, baja |
| Onboarding | ONB | Asistente guiado de 6 pasos con barra de progreso |
| Casa | HOME | Crear/editar casa, fotos, estados, reglas de contenido |
| Preferencias de viaje | PREF | Destinos deseados, ventanas, fechas flexibles, viajeros y mascotas |
| Verificación | VER | Teléfono por SMS e identidad manual (DNI/NIE + selfie + documento de la casa) |
| Ciudades y lista de espera | CITY | Estados de ciudad, progreso hacia la apertura, demanda visible |
| Descubrir y Explorar | DISC | Mazo de tarjetas deslizables + cuadrícula con filtros + ficha de casa |
| Me gusta y match | MATCH | Me gusta, paso, límites, match, deshacer match, me gusta recibidos |
| Contacto | CONT | Revelado de teléfono/WhatsApp tras match; plantilla de acuerdo |
| Intercambio declarado | EXCH | Declarar, confirmar, cancelar un intercambio |
| Valoraciones | REV | Doble ciego, subpuntuaciones, Casa Top |
| Premium | PREM | Planes, Stripe Checkout, portal del cliente, desistimiento, ventajas |
| Crecimiento | GROW | Referidos, socios fundadores |
| Chat | CHAT | Chat de texto tras el match, me gusta con mensaje (Premium), compartir teléfono a voluntad |
| Seguridad y moderación | SAFE | Bloquear, denunciar (también visitantes y mensajes), moderación DSA, advertencias, retención preventiva, recursos |
| Ayuda y atención | HELP | Centro de ayuda con preguntas frecuentes, quejas y reclamaciones con número de seguimiento |
| Notificaciones | NOTIF | Email + centro de avisos en la app |
| Patrocinados | PART | Tarjetas de socios afiliados |
| Administración | ADMIN | Panel con 2FA: verificación, moderación, usuarios, ciudades, ventanas, parámetros, partners, métricas, auditoría, textos legales |
| Privacidad y legal | LEGAL | Textos versionados, aceptación, derechos RGPD, cookies técnicas |

---

## 6. Estados

### 6.1 Cuenta (`users.status`)
`ACTIVE` → `SUSPENDED` (temporal, con fecha fin) → `ACTIVE` · `ACTIVE` → `BANNED` · `ACTIVE`/`SUSPENDED` → `DELETION_PENDING` → `DELETED` (anonimizado).

### 6.2 Verificaciones (`users.verification`)
- `emailVerified: boolean` (Firebase Auth).
- `phoneVerified: boolean` (Firebase Auth, número vinculado).
- `identity: NONE | PENDING | INFO_REQUESTED | APPROVED | REJECTED`.

### 6.3 Casa (`homes.status`)
`DRAFT` → `PUBLISHED` ⇄ `PAUSED` (por el usuario) · cualquiera → `HIDDEN_BY_ADMIN` (moderación) → estado anterior.
**Visible** en Descubrir/Explorar solo si: `PUBLISHED` + titular `identity = APPROVED` + titular `ACTIVE` + ciudad `OPEN` (ver BR-04).

### 6.4 Ciudad (`cities.status`)
`WAITLIST` → `OPEN` → `CLOSED` (solo superadmin).

### 6.5 Match (`matches.status`)
`ACTIVE` → `UNMATCHED` | `BLOCKED`.

### 6.6 Intercambio declarado (`exchanges.status`)
`PROPOSED` (lo declara uno) → `CONFIRMED` (lo confirma el otro) | `DECLINED` | `EXPIRED` (sin respuesta en P-19 días) · `CONFIRMED` → `CANCELLED` (cualquiera, antes de la fecha de inicio) · `CONFIRMED` + fecha fin pasada → `COMPLETED` (automático) → valoraciones abiertas.

### 6.7 Denuncia (`reports.status`)
`OPEN` → `IN_REVIEW` → `ACTIONED` | `DISMISSED` → (si hay recurso) `APPEALED` → `APPEAL_UPHELD` | `APPEAL_REJECTED`.

---

## 7. Requisitos funcionales

Formato: **FR-ID — Título.** Descripción. *Reglas:* BR. *Criterios de aceptación* (Dado/Cuando/Entonces).

### 7.1 AUTH — Cuenta y acceso

**FR-01 — Registro.** Registro con email + contraseña o con Google. Campos: nombre, apellidos, fecha de nacimiento, email, contraseña (si aplica), código de invitación opcional (precargado desde `?ref=`). Aceptación expresa de Términos y Privacidad (versionados). *Reglas:* BR-01, BR-35, BR-20.
- AC-01.1 Dado un formulario válido, cuando envío, entonces se crea la cuenta, se envía email de verificación y llego al paso 2 del onboarding.
- AC-01.2 Dado una fecha de nacimiento < 18 años, entonces el registro se rechaza con «Debes ser mayor de edad».
- AC-01.3 Dado un email ya registrado, entonces veo «Ya existe una cuenta con este email» y enlace a iniciar sesión.
- AC-01.4 Dado que no marco Términos y Privacidad, entonces el botón «Crear cuenta» está deshabilitado.
- AC-01.5 Dado un `ref` válido, entonces queda guardado `referredBy` y no se puede cambiar después.

**FR-02 — Verificación de email.** Sin email verificado solo se accede a la pantalla «Revisa tu email» (con reenviar, máx. 1 cada 60 s). Google cuenta como verificado.

**FR-03 — Inicio de sesión, cierre y recuperación.** Email/contraseña o Google. Recuperación con mensaje idéntico exista o no la cuenta. Sesión persistente en el dispositivo.

**FR-04 — Perfil personal.** Foto de perfil (opcional, recomendada), nombre visible (solo nombre de pila + inicial del apellido), «sobre mí» (≤ 300 caracteres), idiomas que habla, con quién suele viajar (solo/pareja/familia/amigos). El nombre legal completo solo lo ve administración.

**FR-05 — Baja de cuenta.** Desde Ajustes, con reautenticación. Efecto inmediato: casa oculta, matches cerrados, intercambios `PROPOSED`/`CONFIRMED` futuros cancelados con aviso al otro, suscripción Stripe cancelada al final del periodo. Borrado según BR-29. *Reglas:* BR-29.
- AC-05.1 Dado que confirmo la baja, entonces mi casa deja de aparecer al instante y recibo email de confirmación con la fecha de borrado.

### 7.2 ONB — Onboarding

**FR-06 — Asistente de onboarding.** Tras registrarse, el usuario recorre 6 pasos con barra de progreso, pudiendo salir y continuar después (el progreso se guarda):
1. Cuenta creada (✓) · 2. Teléfono (SMS) · 3. Tu casa (datos + fotos) · 4. Adónde y cuándo quieres viajar · 5. Verificación de identidad · 6. Revisión y publicación.
- AC-06.1 Dado que cierro la app en el paso 3, cuando vuelvo, entonces continúo en el paso 3 con lo ya guardado.
- AC-06.2 El indicador «Perfil completado X %» se muestra en Mi casa y en Perfil hasta llegar al 100 %.
- AC-06.3 Los pasos 2–6 muestran por qué se piden (microcopy de confianza, ver UX §6).

### 7.3 VER — Verificación

**FR-07 — Verificación de teléfono.** Móvil español (+34) verificado con código SMS (Firebase Phone Auth vinculado a la cuenta). Un número solo puede estar en una cuenta. *Reglas:* BR-24.

**FR-08 — Solicitud de verificación de identidad.** El usuario sube: DNI/NIE (anverso y reverso), selfie sosteniendo el documento (cámara o archivo) y un **documento que acredite su relación con la casa** (escritura/nota simple, recibo del IBI, contrato de alquiler o factura de suministro de < 3 meses a su nombre). Si declara ser **inquilino**, además la **autorización escrita del arrendador** según el modelo descargable de TinHome. Estado → `PENDING`. *Reglas:* BR-24, BR-25.
- AC-08.1 Dado que falta algún documento obligatorio, entonces el envío se bloquea indicando cuál.
- AC-08.2 Dado que la casa está marcada como alquilada y no subo la autorización, entonces no puedo enviar y veo el enlace al modelo.
- AC-08.3 Archivos JPG/PNG/WEBP/HEIC/PDF ≤ 10 MB; si no, mensaje con el motivo.

**FR-09 — Revisión de identidad (admin).** Cola por antigüedad. Visor seguro (marca de agua, sin descarga). Comparación **visual** de selfie y documento (sin reconocimiento facial). Acciones: Aprobar · Rechazar (motivo obligatorio) · Pedir información (mensaje obligatorio) · Marcar sospecha de fraude. Alerta si el hash del número de documento ya existe en otra cuenta. Notifica al usuario. *Reglas:* BR-24, BR-25, BR-19, BR-20.
- AC-09.1 Dado que apruebo, entonces el usuario pasa a `APPROVED`, su casa (si está `PUBLISHED`) pasa a ser visible y se evalúan socio fundador (BR-19) y recompensa de referido (BR-20).

### 7.4 HOME — Casa

**FR-10 — Crear/editar casa.** Campos: título (10–70), descripción (50–1.500), ciudad (de la lista de ciudades), zona/barrio (texto, ≤ 60), tipo (piso, casa, estudio, ático, dúplex, chalet, otro), régimen (propietario/inquilino), uso (vivienda habitual/segunda residencia), m² (10–1.000), dormitorios (0–10), camas (1–20), baños (1–10), capacidad máxima de personas (1–12), mascotas admitidas (sí/no), servicios (lista cerrada: wifi, cocina equipada, lavadora, aire acondicionado, calefacción, ascensor, terraza, piscina, parking, apto niños, apto teletrabajo, accesible), normas de la casa (≤ 500). **No se pide dirección exacta** (minimización): solo ciudad y zona. *Reglas:* BR-02, BR-22.
- AC-10.1 Dado un texto con teléfono, email, URL, precio o vocabulario de alquiler, entonces el servidor lo rechaza con mensaje explicativo y se marca el campo.

**FR-11 — Fotos.** Entre 5 y 20, reordenables por arrastre, la primera es la portada. Subida con progreso, compresión en cliente, eliminación de metadatos EXIF/GPS en servidor y generación de tamaños (thumb 400 px, card 1080 px, full 1600 px). *Reglas:* BR-23.

**FR-12 — Declaración responsable.** Para publicar, el titular acepta (versionada, por casa): derecho a ceder temporalmente su uso; si es inquilino, autorización del arrendador; respeto a las normas de su comunidad y normativa local; que el intercambio es sin contraprestación económica; que comunicará el intercambio a su seguro de hogar si su póliza lo exige; indemnidad a TinHome. *Reglas:* BR-03, BR-35.

**FR-13 — Publicar, pausar, despublicar.** Publicar exige BR-03. Pausar oculta la casa sin perder matches. Estado visible con explicación («Publicada · pendiente de verificación de identidad» si aún no está aprobada).

### 7.5 PREF — Preferencias de viaje

**FR-14 — Destinos deseados.** Hasta 5 ciudades (de la lista, abiertas o en lista de espera) o «Cualquier ciudad abierta».

**FR-15 — Disponibilidad.** El usuario se apunta a **ventanas** activas (definidas por superadmin) y/o añade hasta 5 rangos de **fechas flexibles** (inicio < fin, dentro de los próximos 12 meses). Debe tener al menos una ventana o rango para dar «me gusta».

**FR-16 — Viajeros.** Número habitual de viajeros (1–12) y si viaja con mascota. Se usa para filtrar casas con capacidad suficiente / que admiten mascotas.

### 7.6 CITY — Ciudades y lista de espera

**FR-17 — Estado de ciudad y progreso.** Cada ciudad tiene estado y umbral de apertura (P-12). En ciudades `WAITLIST`, el usuario ve una tarjeta de progreso «Tu ciudad abre al llegar a 150 casas verificadas: vamos por 87» con CTA para invitar. *Reglas:* BR-21.

**FR-18 — Demanda visible.** En la landing y en la lista de espera se muestran contadores reales por pareja de ciudades y ventana: «47 personas de Valencia quieren ir a Madrid en Semana Santa». Solo se muestran contadores ≥ P-18 (privacidad).

**FR-19 — Lista de espera pública.** Desde la landing, un visitante puede apuntarse con email + ciudad + destino deseado + ventanas (doble opt-in por email). Al registrarse más tarde con ese email, los datos se precargan.

### 7.7 DISC — Descubrir y Explorar

**FR-20 — Descubrir (mazo de tarjetas).** Pantalla principal. Muestra tarjetas de casas candidatas una a una: foto de portada a sangre con galería (toques en laterales), título, ciudad · zona, capacidad, chips de **Encaje perfecto**, «Te ha dado me gusta» (solo Premium ve el motivo; en gratis el orden ya lo favorece), ventanas en común, valoración y badge **Top**/**Verificado**/**Fundador**. Gestos: deslizar a la derecha = me gusta, a la izquierda = paso, tocar = ficha. Botones equivalentes accesibles y atajos de teclado (← paso, → me gusta, ↑ ficha, Z deshacer). El servidor devuelve lotes de 20 (`getDiscoverDeck`). *Reglas:* BR-04, BR-05, BR-11, BR-14.
- AC-20.1 Dado que no cumplo BR-05, cuando intento dar me gusta, entonces veo una hoja explicando qué me falta con botón directo al paso.
- AC-20.2 Dado que se acaba el mazo, entonces veo un estado vacío útil: ampliar destinos, añadir fechas, invitar a alguien de otra ciudad.
- AC-20.3 Deshacer el último paso está disponible 1 vez por sesión para gratis e ilimitado para Premium.

**FR-21 — Explorar (cuadrícula con filtros).** Lista paginada de casas visibles con filtros: ciudad de destino, ventana o rango de fechas, capacidad ≥ viajeros, mascotas, tipo, servicios, solo Encaje perfecto. Filtros **Premium**: solo Casas Top, solo verificados con ≥ N valoraciones, «le gusto» (casas cuyo titular me ha dado me gusta). Orden: relevancia (por defecto), más nuevas, mejor valoradas.

**FR-22 — Ficha de casa.** Galería a pantalla completa, título, ciudad · zona (nunca dirección), características, servicios, normas, disponibilidad (ventanas y rangos), destinos deseados del titular, perfil del titular (foto, nombre visible, «sobre mí», idiomas, verificado, miembro desde, valoraciones recibidas con comentarios), botones Me gusta / Paso / Compartir / Denunciar.

### 7.8 MATCH — Me gusta y match

**FR-23 — Me gusta y paso.** Me gusta registra interés; paso oculta la casa P-03 días. Límite diario para gratis P-01; Premium ilimitado sujeto a antiabuso P-02/h. Contador visible «Te quedan 7 me gusta hoy». *Reglas:* BR-05, BR-06, BR-11.
- AC-23.1 Dado que agoté mis me gusta gratis, cuando intento otro, entonces veo la hoja Premium contextual («Sigue descubriendo sin límite») y la hora de reinicio.

**FR-24 — Match.** Si el otro ya me había dado me gusta, se crea el match al instante y se muestra la **pantalla de celebración** con: fotos de ambas casas, resumen de compatibilidad (destinos, ventanas/fechas en común), botón «Enviar mensaje» (abre el chat), botón «Descargar acuerdo de intercambio» y, si existe, una tarjeta patrocinada (P-15). Ambos reciben notificación. *Reglas:* BR-07, BR-08.

**FR-25 — Lista de matches (Chats).** Ordenada por último mensaje; vista previa del último mensaje, contador de no leídos, distintivo «nuevo» y Encaje perfecto. Cada fila abre el chat (FR-60), desde el que se accede a declarar intercambio, deshacer match, bloquear y denunciar.

**FR-26 — Me gusta recibidos.** Gratis: número total y tarjetas difuminadas con CTA Premium. Premium: lista completa (casa + titular) con acción rápida Me gusta/Paso. *Reglas:* BR-12.

**FR-27 — Deshacer match.** Cierra el match (`UNMATCHED`), elimina ambos me gusta, oculta el contacto. El otro no recibe aviso explícito; el match desaparece de su lista. *Reglas:* BR-09.

### 7.9 CONT — Contacto y acuerdo

**FR-28 — Compartir teléfono (voluntario).** El teléfono **no** se muestra automáticamente. Desde el chat, cada usuario puede pulsar «Compartir mi teléfono» (con confirmación): el otro ve entonces su teléfono verificado con botones «Llamar» y «WhatsApp» (`https://wa.me/34XXXXXXXXX`). Compartir es por match y no se puede deshacer, pero el teléfono deja de verse si el match se deshace o se bloquea. *Reglas:* BR-08.

**FR-29 — Kit de acuerdo.** Descarga de: (a) modelo de **acuerdo de intercambio** en PDF con campos (partes, casas, fechas, personas, mascotas, normas, estado de entrega, contacto de emergencia) y aviso de que TinHome no es parte; (b) **checklist de entrega** (llaves, fotos de cada estancia, inventario, contadores). Ambos generados en cliente a partir de una plantilla versionada `[PENDIENTE textos del abogado]`.

### 7.10 EXCH — Intercambio declarado

**FR-30 — Declarar intercambio.** Dentro de un match activo, cualquiera declara fechas (inicio, fin), personas y mascotas de cada lado. El otro recibe aviso y **confirma** o **rechaza** en P-19 días. *Reglas:* BR-15.
- AC-30.1 Dado un intercambio `CONFIRMED`, entonces ambos ven una ficha con fechas, cuenta atrás, kit de acuerdo y botón «Cancelar intercambio».

**FR-31 — Cancelar y completar.** Cualquiera cancela antes de la fecha de inicio (motivo opcional, se notifica al otro; se registra para métricas, sin sanción automática). Al pasar la fecha fin, `COMPLETED` automático y se abren las valoraciones.

### 7.11 REV — Valoraciones

**FR-32 — Valorar.** Solo en intercambios `COMPLETED`, una vez cada parte, dentro de P-20 días: puntuación global 1–5 y subpuntuaciones (limpieza, fidelidad al anuncio, comunicación, cuidado de mi casa) + comentario opcional (≤ 1.000). **Doble ciego:** se publican cuando ambos han valorado o al vencer el plazo. No editables. *Reglas:* BR-16.

**FR-33 — Casa Top.** Badge y colección cuando se cumple BR-13. Visible para todos el badge; la colección y el filtro son Premium.

### 7.12 PREM — Premium

**FR-34 — Planes y paywall.** Página de planes con comparativa Gratis vs Premium y precio final con IVA. Hojas de paywall **contextuales** (al agotar me gusta, al tocar «me gusta recibidos», al usar filtro Premium), nunca bloqueantes en el onboarding.

| Ventaja | Gratis | Premium |
|---|---|---|
| Publicar casa, verificarse, navegar | ✓ | ✓ |
| Me gusta al día | P-01 (10) | Ilimitados (antiabuso P-02/h) |
| Ver quién te ha dado me gusta | Solo número | Lista completa |
| Visibilidad de tu casa | Normal | Impulso en el orden (P-14W) + badge discreto |
| Colección y filtro Casas Top | — | ✓ |
| Filtros avanzados | — | ✓ |
| Deshacer paso | 1 por sesión | Ilimitado |
| Chat tras el match | ✓ | ✓ |
| Me gusta con mensaje (antes del match) | — | ✓ (P-27 al día) |
| Tarjetas patrocinadas | Sí | Sí (sin intersticiales en el mazo) |

**FR-35 — Contratar.** Stripe Checkout (suscripción) con plan mensual o anual (P-21/P-22). Antes de pagar, el usuario acepta el **inicio inmediato** del servicio y la información de desistimiento. Tras el pago (webhook), el derecho Premium se activa. *Reglas:* BR-17, BR-18, BR-34.

**FR-36 — Gestionar suscripción.** Botón «Gestionar suscripción» abre el portal del cliente de Stripe (cambiar tarjeta, cambiar plan, cancelar **al final del periodo**, facturas). La cancelación se puede hacer siempre en 2 clics. *Reglas:* BR-18.

**FR-37 — Desistimiento (14 días).** Botón «Desistir» visible los primeros P-07D días tras la primera contratación: cancela inmediatamente y reembolsa según P-07 `[PENDIENTE DEC-63: FULL por defecto]`. Confirmación por email (soporte duradero). *Reglas:* BR-34.

**FR-38 — Indicador de estado Premium.** En Perfil: origen (pago/fundador/referido/admin), fecha fin, próxima renovación.

### 7.13 GROW — Crecimiento

**FR-39 — Referidos.** Cada usuario tiene enlace/código personal. Pantalla «Invita y gana» con compartir nativo (Web Share API, WhatsApp, copiar), CTA destacada «¿Conoces a alguien en [otra ciudad]?» y contador de invitaciones y recompensas. *Reglas:* BR-20.

**FR-40 — Socios fundadores.** Automático al aprobar identidad (BR-19). Badge «Fundador» en tarjeta y perfil. Pantalla de bienvenida especial.

### 7.14 SAFE — Seguridad y moderación (DSA)

**FR-41 — Bloquear.** Desde ficha, match o perfil. Efecto mutuo de invisibilidad; deshace el match. Solo quien bloquea puede desbloquear (Ajustes › Bloqueados). *Reglas:* BR-10.

**FR-42 — Denunciar (usuario).** Botón «Denunciar» visible en ficha de casa, perfil, chat (también sobre un mensaje concreto) y valoraciones. Motivos: **fotos que no son de su vivienda / suplantación de otra casa**, **trato grosero o irrespetuoso**, acoso o amenazas, mensajes inapropiados o spam, fraude o petición de dinero, alquiler encubierto, contenido ilegal, datos personales expuestos, otro. Descripción (≥ 20 caracteres) y capturas opcionales. Al enviar, el denunciante ve y recibe por email: «Hemos recibido tu denuncia. La revisaremos a fondo y te informaremos del resultado.» El denunciado no sabe quién le denunció. *Reglas:* BR-27, BR-41, BR-42.

**FR-43 — Denuncia pública (visitante).** Formulario sin cuenta en `/denunciar`: nombre, email, URL o identificador del contenido, explicación motivada, declaración de buena fe. Protección antispam (App Check/reCAPTCHA). *Reglas:* BR-27.

**FR-44 — Moderación (admin).** Cada denuncia **dispara un aviso inmediato a los administradores** (en el panel en tiempo real y por email si es de prioridad alta: fotos ajenas, fraude, acoso, amenazas, ilegal) y entra en una cola con prioridad y plazo objetivo de revisión (alta: 24 h; normal: 72 h). La ficha muestra el contenido denunciado (instantánea), los mensajes implicados si los hay, el historial y las advertencias del usuario. Acciones: archivar, advertir, ocultar contenido (casa/valoración), suspender (con fecha fin), expulsar. **Cada acción restrictiva exige elegir una plantilla de declaración de motivos** (hechos, base: ley o normas de la comunidad, alcance, duración, cómo recurrir) que se envía por email al afectado y queda registrada. *Reglas:* BR-26, BR-27.

**FR-45 — Recurso.** El afectado puede recurrir desde el email/app en P-14R meses. Lo revisa, si es posible, un admin distinto del que decidió. Resultado notificado.

### 7.15 NOTIF — Notificaciones

**FR-46 — Centro de avisos y emails.** Ver catálogo en `02_UX_UI_SPEC.md` §8. Preferencias por categoría en Ajustes (las de servicio y legales no se pueden desactivar). Sin emails comerciales salvo consentimiento específico (LSSI art. 21).

### 7.16 PART — Patrocinados

**FR-47 — Tarjetas patrocinadas.** Superadmin gestiona partners: nombre, categoría, título, texto (≤ 140), logo, URL de destino, ciudades, ubicaciones permitidas (pantalla de match, ficha de intercambio, intersticial del mazo cada P-15 tarjetas solo para gratis), activo/inactivo. Siempre etiquetadas «Patrocinado». Clic por redirección propia que cuenta clics (sin cookies ni píxeles de terceros). Categoría `INSURANCE` bloqueada por bandera hasta validación legal. *Reglas:* BR-28.

### 7.17 ADMIN — Panel de administración

**FR-48 — Acceso y roles.** `/admin` solo con rol `admin`/`superadmin` + 2FA (TOTP). Sesión de admin caduca a los 30 min de inactividad.

**FR-49 — Panel de inicio.** KPIs: verificaciones pendientes (con antigüedad), denuncias abiertas, nuevos usuarios 7 días, casas visibles por ciudad vs umbral, matches 7 días, intercambios confirmados 30 días, suscriptores Premium activos por origen.

**FR-50 — Usuarios.** Búsqueda (nombre, email, teléfono), ficha completa (estados, casa, verificación, matches, denuncias, derechos Premium, auditoría), acciones: conceder Premium (días + motivo), suspender, expulsar, reactivar, cambiar rol (solo superadmin).

**FR-51 — Ciudades y ventanas.** CRUD de ciudades (nombre, provincia, comunidad, zona horaria, estado, umbral) y ventanas (nombre, inicio, fin, activa, ciudades aplicables o todas).

**FR-52 — Parámetros.** Edición de P-xx con validación y auditoría (solo superadmin).

**FR-53 — Partners.** CRUD (FR-47) y métricas de clics.

**FR-54 — Métricas.** Embudo por ciudad: registros → teléfono → casa publicada → identidad aprobada → primer me gusta → match → intercambio confirmado → valoración; conversión a Premium; demanda por pareja de ciudades y ventana; exportación CSV.

**FR-55 — Auditoría.** Registro de solo inserción: accesos a documentos de identidad, decisiones de verificación, acciones de moderación, concesiones de Premium, cambios de parámetros, ciudades, roles y textos legales. Filtros y exportación.

**FR-56 — Textos legales.** Publicar nueva versión (Markdown) de cada texto; marcar si exige reaceptación.

### 7.18 LEGAL — Privacidad y legal

**FR-57 — Páginas legales públicas.** Aviso legal (LSSI), Términos y condiciones, Privacidad, Cookies (solo técnicas), Normas de la comunidad, Información DSA (punto de contacto, moderación, recursos), modelo de autorización del arrendador, Cómo funciona. Versión y fecha visibles.

**FR-58 — Reaceptación.** Si un texto con `requiresReacceptance` cambia, el usuario ve un modal bloqueante con resumen de cambios antes de dar me gusta o declarar intercambios.

**FR-59 — Derechos RGPD.** Formulario en Ajustes › Privacidad (acceso, rectificación, supresión, oposición, limitación, portabilidad). Exportación JSON de los datos del usuario generada por función. Registro y plazo P-16R. *Reglas:* BR-30.

---

### 7.19 CHAT — Mensajes

**FR-60 — Chat tras el match.** Con un match `ACTIVE`, ambos usuarios pueden escribirse **gratis** en un chat de texto dentro de TinHome. Mensajes de hasta P-28 caracteres, en tiempo real, con hora, separadores por día, estado *enviado / leído*, contador de no leídos en la pestaña Chats, sugerencias para empezar («¿Qué fechas os vienen bien?», «¿Cómo es tu barrio?») y mensajes del sistema (match creado, teléfono compartido, intercambio propuesto/confirmado/cancelado). Sin fotos ni archivos en Fase 1. Aviso de seguridad fijo la primera vez: «Nunca envíes dinero ni datos bancarios. TinHome no participa en el acuerdo.» Si un mensaje menciona pagos (Bizum, transferencia, IBAN, «pagar»), se muestra al receptor un aviso de seguridad (no se bloquea). Al deshacer el match o bloquear, el chat desaparece para ambos; el contenido se conserva bloqueado según P-39 para moderación. *Reglas:* BR-36, BR-45.
- AC-60.1 Dado un match activo, cuando envío un mensaje, entonces aparece al instante (optimista), el otro lo recibe en < 1 s si tiene la app abierta, y recibe push (si lo activó) o email resumen si sigue sin leer a las 2 h.
- AC-60.2 Dado que envío más de P-29 mensajes por minuto, entonces veo «Vas muy rápido. Espera un momento.»
- AC-60.3 Dado un mensaje ofensivo, cuando lo mantengo pulsado (o uso su menú) y elijo «Denunciar mensaje», entonces se abre la denuncia con el mensaje adjunto.

**FR-61 — Me gusta con mensaje (Premium).** Un usuario Premium puede añadir un mensaje (≤ P-40 caracteres) a un me gusta, hasta P-27 al día. El receptor, sea gratis o Premium, ve la casa **y el mensaje** destacado en «Me gusta recibidos» y en su mazo («Laura te ha escrito»). Si hay match, el mensaje se convierte en el primero del chat. Para usuarios gratis, el botón muestra un candado y abre el paywall. *Reglas:* BR-37.

**FR-62 — (reservado).** Compartir el teléfono desde el chat está especificado en FR-28.

### 7.20 VER (ampliación) — Ubicación y autenticidad de las fotos

**FR-63 — Verificación de ubicación de la casa.** Paso obligatorio para que la casa sea visible (BR-04), dentro del paso 5 del onboarding: «Verifica que tu casa está donde dices. Abre TinHome **en el móvil, estando en tu casa**, y pulsa *Verificar ubicación*.» La app pide permiso de ubicación del navegador explicando el motivo, toma una lectura de alta precisión y el servidor comprueba que está dentro del radio de la ciudad declarada (`cities.radiusKm`). Resultado: **Verificada** · **No coincide** (con opciones: reintentar o «Solicitar revisión manual» con explicación) · **Precisión insuficiente** (consejos: activar GPS, acercarse a una ventana). En ordenador se muestra un código QR para continuar en el móvil. Solo se conserva el resultado, la distancia redondeada y la precisión; las coordenadas aproximadas se borran a los P-13 días. Cambiar la ciudad de la casa exige repetirla. *Reglas:* BR-39.

**FR-64 — Detección de fotos duplicadas.** Cada foto procesada genera una huella perceptual. Si una foto coincide con la de **otra casa** de la plataforma, la casa nueva entra en **retención preventiva** (no visible) con el motivo «Fotos en revisión», se notifica al titular y se crea una alerta de prioridad alta para administración, que confirma (falsa alarma → se libera) o actúa (ocultar, advertencia, expulsión). *Reglas:* BR-40, BR-42.

**FR-65 — Cambios en una casa ya verificada.** El titular puede editar textos y fotos cuando quiera (FR-10, FR-11). Si en 30 días sustituye ≥ P-37 de las fotos, cambia de ciudad o una foto nueva activa FR-64, la casa pasa a revisión (retención preventiva) antes de seguir visible. Las ediciones de texto se validan siempre con BR-22.

### 7.21 SAFE (ampliación) — Advertencias y retención preventiva

**FR-68 — Sistema de advertencias.** Cada moderación confirmada contra un usuario puede registrar una **advertencia** (*strike*) que caduca a los P-31 meses. Escalado propuesto por el sistema y **siempre confirmado por un administrador**: 1.ª → advertencia por email y en la app; 2.ª → suspensión de P-32 días; 3.ª (P-33) → expulsión. Las faltas graves (fraude, fotos ajenas, amenazas, contenido ilegal) pueden saltar directamente a suspensión o expulsión. El usuario ve sus advertencias activas en Ajustes › Mi cuenta con el motivo y cómo recurrir (FR-45). *Reglas:* BR-41.

**FR-69 — Retención preventiva.** Una casa (o cuenta) pasa a retención preventiva —no visible, sin poder dar me gusta ni chatear con nuevos matches— cuando: (a) recibe una denuncia de motivo grave de un usuario con identidad verificada, (b) recibe ≥ P-34 denuncias independientes, o (c) salta FR-64/FR-65. El afectado recibe una **declaración de motivos provisional** (sin revelar al denunciante). Administración debe resolver en P-35 horas; si no, el sistema avisa de nuevo y escala al superadmin. Si la denuncia no se confirma, se libera sin advertencia. *Reglas:* BR-42.

### 7.22 HELP — Ayuda y atención

**FR-66 — Centro de ayuda y preguntas frecuentes.** Botón **«Ayuda»** siempre accesible (Perfil, menú de escritorio, pie de la landing y dentro de cada `BlockerSheet`). Preguntas frecuentes por categorías (Empezar, Verificación, Me gusta y match, Chat y seguridad, Intercambios, Premium y pagos, Privacidad, Denuncias), con buscador. Los artículos los gestiona administración (sin desplegar). Al final de cada artículo: «¿Te ha servido? Sí / No» y «Contactar con TinHome».

**FR-67 — Quejas y reclamaciones.** Botón **«Quejas y reclamaciones»** en Ayuda y en Ajustes, también para visitantes (con email). Formulario: categoría (cuenta y acceso, verificación, Premium y cobros, una decisión de moderación, error técnico, otra), asunto, descripción y adjuntos. Se genera un **número de seguimiento** (`TH-2026-000123`), acuse por email con plazo de respuesta (P-38) y una pantalla «Mis solicitudes» con estado (Recibida · En revisión · Esperando tu respuesta · Resuelta) e hilo de respuestas. Se informa de las vías oficiales de consumo (hojas de reclamaciones de la comunidad autónoma) `[PENDIENTE textos del abogado]`. *Reglas:* BR-43.

### 7.23 NOTIF y AUTH (ampliación)

**FR-70 — Notificaciones push.** Web push (Firebase Cloud Messaging) para nuevos mensajes, matches, me gusta con mensaje e intercambios. El permiso **no** se pide al entrar: se ofrece tras el primer match o el primer mensaje, con una hoja propia que explica para qué sirve. En iPhone requiere instalar la PWA (se muestra cómo). Preferencias por tipo en Ajustes. *Reglas:* BR-44.

**FR-71 — Seguridad de la cuenta.** Contraseña de ≥ 10 caracteres con letras y números (política de Identity Platform, rechazo de contraseñas comunes), aviso por email ante cambio de email o contraseña, botón **«Cerrar sesión en todos los dispositivos»** y bloqueo temporal tras intentos fallidos (Firebase). Toda la app (salvo landing, legal, ayuda pública, lista de espera y denuncia pública) exige sesión iniciada.

## 8. Reglas de negocio

> Todas se aplican **en el servidor** (BR-31). El cliente solo las refleja para guiar al usuario.

| ID | Regla |
|---|---|
| BR-01 | Solo mayores de 18 años (fecha de nacimiento declarada; comprobada en la verificación de identidad). |
| BR-02 | Una cuenta por persona y una casa por cuenta. Un número de documento (hash) y un teléfono solo pueden estar en una cuenta. |
| BR-03 | Publicar exige: email y teléfono verificados, campos obligatorios completos, 5–20 fotos y declaración responsable vigente aceptada. |
| BR-04 | Una casa es **visible** a otros solo si: `PUBLISHED`, titular con identidad `APPROVED`, **ubicación verificada** (BR-39), sin **retención preventiva** (BR-42), titular `ACTIVE`, ciudad `OPEN`, y no hay bloqueo entre ambos. |
| BR-05 | Dar me gusta exige: identidad `APPROVED`, casa propia `PUBLISHED`, ciudad propia `OPEN`, al menos una ventana o rango de fechas, cuenta `ACTIVE`, textos legales vigentes aceptados. En ciudad `WAITLIST` se puede navegar pero no dar me gusta. |
| BR-06 | Gratis: P-01 me gusta por día natural (reinicio 00:00 `Europe/Madrid`). Premium: ilimitado con antiabuso P-02 por hora. |
| BR-07 | Hay match cuando A ha dado me gusta a la casa de B y B a la de A, ambos vigentes. Se crea una sola vez (ID determinista, transacción). |
| BR-08 | Con match `ACTIVE`, cada parte ve el nombre visible de la otra y puede chatear (BR-36). El teléfono verificado solo se muestra si su titular lo comparte en ese match; no se puede retirar, pero se oculta si el match se deshace o se bloquea. |
| BR-09 | Deshacer match elimina ambos me gusta y oculta el contacto. Un intercambio `PROPOSED`/`CONFIRMED` asociado se cancela con aviso. |
| BR-10 | Bloquear aplica BR-09 y hace mutuamente invisibles casa, perfil y valoraciones. Solo quien bloquea desbloquea. |
| BR-11 | Un paso oculta la casa del mazo de quien pasa durante P-03 días. |
| BR-12 | Me gusta recibidos: gratis ve el número; Premium ve la lista. |
| BR-13 | Casa Top: media global ≥ P-04 con ≥ P-05 valoraciones publicadas. |
| BR-14 | Orden de Descubrir (servidor): `score = W1·encajeDestino + W2·solapeFechas + W3·leGusto + W4·premium + W5·valoración + W6·novedad + W7·calidadFotos` con pesos P-14W; con aleatoriedad controlada para no mostrar siempre lo mismo. |
| BR-15 | Intercambio declarado: solo en match `ACTIVE`; inicio ≥ hoy; fin > inicio; 1 ≤ noches ≤ P-06; personas ≤ capacidad de la casa de destino; mascotas solo si la casa las admite. Máx. 1 `PROPOSED` por match. Caduca en P-19 días sin respuesta. |
| BR-16 | Valoraciones: solo participantes de un intercambio `COMPLETED`, una vez, en P-20 días tras la fecha fin; doble ciego; no editables; admin solo puede ocultar el comentario (no la puntuación) por motivos DSA. |
| BR-17 | Premium vigente si `now < premiumUntil`, donde `premiumUntil` = máximo de los derechos (Stripe, fundador, referido, admin). |
| BR-18 | La cancelación de Stripe surte efecto al final del periodo pagado. Sin permanencias. Sin reembolsos salvo desistimiento (BR-34) o decisión de admin auditada. |
| BR-19 | Socio fundador: los primeros P-08 usuarios con identidad aprobada de cada ciudad (contador atómico) reciben P-09 meses de Premium (`source = FOUNDER`). |
| BR-20 | Referidos: cuando el invitado obtiene identidad `APPROVED`, invitador e invitado reciben P-10 días de Premium (`source = REFERRAL`). Máx. P-11 recompensas por invitador y año. Sin recompensa si comparten teléfono o hash de documento. |
| BR-21 | Estados de ciudad los cambia solo superadmin. El progreso muestra casas visibles potenciales (publicadas + identidad aprobada) frente a P-12. |
| BR-22 | Textos de casa y perfil no pueden contener teléfonos, emails, URLs, importes/precios ni vocabulario de alquiler («alquilo», «€/noche», «precio», «se alquila»…). Validación en servidor (lista en `03_TECHNICAL_SPEC.md` §9). |
| BR-23 | Fotos: 5–20 por casa; JPG/PNG/WEBP/HEIC ≤ 10 MB; EXIF eliminado; sin personas identificables ni datos personales visibles (normas de la comunidad). |
| BR-24 | Verificación de identidad **manual**, sin reconocimiento facial ni plantillas biométricas. Documentos solo visibles en visor seguro para admin y cada apertura queda auditada. |
| BR-25 | Documentos de verificación se borran P-13 días después de la decisión (salvo sospecha de fraude). Se conserva solo: resultado, fecha, revisor y hash con sal del número de documento. |
| BR-26 | Suspendido/expulsado: casa oculta, no puede dar me gusta ni declarar intercambios; matches congelados (suspensión) o cerrados (expulsión). |
| BR-27 | Toda restricción (ocultar contenido, suspender, expulsar) va acompañada de declaración de motivos y posibilidad de recurso en P-14R meses. Cualquier persona puede denunciar contenido. |
| BR-28 | Patrocinados: siempre etiquetados; máx. 1 por pantalla; intersticial en el mazo solo para gratis y como mucho cada P-15 tarjetas; sin seguimiento de terceros; categoría seguros desactivada (`P-26 = false`). |
| BR-29 | Baja: datos personales y fotos borrados P-16 días tras la solicitud. Se conservan bloqueados (solo superadmin) los registros de moderación y denuncias durante P-17 `[PENDIENTE abogado]` y los de facturación según obligaciones legales. Valoraciones escritas se muestran como «Usuario dado de baja». |
| BR-30 | Derechos RGPD: respuesta en P-16R (1 mes, ampliable). |
| BR-31 | Importes, estados, fechas, contadores, límites y permisos los calcula y valida **solo el servidor**. |
| BR-32 | Fechas de disponibilidad e intercambios son fechas de calendario (`YYYY-MM-DD`) sin hora. Los cálculos diarios usan `Europe/Madrid`. |
| BR-33 | TinHome no es parte del acuerdo de intercambio ni intermedia pagos entre usuarios. Ningún flujo de la app sugiere alquiler. |
| BR-34 | Desistimiento: 14 días naturales desde la primera contratación; reembolso según P-07. Renovaciones no abren nuevo plazo `[PENDIENTE abogado]`. |
| BR-35 | Textos legales versionados; se registra aceptación (tipo, versión, fecha, IP truncada). Si un texto exige reaceptación, BR-05 lo requiere. |
| BR-36 | Chat: solo entre los dos participantes de un match `ACTIVE`, ambos `ACTIVE` y sin retención preventiva ni bloqueo; texto de 1 a P-28 caracteres; máx. P-29 mensajes por minuto y usuario; sin archivos. Mensajes inmutables (no se editan; el autor puede «eliminar para mí»). |
| BR-37 | Me gusta con mensaje: solo Premium; máx. P-27 al día; ≤ P-40 caracteres; validado con BR-22 salvo la regla de URLs/teléfonos (se bloquean igual). |
| BR-38 | (reservado) |
| BR-39 | Verificación de ubicación: lectura del navegador con precisión ≤ 200 m y distancia al centro de la ciudad ≤ `cities.radiusKm` (P-30 por defecto). Máx. 5 intentos al día. Se guarda resultado, distancia redondeada a 1 km y precisión; coordenadas redondeadas a 2 decimales, borradas a los P-13 días. Revisión manual posible a petición del usuario. |
| BR-40 | Fotos duplicadas: distancia de Hamming entre huellas ≤ P-36 con una foto de otra casa ⇒ retención preventiva y alerta de admin. |
| BR-41 | Advertencias: se registran solo tras moderación confirmada; caducan a los P-31 meses; escalado 1 → advertencia, 2 → suspensión P-32 días, P-33 → expulsión; el admin confirma siempre la sanción propuesta. |
| BR-42 | Retención preventiva: se activa por denuncia grave de usuario verificado, ≥ P-34 denuncias independientes en 30 días, o BR-40/FR-65. Exige declaración de motivos provisional y resolución en P-35 h; no cuenta como advertencia salvo que se confirme. |
| BR-43 | Quejas y reclamaciones: acuse inmediato con número de seguimiento; respuesta en P-38 días; se conservan con la cuenta y P-17 años tras cerrarse. |
| BR-44 | Push: solo con permiso explícito del navegador; nunca para comunicaciones comerciales; respeta las preferencias por tipo. |
| BR-45 | Conservación de mensajes: mientras el match esté activo; tras deshacer/bloquear o baja, bloqueados (solo moderación) P-39 meses y después borrados. |

---

## 9. Parámetros configurables (`config/params`)

| ID | Clave | Valor por defecto | Estado |
|---|---|---|---|
| P-01 | `freeDailyLikes` | 10 | Supuesto |
| P-02 | `premiumHourlyLikeCap` | 60 | Supuesto |
| P-03 | `passHideDays` | 30 | Supuesto |
| P-04 | `topMinRating` | 4.5 | Supuesto |
| P-05 | `topMinReviews` | 3 | Supuesto |
| P-06 | `exchangeMaxNights` | 60 | Supuesto |
| P-07 | `withdrawalRefundMode` | `FULL` (`FULL` \| `PRORATED`) | `[PENDIENTE DEC-63]` |
| P-07D | `withdrawalDays` | 14 | TRLGDCU |
| P-08 | `foundersPerCity` | 100 | Decisión junta |
| P-09 | `founderPremiumMonths` | 12 | Decisión junta |
| P-10 | `referralRewardDays` | 30 | Decisión junta |
| P-11 | `referralMaxRewardsPerYear` | 12 | Supuesto |
| P-12 | `cityOpenThreshold` (por defecto; cada ciudad puede tener el suyo) | 150 | Decisión junta |
| P-13 | `verificationDocsRetentionDays` | 30 | Minimización |
| P-14W | Pesos de ranking `W1..W7` | 30, 20, 25, 10, 8, 5, 2 | Supuesto |
| P-14R | `appealWindowMonths` | 6 | DSA |
| P-15 | `sponsoredEveryNCards` | 12 | Supuesto |
| P-16 | `accountPurgeDays` | 30 | Supuesto |
| P-16R | `gdprResponseDays` | 30 | RGPD |
| P-17 | `moderationRetentionYears` | 5 | `[PENDIENTE abogado]` |
| P-18 | `demandCounterMin` | 5 | Privacidad |
| P-19 | `exchangeProposalExpiryDays` | 7 | Supuesto |
| P-20 | `reviewWindowDays` | 14 | Supuesto |
| P-21 | `premiumMonthlyPriceCents` (IVA incl.) | 999 | `[PENDIENTE DEC-75]` |
| P-22 | `premiumYearlyPriceCents` (IVA incl.) | 7900 | `[PENDIENTE DEC-75]` |
| P-23 | `maxDestinations` | 5 | Supuesto |
| P-24 | `maxFlexibleRanges` | 5 | Supuesto |
| P-25 | `photosMin` / `photosMax` | 5 / 20 | Decisión |
| P-26 | `sponsoredInsuranceEnabled` | `false` | Bloqueado hasta validación legal |
| P-27 | `premiumMessageLikesPerDay` | 5 | Decisión junta técnica |
| P-28 | `chatMessageMaxLength` | 1000 | Supuesto |
| P-29 | `chatMessagesPerMinute` | 20 | Antiabuso |
| P-30 | `locationDefaultRadiusKm` (si la ciudad no define el suyo) | 25 | Supuesto |
| P-31 | `strikeExpiryMonths` | 12 | Decisión junta técnica |
| P-32 | `strikeSuspensionDays` | 7 | Decisión junta técnica |
| P-33 | `strikesForBan` | 3 | Decisión junta técnica |
| P-34 | `preventiveHoldReportsThreshold` | 2 | Decisión junta técnica |
| P-35 | `preventiveHoldReviewHours` | 72 (24 si prioridad alta) | Decisión junta técnica |
| P-36 | `photoDuplicateMaxHamming` | 6 | Supuesto (ajustar con datos reales) |
| P-37 | `photoChangeReviewRatio` | 0.5 | Supuesto |
| P-38 | `complaintResponseDays` | 15 | `[PENDIENTE abogado]` (máximo legal a validar) |
| P-39 | `chatRetentionMonthsAfterClose` | 12 | `[PENDIENTE abogado]` |
| P-40 | `premiumMessageMaxLength` | 280 | Supuesto |

> Los precios reales viven en Stripe (Price IDs en variables de entorno); P-21/P-22 solo se usan para mostrar y deben coincidir. El precio mostrado incluye IVA (obligatorio ante consumidores).

---

## 10. Requisitos no funcionales

| ID | Requisito |
|---|---|
| NFR-01 | **Mobile-first**, responsive hasta escritorio; PWA instalable (manifest + service worker para shell y caché de imágenes). |
| NFR-02 | Rendimiento: LCP < 2,5 s en 4G en Descubrir; interacción de deslizar a 60 fps; mazo precargado (siguiente tarjeta con imagen ya decodificada). |
| NFR-03 | Accesibilidad **WCAG 2.2 AA**: todo gesto tiene alternativa de botón y teclado; contraste ≥ 4,5:1; foco visible; `prefers-reduced-motion` respetado; lector de pantalla anuncia acciones («Me gusta enviado»). |
| NFR-04 | Seguridad: reglas Firestore/Storage con denegación por defecto; escrituras de negocio solo por funciones; 2FA en admin; App Check; secretos en Secret Manager. |
| NFR-05 | Privacidad: región UE (`europe-southwest1`, Madrid); sin cookies no técnicas; analítica de primera parte sin cookies. |
| NFR-06 | Disponibilidad 99,5 % mensual objetivo (servicios gestionados). |
| NFR-07 | Idioma español; todos los textos en ficheros de idioma (`es.json`), nunca literales en componentes. |
| NFR-08 | Fechas y horas con `Europe/Madrid`; reloj inyectable en el dominio para pruebas. |
| NFR-09 | Observabilidad: logs estructurados sin datos personales sensibles; alertas en errores de webhooks y funciones. |
| NFR-10 | Calidad: TypeScript estricto, cobertura ≥ 80 % en `packages/shared` (dominio) y suite completa de reglas de seguridad. |
| NFR-11 | Chat: entrega en < 1 s con la app abierta (p95); funciona con conexión intermitente (persistencia local de Firestore y reintento). |
| NFR-12 | Copias de seguridad: recuperación a un punto en el tiempo (PITR, 7 días) y copias programadas diarias de Firestore con retención de 30 días en la UE; prueba de restauración antes del lanzamiento y cada trimestre. Storage con versionado de objetos 30 días. |
| NFR-13 | Monitorización del cliente: errores de JavaScript del navegador capturados (Sentry, región UE, sin datos personales) con alertas. |
| NFR-14 | Costes: alertas de presupuesto en Google Cloud al 50/80/100 % del límite mensual; cuotas de SMS limitadas. |
| NFR-15 | Moderación: el 95 % de denuncias de prioridad alta revisadas en 24 h y el resto en 72 h (medido en el panel). |

---

## 11. Requisitos legales que afectan al producto (resumen)

> No es asesoramiento jurídico; los textos definitivos los entrega el abogado (`[PENDIENTE PEND-03]`). El producto debe tener **los huecos y mecanismos** preparados.

- **LSSI:** aviso legal con datos de la sociedad; información previa a la contratación.
- **TRLGDCU:** precio final con IVA; desistimiento 14 días con formulario modelo; cancelación sencilla; información de que **entre particulares no aplica la normativa de consumo** (art. 97 bis) y de que TinHome no es parte del acuerdo.
- **DSA (Reglamento UE 2022/2065):** punto de contacto (email + formulario), términos con reglas de moderación, mecanismo de notificación abierto a cualquiera (FR-43), declaración de motivos (FR-44), recurso (FR-45), registro de decisiones.
- **RGPD/LOPDGDD:** base jurídica por tratamiento, EIPD de la verificación de identidad, encargados (Google, Stripe, proveedor de email), derechos (FR-59), minimización (sin dirección exacta; documentos borrados a los 30 días).
- **Inquilinos:** autorización del arrendador obligatoria (FR-08).
- **Ubicación:** dato personal; finalidad única (prevención del fraude de anuncios), información clara antes de pedir el permiso, minimización (resultado + coordenadas redondeadas borradas a los 30 días) e inclusión en la EIPD.
- **Chat:** mensajes moderables a petición (denuncias); sin lectura sistemática por el equipo; conservación P-39; informar en Privacidad.
- **Quejas:** atención y respuesta con plazo; información de las vías oficiales de reclamación de consumo.
- **Publicidad:** «Patrocinado» siempre; no anunciar coberturas de seguro; no prometer «alojamiento gratis» (sí «sin pagar alojamiento»).
- **Consultas abiertas:** registro de viajeros (RD 933/2021) y DAC7 — si aplicaran, el modelo de datos debe poder ampliarse (ver `10_DECISIONS_AND_OPEN_ITEMS.md`).

---

## 12. Fuera de alcance explícito (Fase 1)

Fotos o archivos en el chat · videollamadas · mapa · varias casas por usuario · intercambios por puntos/no recíprocos con compensación · pagos entre usuarios · limpieza, llaves, depósito, seguro, hoteles · reconocimiento facial automático · apps nativas · otros idiomas/países · publicidad programática de terceros.
