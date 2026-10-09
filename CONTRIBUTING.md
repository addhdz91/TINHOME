# Cómo contribuir a TinHome

Válido para personas y agentes de IA. Lee también `CLAUDE.md` y `docs/06_CODING_STANDARDS.md`.

## 1. Preparar el entorno

Requisitos: Node 22 LTS, pnpm 9+, Java 17+ (emuladores de Firebase), Stripe CLI (para pagos en local). La Firebase CLI **no** hace falta instalarla globalmente: es dependencia de desarrollo (`firebase-tools`); úsala con `pnpm exec firebase …`.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local     # VITE_USE_EMULATORS=true
pnpm dev                                          # web + emuladores
pnpm seed                                         # datos de ejemplo
```

## 2. Ramas y commits

- Rama desde `main`: `feat/<hito-o-FR>-descripcion`, `fix/<id>-descripcion`, `docs/<tema>`.
- **Conventional Commits** en inglés: `feat(discover): …`, `fix(functions): …`, `test(rules): …`, `docs(pack): …`, `chore: …`.
- Commits pequeños y con sentido; un PR por funcionalidad o hito parcial.

## 3. Antes de abrir un PR

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:rules
```

Checklist del PR:
- [ ] Referencia a los IDs del pack (FR, BR, hito) en la descripción.
- [ ] Pruebas nuevas o actualizadas (dominio, callables, reglas, componentes, E2E si es flujo crítico).
- [ ] Contratos sincronizados (zod ↔ `05_API_CONTRACT.md` ↔ `openapi.yaml`).
- [ ] UI revisada con la checklist de `02_UX_UI_SPEC.md` §11 (adjunta capturas móvil y escritorio, claro y oscuro).
- [ ] Sin PII en logs, sin secretos, sin textos literales en JSX.
- [ ] Documentación del pack actualizada si cambia el comportamiento.

## 4. Recetas

### Añadir una callable
1. Esquemas `XxxInput`/`XxxOutput` en `packages/shared/src/schemas/<modulo>.ts`.
2. Lógica de dominio pura en `packages/shared/src/domain` con pruebas.
3. Callable en `functions/src/modules/<modulo>/callables.ts` siguiendo la plantilla (sesión → guardas → zod → parámetros → dominio → transacción → efectos → salida).
4. Exportar en `functions/src/index.ts`; prueba de integración con emuladores para el caso feliz y cada error.
5. Cliente tipado en `apps/web/src/lib/callables.ts` y hook en `features/<x>/api`.
6. Documentar en `05_API_CONTRACT.md` y regenerar/editar `openapi.yaml`.

### Cambiar las reglas de seguridad
Editar `firestore.rules`/`storage.rules` **y** `tests/rules/*` en el mismo commit; cubrir el caso permitido y el denegado.

### Añadir una pantalla
Ruta *lazy* en la *feature*, estados de carga/vacío/error, textos en `es.json`, tokens, accesibilidad, prueba de componente.

### Añadir un parámetro de negocio
`01_PRD.md` §9 → valor por defecto en `packages/shared/src/constants/params.ts` → `seed` → `config/public` si lo usa el cliente.

### Proponer una decisión de arquitectura
Añade un ADR con la plantilla de `docs/07_ADR.md` en estado «Propuesto» y pide revisión.

### Textos legales
El equipo no redacta cláusulas definitivas. Se publican desde el panel (`adminPublishLegalDoc`) con el texto que entregue el abogado. Los borradores llevan «PROVISIONAL».

## 5. Revisión de código

Se revisa: corrección de reglas de negocio, seguridad (reglas, guardas, PII), contratos, accesibilidad y calidad de la experiencia, pruebas. Un PR con algo en rojo no se fusiona.
