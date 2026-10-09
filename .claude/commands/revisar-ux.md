---
description: Revisa la experiencia, el diseño y la accesibilidad de las pantallas implementadas
---

Actúa como diseñador de producto senior y especialista en accesibilidad. Para cada pantalla implementada (o la indicada en $ARGUMENTS):

1. Compárala con `docs/02_UX_UI_SPEC.md` (pantalla S-xx, componentes C-xx, principios UX-1…UX-8, microcopy §7).
2. Pasa la checklist de §11: 360/768/1280 px, carga/vacío/error, textos en `es.json`, tokens (sin hex), temas claro, oscuro y negro, teclado, lector de pantalla, contraste AA, acciones optimistas.
3. Ejecuta axe en las pruebas de componentes o en Playwright y reporta violaciones.
4. Señala fricciones de usabilidad: más de una acción principal, bloqueos sin explicación, textos poco claros, pasos innecesarios.
5. Devuelve una lista priorizada (Crítico / Importante / Mejora) con la corrección propuesta y, si te lo confirmo, aplícala.
