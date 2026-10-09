---
description: Construye el siguiente hito pendiente del plan de implementación de TinHome
---

1. Lee `CLAUDE.md` completo.
2. Abre `docs/08_IMPLEMENTATION_PLAN.md` y determina el siguiente hito sin terminar. Para saberlo, revisa el código existente y `docs/PROGRESS.md` (créalo si no existe, con una línea por hito: estado, fecha, notas).
3. Lee todas las secciones indicadas en «Leer» de ese hito.
4. Presenta un plan breve: ficheros a crear o modificar, callables, reglas, pantallas y pruebas. Si hay contradicciones o decisiones ausentes, pregúntame antes de seguir.
5. Implementa siguiendo el flujo de `CLAUDE.md` §5 (shared → functions → web → pruebas → seed).
6. Ejecuta `pnpm lint && pnpm typecheck && pnpm test && pnpm test:rules` hasta verde.
7. Comprueba la DoD del hito y la general. Actualiza `docs/PROGRESS.md`.
8. Haz commit con Conventional Commits.
9. Infórmame: qué se hizo, cómo probarlo paso a paso (con usuarios demo), decisiones tomadas y pendientes. Espera mi confirmación antes del siguiente hito.

$ARGUMENTS
