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
| 09/10/2026 | `03_TECHNICAL_SPEC` §5.1 (CORS) | No está decidido el dominio público de producción. | CORS admite `*.web.app`/`*.firebaseapp.com` y orígenes extra por `CORS_ORIGINS`. **Pregunta abierta:** ¿dominio definitivo? |
