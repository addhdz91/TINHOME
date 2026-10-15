# Runbook — TinHome en local y cuentas necesarias

Para trabajar en local **no hace falta ninguna cuenta**. Todo corre contra los emuladores de Firebase con el proyecto ficticio `demo-tinhome`: Auth, Firestore, Storage y Functions. Los pagos de Stripe, el email y el push se simulan. Las cuentas reales solo hacen falta para staging y producción (§5).

## 1. Qué instalar

| Herramienta | Versión | Para qué | Cómo |
|---|---|---|---|
| Git | cualquiera reciente | clonar el repositorio | git-scm.com |
| Node.js | **22** (el proyecto exige `>=22 <23`; hay `.nvmrc`) | todo | `nvm install` (o fnm / Volta) dentro del repo |
| pnpm | **10.28** (fijado en `packageManager`) | gestor del monorepo | `corepack enable` (viene con Node) |
| Java (JDK) | **21** | emuladores de Firestore, Auth y Storage | Temurin 21 (adoptium.net) o `brew install openjdk@21` |
| Chromium de Playwright | — | solo para `pnpm test:e2e` | `pnpm --filter @tinhome/e2e exec playwright install chromium` |
| Stripe CLI | opcional | solo si pruebas pagos con claves de prueba reales | stripe.com/docs/stripe-cli |

No instales `firebase-tools` globalmente: es dependencia de desarrollo y se usa con `pnpm exec firebase …`.

Comprueba las versiones:

```bash
node -v     # v22.x
pnpm -v     # 10.28.x
java -version   # 21
```

## 2. Primer arranque

```bash
git clone https://github.com/addhdz91/TINHOME.git
cd TINHOME
git checkout feat/m10-hardening       # el trabajo de M0–M10 está aquí; main está desactualizada (§6)
pnpm install
cp apps/web/.env.example apps/web/.env.local   # VITE_USE_EMULATORS=true; no contiene secretos
pnpm dev      # compila functions, arranca los emuladores y la web
```

Cuando el terminal muestre los emuladores listos, ejecuta en **otra terminal**:

```bash
pnpm seed     # ciudades, ventanas, 60 casas, usuarios demo, partner de ejemplo…
```

| Dirección | Qué es |
|---|---|
| http://localhost:5173 | la web (Vite, recarga en caliente) |
| http://localhost:4000 | interfaz de los emuladores: datos de Firestore, usuarios de Auth (y códigos SMS) y logs (los emails salen ahí) |
| 9099 · 8080 · 9199 · 5001 · 5000 | Auth · Firestore · Storage · Functions · Hosting (emuladores) |

Los datos del emulador se pierden al pararlo. Vuelve a ejecutar `pnpm seed` cuando lo necesites.

## 3. Usuarios demo

Contraseña de todos: `Demo1234!`.

| Usuario | Para probar |
|---|---|
| `laura@demo.tinhome` | cuenta gratis (Madrid), patrocinados, límites de me gusta |
| `javier@demo.tinhome` | Premium (Valencia), chat e intercambio con Sofía, privacidad |
| `sofia@demo.tinhome` | casa sin ubicación verificada, valoración pendiente |
| `marta@demo.tinhome` | reaceptar los Términos; identidad pendiente en la cola de `/admin` |
| `pablo@demo.tinhome` | sin casa (onboarding), baja de cuenta |
| `admin@demo.tinhome` | panel `/admin`. Pide un código SMS: lo verás en la interfaz de emuladores → Auth |

Sin claves de Stripe, el pago y el portal se simulan: «Continuar al pago seguro» activa Premium al instante. Los emails salen en el log del emulador de Functions. El push solo se registra en el log.

## 4. Comandos del día a día

```bash
pnpm lint && pnpm typecheck      # antes de cada commit (los ganchos de Git lo refuerzan)
pnpm test:unit                   # unitarias, no necesita Java
pnpm test:int                    # callables contra emuladores
pnpm test:rules                  # reglas de Firestore y Storage
pnpm test:e2e                    # Playwright completo (para antes `pnpm dev`)
pnpm build && pnpm --filter @tinhome/web size   # build de producción + presupuesto de bundle
```

### Problemas frecuentes

- **Puerto 5000 ocupado en macOS:** es «Receptor AirPlay» (Ajustes → General → AirDrop y Handoff). Desactívalo o cambia el puerto de `hosting` en `firebase.json` solo en tu máquina.
- **«Java version … not supported»:** instala JDK 21 y comprueba `java -version` en la misma terminal.
- **Puertos ocupados tras un cierre brusco:** cierra los procesos de `firebase` o `java` que queden, o reinicia la terminal.
- **`pnpm test:e2e` y `pnpm dev` a la vez:** usan los mismos puertos. Para `pnpm dev` antes de lanzar el E2E.
- **La web no carga datos:** falta `apps/web/.env.local` con `VITE_USE_EMULATORS=true`, o no has ejecutado `pnpm seed`.

## 5. Cuentas para staging y producción

Por orden. Las tres primeras son imprescindibles para desplegar.

| # | Cuenta / servicio | Para qué | Notas |
|---|---|---|---|
| 1 | **Cuenta de Google + Firebase** (dos proyectos: `tinhome-staging` y `tinhome-prod`) | Auth, Firestore, Storage, Functions, Hosting | Plan **Blaze** (pago por uso) con tarjeta; ubicación **`europe-southwest1`** (Madrid), que no se puede cambiar después. Pon alertas de presupuesto. |
| 2 | **Identity Platform** (en el mismo proyecto de Google Cloud) | verificación por SMS y segundo factor del panel | El SMS tiene coste por mensaje. Activa MFA por SMS y TOTP. |
| 3 | **reCAPTCHA Enterprise** (Google Cloud) | App Check | Clave web → `VITE_APPCHECK_SITE_KEY`. |
| 4 | **Stripe** | Premium | En staging basta modo de prueba. Live necesita la sociedad constituida (DEC-75). Genera `STRIPE_SECRET_KEY`, el webhook (`STRIPE_WEBHOOK_SECRET`) y los dos precios (mensual y anual). |
| 5 | **Proveedor de email con servidores en la UE** (DEC-69, sin decidir) | todos los avisos N-xx | El código envía `POST {from,to,subject,html,text}` con `Authorization: Bearer <clave>`. Si el proveedor usa otro formato, hace falta un adaptador pequeño en `functions/src/core/email/providers.ts`. Requiere dominio con SPF, DKIM y DMARC. |
| 6 | **Dominio** (p. ej. `tinhome.es`) | web y email | Se conecta a Firebase Hosting; los DNS del email van aquí. |
| 7 | **Sentry** (opcional, región UE) | errores en el navegador | `VITE_SENTRY_DSN`. Si no es `*.ingest.sentry.io` / `*.ingest.de.sentry.io`, añádelo a la CSP. |
| 8 | **GitHub** | código y CI | Ya existe (`addhdz91/TINHOME`). |

Lo que cada cuenta aporta al proyecto (secretos, variables y comprobaciones) está en [deploy-and-launch.md](deploy-and-launch.md). Las copias de seguridad están en [backups-and-restore.md](backups-and-restore.md).

### Orden recomendado para el primer staging

1. Crear `tinhome-staging` en Firebase, pasar a Blaze, elegir `europe-southwest1` y activar Identity Platform y reCAPTCHA.
2. `pnpm exec firebase login` y `pnpm exec firebase use staging` (alias ya definido en `.firebaserc`).
3. Ejecutar `scripts/ops/configure-gcp.sh tinhome-staging` (simulación) y después con `APPLY=1`.
4. Configurar los secretos con `pnpm exec firebase functions:secrets:set …` (Stripe de prueba, `DOC_HASH_PEPPER` y email cuando exista).
5. Seguir [deploy-and-launch.md](deploy-and-launch.md) §2: desplegar reglas, functions y hosting, y hacer la prueba de humo.

## 6. Ramas

`main` está desactualizada: su último commit es anterior a M0. El trabajo completo y verificado con un clon limpio está en `feat/m10-hardening`, con copia en `claude/clever-darwin-uyw8yd`. Las ramas `feat/m0…m9` anteriores **no compilan** desde un clon limpio (fallo de `.gitignore` con `lib/`, 10 §5); no las uses. Lo siguiente es fusionar `feat/m10-hardening` en `main` mediante un PR.
