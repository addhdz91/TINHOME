# 09 · TESTING & QA — TinHome Fase 1

| Campo | Valor |
|---|---|
| Versión | 2.0 · 08/10/2026 |

## 1. Pirámide de pruebas

| Nivel | Herramienta | Qué cubre | Objetivo |
|---|---|---|---|
| Unitarias de dominio | Vitest | `packages/shared/domain`: elegibilidad, compatibilidad, ranking, fechas, validación de textos, intercambios, Premium | ≥ 90 % líneas |
| Componentes | Vitest + Testing Library | Componentes C-xx con estados y accesibilidad (`jest-axe`) | Componentes críticos |
| Reglas de seguridad | `@firebase/rules-unit-testing` + emulador | Cada colección y ruta de Storage: permitido y denegado por rol/estado | 100 % de colecciones |
| Integración de funciones | Vitest + emuladores | Cada callable: camino feliz, cada error del catálogo que aplique, guardas | 100 % de callables |
| E2E | Playwright (Chromium + WebKit móvil) | Flujos críticos §3 | En CI contra emuladores; en staging tras despliegue |
| No funcionales | Lighthouse CI, axe, perfil de rendimiento | NFR-01–03 | Umbrales §4 |

Reglas: reloj inyectado y fijo; datos generados con *factories* en `tests/factories`; cada prueba limpia los emuladores (`clearFirestoreData`).

## 2. Casos de dominio imprescindibles

| ID | Caso | Regla |
|---|---|---|
| T-D01 | Menor de 18 el día anterior a cumplir años → rechazado; el día del cumpleaños → aceptado | BR-01 |
| T-D02 | `getLikeBlockers` devuelve cada bloqueo de forma independiente y en orden de resolución | BR-05 |
| T-D03 | Límite diario: el contador se reinicia a las 00:00 `Europe/Madrid` (incluido cambio de horario de verano) | BR-06, BR-32 |
| T-D04 | Compatibilidad: encaje de destino mutuo, ventanas comunes, solape de rangos (bordes incluidos), «cualquier ciudad abierta» | §8 spec |
| T-D05 | Ranking: con igual puntuación, el ruido determinista es estable para el mismo usuario y día | BR-14 |
| T-D06 | Validación de textos: detecta teléfonos con espacios/puntos, emails ofuscados, «€/noche», «alquilo»; no da falsos positivos con «2 dormitorios» o «a 300 m de la playa» | BR-22 |
| T-D07 | Intercambio: fechas inválidas, noches > P-06, capacidad, mascotas, propuesta duplicada | BR-15 |
| T-D08 | Valoraciones: doble ciego (publica al valorar el segundo o al vencer el plazo) | BR-16 |
| T-D09 | `premiumUntil` como máximo de derechos solapados; derecho revocado ignorado | BR-17 |
| T-D10 | Fundador: el 101.º aprobado de una ciudad no recibe Premium | BR-19 |
| T-D11 | Referido: sin recompensa si comparten hash de documento o teléfono; tope anual | BR-20 |
| T-D12 | Casa Top: 4,5 con 3 valoraciones sí; 4,49 o 2 valoraciones no | BR-13 |
| T-D13 | Chat: participante, match inactivo, retención, longitud, 20/min, idempotencia por `clientRequestId`, detección de menciones de pago | BR-36 |
| T-D14 | Me gusta con mensaje: solo Premium, 5/día, validación de texto | BR-37 |
| T-D15 | Ubicación: *haversine*, precisión > 200 m → `INACCURATE`, borde exacto del radio, 5 intentos/día | BR-39 |
| T-D16 | dHash: misma foto recomprimida/redimensionada → Hamming ≤ 6; fotos distintas > 6; el índice por bandas encuentra todos los pares ≤ 7 | BR-40 |
| T-D17 | Advertencias: escalado 1/2/3, caducidad a 12 meses, revocación por recurso | BR-41 |
| T-D18 | Retención preventiva: denuncia grave de verificado, 2 denunciantes distintos, mismo denunciante dos veces no cuenta | BR-42 |

## 3. Flujos E2E críticos

| ID | Flujo |
|---|---|
| E2E-01 | Visitante → lista de espera → confirma → ve progreso de su ciudad |
| E2E-02 | Registro email → verificación → teléfono → casa con 5 fotos → preferencias → identidad enviada → publicar |
| E2E-03 | Admin con TOTP aprueba identidad → la casa aparece en el mazo de otro usuario |
| E2E-04 | A da me gusta a B; B da me gusta a A → celebración → ambos ven el teléfono y el enlace de WhatsApp |
| E2E-05 | Usuario gratis agota 10 me gusta → hoja Premium → Checkout (test) → me gusta ilimitados |
| E2E-06 | Declarar intercambio → confirmar → (reloj) completar → valorar ambos → valoraciones visibles → Casa Top |
| E2E-07 | Bloquear desde la ficha → la casa y el match desaparecen para ambos |
| E2E-08 | Denuncia pública → admin oculta la casa con declaración de motivos → el titular recibe email y recurre |
| E2E-09 | Ciudad en lista de espera: se puede mirar, pero el me gusta muestra el bloqueo |
| E2E-10 | Baja de cuenta → casa oculta al instante → purga tras P-16 (reloj) |
| E2E-11 | Desistimiento en el día 10 → reembolso y fin de Premium; en el día 15 no está disponible |
| E2E-12 | Navegación completa de Descubrir solo con teclado y con lector de pantalla (comprobación de anuncios ARIA) |
| E2E-13 | Match → chat en dos navegadores: mensaje en < 1 s, ✓✓ leído, sin conexión y reconexión, compartir teléfono → aparece WhatsApp |
| E2E-14 | Premium envía me gusta con mensaje → el receptor gratis lo ve destacado → match → el mensaje abre el chat |
| E2E-15 | Ubicación simulada dentro y fuera del radio (Playwright `geolocation`), y escritorio → QR |
| E2E-16 | Denunciar un mensaje por «Trato grosero» → alerta en el panel → advertencia registrada → el usuario ve `StrikeNotice` y recurre |
| E2E-17 | Subir una foto duplicada de otra casa → retención preventiva → admin libera |
| E2E-18 | Ayuda: buscar «verificación» → artículo → «Contactar» → queja con número de seguimiento → respuesta del admin visible |
| E2E-19 | Push: aceptar permiso tras el primer match → mensaje nuevo genera notificación (Chromium) |

## 4. Umbrales no funcionales

- Lighthouse (móvil, landing y Descubrir): Rendimiento ≥ 85, Accesibilidad ≥ 95, Buenas prácticas ≥ 95, SEO (landing) ≥ 95.
- LCP < 2,5 s (4G simulada); CLS < 0,1; INP < 200 ms.
- Bundle inicial de la app (sin admin) < 250 KB gzip.
- axe: 0 violaciones serias o críticas en todas las pantallas **y en los tres temas**.

## 5. Pruebas manuales antes de cada versión

- Dispositivos: iPhone (Safari), Android medio (Chrome), escritorio (Chrome, Firefox, Safari).
- Lector de pantalla: VoiceOver iOS y TalkBack en Descubrir → Match → Contacto.
- Temas **claro, oscuro y negro** en todas las pantallas (logo en la variante correcta, `theme-color` de la barra del navegador, sin parpadeo al recargar).
- Favicon e icono de la PWA visibles y nítidos en pestañas claras y oscuras, iOS (añadir a inicio) y Android (icono adaptable).
- Textos: revisión ortográfica de `es.json` y plantillas de email.
- Seguridad: intentar leer documentos de otro usuario, intentar escribir en `homes` desde la consola del navegador, acceder a `/admin` sin TOTP.
