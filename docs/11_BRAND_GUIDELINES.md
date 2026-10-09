# 11 · BRAND GUIDELINES — Manual de marca TinHome

| Campo | Valor |
|---|---|
| Versión | 1.0 · 09/10/2026 |
| Estado | Aprobado (DEC-62) |
| Recursos | `assets/brand/` (logos, favicons, `tokens.css`, `site.webmanifest`, `head-snippet.html`, `brand-contact-sheet.png`) |

> **Para agentes de IA:** usa siempre los ficheros de `assets/brand/`. **No** redibujes, recolorees ni recrees el logo con texto o SVG inventado. Los colores de la interfaz salen de `assets/brand/tokens.css`.

---

## 1. El logo

Dos casas (violeta y azul) que se cruzan alrededor de un pin con el mundo, rodeadas por flechas de intercambio, y el logotipo «Tin» en violeta + «Home» en azul con una casita dentro de la «o». Transmite: **intercambio, dos casas, viajar, confianza**.

| Pieza | Uso |
|---|---|
| **Logo completo** (isotipo + logotipo apilados) | Landing (héroe en escritorio), emails, pantalla de bienvenida, materiales |
| **Horizontal** (isotipo a la izquierda + logotipo) | Cabecera de la web en escritorio y en la landing, pie de página, cabecera de emails |
| **Isotipo** (solo las casas) | Cabecera móvil de la app, avatar de redes, pantallas de carga, marca de agua |
| **Marca de favicon** (casita blanca sobre degradado) | Favicon de 16–48 px |
| **Icono de app** (isotipo blanco sobre degradado redondeado) | PWA, icono de inicio, iOS |

## 2. Variantes y cuándo usarlas

| Fichero (`assets/brand/logo/`) | Fondo | Uso |
|---|---|---|
| `tinhome-logo-light.png` · `tinhome-horizontal-light.png` · `tinhome-symbol-light.png` · `tinhome-wordmark-light.png` | Claro (`#FFFFFF`, `#F7F6FB`, grises claros) | **Tema claro** |
| `tinhome-logo-dark.png` · `tinhome-horizontal-dark.png` · `tinhome-symbol-dark.png` · `tinhome-wordmark-dark.png` | Oscuro (`#0F0D1A`) y **negro** (`#000`) | **Temas oscuro y negro**. Colores aclarados un 18 % para mantener vibración y legibilidad sobre negro |
| `…-mono-white.png` | Degradado de marca, fotos, colores saturados | Sobre el botón/héroe con degradado, sobre fotos con *scrim*, materiales a una tinta |
| `tinhome-logo-original.png` | — | Original de referencia (fondo blanco). No usar en la interfaz |
| `og-image-1200x630.png` | — | Imagen para compartir enlaces (Open Graph) |
| `tinhome-favicon-mark-512.png` | — | Fuente de la marca de favicon |

Todas las variantes tienen **fondo transparente** salvo el original y la imagen OG.

Vista de comprobación: `assets/brand/brand-contact-sheet.png` (claro, oscuro, negro, monocromo, horizontal, iconos y favicons a 16/32/48 px).

## 3. Reglas de uso

- **Área de seguridad:** deja alrededor del logo un margen mínimo igual a la altura de la casita de la «o» (≈ 1/4 de la altura del logotipo).
- **Tamaños mínimos:** isotipo 24 px de alto; horizontal 120 px de ancho; logo completo 96 px de ancho. Por debajo, usa la marca de favicon.
- **No:** deformar, rotar, cambiar colores, añadir sombras o contornos, colocar la versión clara sobre fondo oscuro (o al revés), poner el logo a color sobre fotos sin *scrim*, separar «Tin» y «Home», escribir «Tinhome» o «TINHOME» en textos (se escribe **TinHome**).
- En la interfaz se usa siempre a través del componente `TinHomeLogo` (C-25), que elige la variante según el tema.
- **Pendiente recomendado:** pedir al diseñador una versión **vectorial (SVG)** del logo para impresión y tamaños grandes; los PNG actuales (base 1254 px) son suficientes para web y app.

## 4. Colores corporativos

Extraídos del logo (mínimo tres, como se pidió):

| Muestra | Nombre | Hex | RGB | Rol principal |
|---|---|---|---|---|
| 🟪 | **Violeta TinHome** | `#8257E5` | 130, 87, 229 | Identidad, «Tin», chips y badges de marca |
| 🟦 | **Azul TinHome** | `#0A6CF0` | 10, 108, 240 | **Primario de la interfaz**: botones, enlaces, foco |
| 🔷 | **Azul Cielo** | `#2191FC` | 33, 145, 252 | Acento: ilustraciones, gráficos, destacados |
| 🟣 | **Violeta Profundo** | `#6440CB` | 100, 64, 203 | Hover del violeta, texto violeta sobre claro |
| 🌈 | **Degradado TinHome** | `#8257E5 → #0A6CF0` (135°) | — | Me gusta, CTA principal, match, icono de app |

Proporción recomendada en pantalla: **60 % neutros** (fondos y superficies) · **30 % azul** (acciones) · **10 % violeta y degradado** (momentos de marca: me gusta, match, Premium de marca, héroe). El degradado es un recurso especial: **un elemento con degradado por pantalla** como máximo.

Neutros (con un ligero matiz violeta, a juego con la marca): tinta `#1B1830` · texto secundario `#5B5670` · fondo `#F7F6FB` · borde `#E4E1EE`.

Escalas 50–950 y tokens completos: `02_UX_UI_SPEC.md` §3.1–3.2 y `assets/brand/tokens.css`.

## 5. Temas claro, oscuro y negro

| | Claro | Oscuro | Negro (OLED) |
|---|---|---|---|
| Fondo | `#F7F6FB` | `#0F0D1A` (azul noche violáceo) | `#000000` |
| Superficie | `#FFFFFF` | `#1A1730` | `#0E0D14` |
| Texto | `#1B1830` | `#F4F2FA` | `#F4F2FA` |
| Primario (botón) | `#0A6CF0` + texto blanco | `#458FF4` + texto `#0B0820` | `#458FF4` + texto `#0B0820` |
| Violeta para texto | `#6440CB` | `#BEA8F1` | `#BEA8F1` |
| Degradado | Igual en los tres (texto blanco ≥ 4,7:1) | | |
| Logo | Variante `light` | Variante `dark` | Variante `dark` |
| Elevación | Sombras suaves | Superficie más clara + borde | Borde de 1 px |

Buenas prácticas para fondos oscuros y negros:
- Los colores de marca a 500 se reservan para **rellenos grandes** (botones, degradado); para **texto e iconos pequeños** se usan los pasos 300–400 (más claros), que superan 4,5:1.
- No usar blanco puro para bloques grandes de texto en negro: `#F4F2FA` reduce el deslumbramiento.
- En negro, evitar grandes superficies saturadas; separar con bordes, no con sombras.
- El tema se elige en Ajustes (Sistema · Claro · Oscuro · Negro) y se aplica sin parpadeo (`assets/brand/head-snippet.html`).

## 6. Tipografía

- **Nunito** (700/800) para titulares: redondeada y amable, coherente con el logotipo.
- **Inter** (400/500/600) para texto e interfaz.
- Ambas autoalojadas (`@fontsource-variable/nunito`, `@fontsource-variable/inter`).

## 7. Iconos de la app y favicon

| Fichero (`assets/brand/favicon/`) | Tamaño | Destino en `apps/web/public/` |
|---|---|---|
| `favicon.ico` (16, 32, 48) | multi | `/favicon.ico` |
| `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | 16–48 px | `/` |
| `apple-touch-icon.png` | 180 px, sin transparencia | `/apple-touch-icon.png` |
| `icon-192.png`, `icon-512.png` | PWA `any` (esquinas redondeadas) | `/icons/` |
| `icon-maskable-512.png` | PWA `maskable` (sangrado completo, isotipo en zona segura) | `/icons/` |
| `../site.webmanifest` | — | `/site.webmanifest` |
| `../logo/og-image-1200x630.png` | 1200 × 630 | `/og-image-1200x630.png` |

- A 16–48 px el isotipo completo no se distingue, así que el favicon usa la **casita de la «o»** en blanco sobre el degradado: se reconoce igual sobre pestañas claras y oscuras.
- A partir de 192 px se usa el **isotipo completo en blanco** sobre el degradado.

## 8. Voz de marca (resumen)

Cercana (tú), clara, optimista y honesta. Hablamos de **intercambiar**, **casas**, **viajar** y **confianza**; nunca de alquilar, precios por noche ni alojamiento «gratis». Ver `02_UX_UI_SPEC.md` §7.
