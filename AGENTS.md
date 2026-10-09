# AGENTS.md — Guía para agentes de IA (Codex, Cursor, Copilot, Claude y otros)

> Este fichero resume las reglas para cualquier agente. La versión completa, válida para todos, está en **`CLAUDE.md`**: léela primero.

## Proyecto
TinHome Fase 1: PWA en español de **intercambio de casas con match** (deslizar tarjetas). TinHome conecta; los usuarios acuerdan directamente. Ingresos: Premium (Stripe) y patrocinados propios.

## Stack
TypeScript estricto · React 19 + Vite · Tailwind v4 + shadcn/ui + motion · Firebase (Auth/Identity Platform, Firestore, Storage, Functions 2nd gen Node 22, Hosting, App Check) · Stripe · pnpm monorepo (`apps/web`, `functions`, `packages/shared`).

## Setup y comandos
```bash
pnpm install && pnpm dev     # web + emuladores
pnpm seed                    # datos de ejemplo
pnpm lint && pnpm typecheck && pnpm test && pnpm test:rules
pnpm test:e2e
```

## Reglas imprescindibles
1. Construye por hitos en orden (`docs/08_IMPLEMENTATION_PLAN.md`); uno cada vez.
2. Fuente de verdad: `docs/01_PRD.md` (reglas BR-xx y parámetros P-xx), `docs/04_DATABASE_SCHEMA.md`, `docs/05_API_CONTRACT.md`.
3. Sin `any` ni `@ts-ignore`; tipos y zod en `packages/shared`.
4. Escrituras de negocio solo por callables con validación, guardas, transacciones y auditoría; reglas de seguridad con denegación por defecto y pruebas.
5. UI: tokens de `assets/brand/tokens.css` (nunca hex), temas claro/oscuro/negro, logo y favicons de `assets/brand/` según `docs/11_BRAND_GUIDELINES.md`, textos en `es.json`, estados de carga/vacío/error, móvil 360 px, accesible (WCAG 2.2 AA).
6. Sin PII sensible en logs; secretos en Secret Manager.
7. No implementar Fase 2 (limpieza, llaves, depósito, seguro, pagos entre usuarios, archivos en el chat). El chat de texto tras el match **sí** es Fase 1.
8. Contradicciones o decisiones ausentes → `docs/10_DECISIONS_AND_OPEN_ITEMS.md` §5 y preguntar.
9. Conventional Commits; nada en rojo se fusiona.

## Estilo de código
Ver `docs/06_CODING_STANDARDS.md` (nombres, estructura por *feature*, React, Functions, errores, pruebas).
