# Runbook — Copias de seguridad y restauración (NFR-12)

> Estado: **preparado, pendiente de ensayo en staging**. Desde el entorno de desarrollo no hay acceso a un proyecto real, así que el procedimiento no se ha ejecutado todavía. El ensayo es obligatorio antes del lanzamiento y cada trimestre: anota fecha, duración y resultado en §6.

## 1. Qué está protegido

| Dato | Mecanismo | Retención | Configurado por |
|---|---|---|---|
| Firestore (todo) | PITR (recuperación a un punto en el tiempo) | 7 días, granularidad de 1 min | `scripts/ops/configure-gcp.sh` |
| Firestore (todo) | Copia programada diaria | 30 días, en `europe-southwest1` | idem |
| Storage (fotos y documentos) | Versionado de objetos | versiones antiguas 30 días | idem (`lifecycle`) |
| Storage `private/exports/` | Borrado automático | 1 día (descargas RGPD y CSV) | idem |
| Código, reglas e índices | Git + despliegue reproducible | — | CI |
| Auth (cuentas) | **Sin copia nativa** → exportación semanal cifrada (§4) | 30 días | manual / tarea programada |

Los documentos de identidad se borran a los 30 días de la revisión (FR-29): una restauración **no debe resucitarlos**. Después de restaurar, ejecuta a mano los jobs de borrado (§3, paso 6).

## 2. Configuración inicial (una vez por proyecto)

```bash
scripts/ops/configure-gcp.sh tinhome-staging          # muestra los comandos (simulación)
APPLY=1 scripts/ops/configure-gcp.sh tinhome-staging  # los aplica
pnpm exec firebase deploy --only firestore:indexes,firestore:rules,storage -P staging
```

Comprueba que:

- `gcloud firestore backups schedules list --database='(default)'` muestra la copia diaria.
- `gcloud firestore databases describe --database='(default)'` muestra `pointInTimeRecoveryEnablement: POINT_IN_TIME_RECOVERY_ENABLED`.

## 3. Restaurar Firestore

Nunca se restaura **encima** de la base de producción. Se restaura en una base nueva, se valida y después se copia lo necesario.

1. **Detén las escrituras automáticas:** pausa los jobs J-01…J-14 en Cloud Scheduler. Avisa al equipo y, si el incidente afecta a usuarios, publica un aviso en la web.
2. **Elige el origen:**
   - Error de hace menos de 7 días → PITR. Exporta en el minuto anterior al error: `gcloud firestore export gs://<bucket-ops>/pitr-<fecha> --database='(default)' --snapshot-time=<RFC3339 redondeado al minuto>`. Después impórtalo en una base nueva con `gcloud firestore import`.
   - Error más antiguo → copia diaria: `gcloud firestore backups list --location=europe-southwest1`.
3. **Restaura en una base nueva:**
   ```bash
   gcloud firestore databases restore \
     --source-backup=projects/<proyecto>/locations/europe-southwest1/backups/<id> \
     --destination-database=restore-AAAAMMDD
   ```
4. **Valida** en la base restaurada (`--database=restore-AAAAMMDD`) estos cinco puntos:
   - número de `users`;
   - `homes` visibles por ciudad;
   - `matches` activos;
   - último `auditLog`;
   - `config/params`.
5. **Recupera:**
   - Daño parcial: copia los documentos afectados a `(default)` con un script puntual revisado por dos personas.
   - Desastre total: sigue la guía de Google para cambiar de base (requiere desplegar).
6. **Vuelve a aplicar los borrados legales:** fuerza J-04 (documentos de identidad), J-05 (bajas vencidas), J-10 (coordenadas) y J-14 (chats) desde Cloud Scheduler.
7. **Reanuda y registra:**
   - Reactiva los jobs.
   - Anota el incidente en `auditLog` (acción `ops.restore`).
   - Si hubo datos personales afectados, anótalo en el registro de brechas: RGPD art. 33 da 72 h para notificar a la AEPD.

## 4. Auth

```bash
pnpm exec firebase auth:export auth-AAAAMMDD.json --format=json -P prod
gpg --symmetric --cipher-algo AES256 auth-AAAAMMDD.json && shred -u auth-AAAAMMDD.json
# Guarda el .gpg fuera del proyecto (bucket de operaciones con acceso restringido).
```

Para restaurar usa `firebase auth:import` con los parámetros de hash del proyecto (`gcloud identity-platform config describe`).

## 5. Storage

Para recuperar un objeto borrado o sobrescrito:

```bash
gcloud storage ls -a gs://<bucket>/homes/<uid>/photos/
gcloud storage cp "gs://<bucket>/<ruta>#<generación>" "gs://<bucket>/<ruta>"
```

## 6. Registro de ensayos

| Fecha | Entorno | Origen | Duración | Resultado | Responsable |
|---|---|---|---|---|---|
| _pendiente_ | staging | copia diaria | — | — | — |
