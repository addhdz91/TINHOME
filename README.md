# TinHome — Fase 1 · Pack de definición para desarrollo con IA (v2.2 · junta técnica)

**TinHome** es una aplicación web (PWA) para que residentes en España **intercambien sus casas para viajar**: publicas tu casa gratis, descubres casas deslizando tarjetas, das «me gusta» y, si el interés es mutuo, hacéis **match**, habláis por el **chat** y acordáis el intercambio directamente. El plan **Premium** da me gusta ilimitados, **me gusta con mensaje**, ver quién te ha dado me gusta, más visibilidad y acceso a las **Casas Top**. Incluye verificación de identidad y de ubicación, denuncias con sistema de advertencias, centro de ayuda y quejas.

Este repositorio empieza con la documentación necesaria para que un desarrollador o un agente de IA (Claude Code, Cursor, Codex…) construya el producto completo sin interpretar la intención del negocio.

## Cómo usar este pack con Claude Code

1. Crea un repositorio vacío y copia dentro el contenido de este pack (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `docs/`, `assets/`, `.claude/`, `.cursor/`).
2. Abre Claude Code en esa carpeta y escribe: **`/hito`** (o «Lee CLAUDE.md y construye el siguiente hito del plan»).
3. Claude Code construirá **M0** (monorepo), se detendrá y te explicará cómo probarlo. Repite `/hito` para cada hito hasta **M10**.
4. Usa **`/revisar-ux`** tras cada hito con pantallas para una revisión de experiencia y accesibilidad.

## Índice

| Fichero | Contenido |
|---|---|
| `CLAUDE.md` | Instrucciones para Claude Code (reglas de oro, comandos, flujo de trabajo) |
| `AGENTS.md` | Resumen para cualquier agente de IA |
| `CONTRIBUTING.md` | Cómo trabajar en el proyecto (ramas, PRs, recetas) |
| `docs/01_PRD.md` | Product Requirements Document: funcionalidades, reglas, parámetros, criterios |
| `docs/02_UX_UI_SPEC.md` | Experiencia y diseño: navegación, tokens, componentes, pantallas, textos |
| `docs/03_TECHNICAL_SPEC.md` | Especificación técnica: arquitectura, stack, algoritmos, pagos, entornos |
| `docs/04_DATABASE_SCHEMA.md` | Firestore y Storage: colecciones, campos, índices, reglas |
| `docs/05_API_CONTRACT.md` | Contrato de las Cloud Functions y catálogo de errores |
| `docs/openapi.yaml` | Especificación OpenAPI 3.1 de las funciones |
| `docs/06_CODING_STANDARDS.md` | Estándares de código |
| `docs/07_ADR.md` | Registro de decisiones de arquitectura |
| `docs/08_IMPLEMENTATION_PLAN.md` | Hitos M0–M10 con definición de terminado |
| `docs/09_TESTING_AND_QA.md` | Estrategia y casos de prueba |
| `docs/10_DECISIONS_AND_OPEN_ITEMS.md` | Decisiones vigentes, pendientes y Fase 2 |
| `docs/11_BRAND_GUIDELINES.md` | Manual de marca: logo, variantes, colores corporativos, temas claro/oscuro/negro, favicon |
| `assets/brand/` | Logos (claro, oscuro, monocromo, horizontal, isotipo), favicons e iconos PWA, `tokens.css`, `site.webmanifest`, `head-snippet.html` |

## Estado

- Alcance: **Fase 1** (matching). La Fase 2 (Pack Protección: limpieza, llaves, depósito, seguro) está especificada en el pack v1.2 y **no** forma parte de este repositorio.
- Pendientes que no bloquean el desarrollo pero sí el lanzamiento: precios (DEC-75), textos legales, proveedor de email, consultas sobre registro de viajeros y DAC7 (ver `docs/10_DECISIONS_AND_OPEN_ITEMS.md`).
