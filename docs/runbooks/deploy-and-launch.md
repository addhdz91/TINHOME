# Runbook — Despliegue a staging/producción y lanzamiento (M10)

> Estado: **preparado, no ejecutado**. El entorno de desarrollo no tiene credenciales de Google Cloud ni de Stripe. Cada paso indica cómo comprobarlo. Marca la casilla y deja fecha e iniciales.

## 1. Requisitos por proyecto (`tinhome-staging`, `tinhome-prod`)

- [ ] Proyecto Firebase en plan Blaze. Firestore, Storage y Functions en **`europe-southwest1`** (NFR-05).
- [ ] Identity Platform activado con MFA (SMS y TOTP) para el panel (FR-48).
- [ ] App Check con reCAPTCHA Enterprise. Aplicación **forzada** en Firestore, Storage y Functions una vez que las métricas muestren tráfico verificado.
- [ ] `scripts/ops/configure-gcp.sh <proyecto>` aplicado: PITR, copias, TTL, versionado, alertas ([backups-and-restore.md](backups-and-restore.md)).
- [ ] Presupuesto y alerta de facturación (p. ej. 50/80/100 % de 100 €/mes en staging).

### Secretos (Secret Manager)

Se configuran con `pnpm exec firebase functions:secrets:set <NOMBRE> -P <proyecto>`.

| Secreto | Uso |
|---|---|
| `STRIPE_SECRET_KEY` | API de Stripe (test en staging, live en prod) |
| `STRIPE_WEBHOOK_SECRET` | Firma de `stripeWebhook` |
| `DOC_HASH_PEPPER` | HMAC del número de documento (FR-29). **No rotar** sin migración: invalida la detección de duplicados |
| `EMAIL_API_KEY` | Proveedor de email (DEC-69) |

### Variables de las funciones (`functions/.env.<proyecto>`, sin secretos)

`PUBLIC_URL`, `CORS_ORIGINS`, `STORAGE_BUCKET`, `EMAIL_PROVIDER=http`, `EMAIL_API_URL`, `EMAIL_FROM`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.

### Variables de la web (`apps/web/.env.<modo>`, públicas)

- Firebase: `VITE_FIREBASE_*` (config, sin secretos).
- `VITE_FIREBASE_VAPID_KEY`: clave pública de web push.
- `VITE_APPCHECK_SITE_KEY`.
- `VITE_SENTRY_DSN` y `VITE_SENTRY_ENVIRONMENT`.
- `VITE_PUBLIC_URL`.
- `VITE_USE_EMULATORS=false`.

Si el DSN de Sentry está en una región distinta de `*.ingest.sentry.io` / `*.ingest.de.sentry.io`, añádela a `connect-src` en `firebase.json`.

## 2. Despliegue

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test && pnpm test:rules && pnpm test:e2e
pnpm build && pnpm --filter @tinhome/web size        # presupuesto 250 KB gzip (09 §4)
pnpm exec firebase deploy -P staging --only firestore:rules,firestore:indexes,storage
pnpm exec firebase deploy -P staging --only functions
pnpm exec firebase deploy -P staging --only hosting
```

Después del despliegue:

1. **Parámetros:** sin `config/params` las funciones usan los valores por defecto (`PARAM_DEFAULTS`) y la web usa su copia local. Revisa los valores en `/admin/parametros` y guarda una vez: así se escriben `config/params` y `config/public`.
2. **Superadmin inicial:** `GCLOUD_PROJECT=<proyecto> GOOGLE_APPLICATION_CREDENTIALS=… pnpm set-role <email> superadmin`. Después, primer acceso con segundo factor.
3. **Webhook de Stripe:** apunta a `https://europe-southwest1-<proyecto>.cloudfunctions.net/stripeWebhook` con los eventos `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` e `invoice.payment_failed`.
4. **Humo manual:**
   - landing;
   - registro con email real;
   - SMS de verificación;
   - pago de prueba (tarjeta 4242);
   - «Continuar con Google» en `/entrar` y `/registro`, y la reautenticación con Google (popup sin precarga, 10 §5);
   - web push en Android Chrome y en iOS con la PWA instalada;
   - `curl -I https://<dominio>/` → `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`.

## 3. Comprobaciones de calidad antes de abrir

- [ ] E2E críticos en verde **contra staging** (`PLAYWRIGHT_BASE_URL`, con usuarios de prueba propios en lugar del seed).
- [ ] Lighthouse móvil en `/` y `/app/descubrir`: LCP < 2,5 s (4G), CLS < 0,1, INP < 200 ms (09 §4).
- [ ] Deslizar a 60 fps en un Android de gama media (perfil de rendimiento de Chrome).
- [ ] Lector de pantalla: VoiceOver en iOS y TalkBack en el recorrido Descubrir → Match → Contacto (09 §4). La parte automática (axe, tres temas) ya está en E2E-11.
- [ ] Ensayo de restauración hecho y registrado.
- [ ] Beta cerrada con 20 personas: sin errores bloqueantes en Sentry durante 7 días.

## 4. Checklist de lanzamiento (08 §3)

Producto:

- [ ] Ciudades del corredor con umbral y ventanas de 2027.
- [ ] ≥ 150 casas visibles por ciudad, o decisión explícita de retrasar.

Negocio y legal (fuera del código; ver `10_DECISIONS_AND_OPEN_ITEMS.md`):

- [ ] Sociedad constituida, Stripe live a su nombre y precios definitivos (DEC-75).
- [ ] Textos legales validados por el abogado y publicados desde `/admin/textos`. Hoy están marcados PROVISIONAL.
- [ ] EIPD de la verificación de identidad, registro de actividades y contratos de encargo (Google, Stripe, email).
- [ ] Respuesta escrita sobre registro de viajeros y DAC7.
- [ ] Email con SPF, DKIM y DMARC (DEC-69).
- [ ] Marca solicitada en la OEPM.
- [ ] P-26 (seguros) sigue en `false` hasta la validación legal (LEG-04).

## 5. Vuelta atrás

- **Hosting:** `firebase hosting:clone <proyecto>:live@<versión-anterior> <proyecto>:live`, o «Revertir» en la consola.
- **Functions:** vuelve a desplegar la etiqueta anterior (`git checkout <tag> && pnpm exec firebase deploy --only functions`).
- **Reglas:** vuelve a desplegar la versión anterior desde Git.
- **Datos:** sigue [backups-and-restore.md](backups-and-restore.md).
