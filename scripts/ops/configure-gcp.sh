#!/usr/bin/env bash
# M10 / NFR-12 — one-off platform settings for a TinHome project (staging or prod).
# Idempotent. Prints the commands by default; run with APPLY=1 to execute them.
#
#   scripts/ops/configure-gcp.sh tinhome-staging            # dry run
#   APPLY=1 scripts/ops/configure-gcp.sh tinhome-staging    # apply
#
# Needs gcloud authenticated with an Owner/Editor of the project.
set -euo pipefail

PROJECT="${1:?usage: configure-gcp.sh <project-id>}"
REGION="europe-southwest1"
# Override with BUCKET=gs://<project>.appspot.com for older projects.
BUCKET="${BUCKET:-gs://${PROJECT}.firebasestorage.app}"
DB="(default)"

run() {
  if [[ "${APPLY:-0}" == "1" ]]; then
    echo "+ $*"
    "$@"
  else
    echo "[dry-run] $*"
  fi
}

echo "== Firestore: point-in-time recovery (7 days) and daily backups kept 30 days (NFR-12)"
run gcloud firestore databases update --project="$PROJECT" --database="$DB" --enable-pitr
run gcloud firestore backups schedules create --project="$PROJECT" --database="$DB" \
  --recurrence=daily --retention=30d

echo "== Firestore: TTL policies on expiresAt (04 §5)"
for group in passes likeCounters chatCounters rateLimits mailQueue events stripeEvents; do
  run gcloud firestore fields ttls update expiresAt --project="$PROJECT" \
    --collection-group="$group" --enable-ttl --async
done

echo "== Storage: object versioning 30 days (private/: deleted versions gone after 1 day) + exports deleted after 1 day"
# Identity documents and GDPR exports must really disappear when deleted (BR-25, ADR-008):
# versioning would otherwise keep a recoverable copy for 30 days.
LIFECYCLE="$(mktemp)"
cat > "$LIFECYCLE" <<'JSON'
{
  "rule": [
    { "action": { "type": "Delete" }, "condition": { "daysSinceNoncurrentTime": 30 } },
    { "action": { "type": "Delete" }, "condition": { "age": 1, "matchesPrefix": ["private/exports/"] } },
    { "action": { "type": "Delete" }, "condition": { "isLive": false, "daysSinceNoncurrentTime": 1, "matchesPrefix": ["private/"] } }
  ]
}
JSON
run gcloud storage buckets update "$BUCKET" --project="$PROJECT" --versioning
run gcloud storage buckets update "$BUCKET" --project="$PROJECT" --lifecycle-file="$LIFECYCLE"

echo "== Monitoring: log-based metrics for function errors and the Stripe webhook (NFR-09)"
run gcloud logging metrics create tinhome_function_errors --project="$PROJECT" \
  --description="Cloud Functions errors (severity >= ERROR)" \
  --log-filter='resource.type="cloud_run_revision" AND severity>=ERROR'
run gcloud logging metrics create tinhome_stripe_webhook_errors --project="$PROJECT" \
  --description="stripeWebhook rejected or failed" \
  --log-filter='resource.labels.service_name="stripewebhook" AND severity>=WARNING'
run gcloud logging metrics create tinhome_rate_limited --project="$PROJECT" \
  --description="Requests rejected by rate limits (abuse, brute force, scraping)" \
  --log-filter='jsonPayload.errorCode="E_RATE_LIMIT"'
run gcloud logging metrics create tinhome_session_rejected --project="$PROJECT" \
  --description="Signed-in requests rejected: revoked, banned or deleted sessions" \
  --log-filter='jsonPayload.errorCode="E_REAUTH_REQUIRED"'
echo "   Then create alert policies in Cloud Monitoring → e-mail to ops: errors and webhook > 0 in"
echo "   5 min; rate limits and rejected sessions above their weekly baseline (attack signal)."

echo "== IAM: dedicated least-privilege service account for Cloud Functions (ASVS V14.1)"
SA="tinhome-functions@${PROJECT}.iam.gserviceaccount.com"
run gcloud iam service-accounts create tinhome-functions --project="$PROJECT" \
  --display-name="TinHome Cloud Functions"
for role in roles/datastore.user roles/firebaseauth.admin roles/logging.logWriter \
  roles/cloudtrace.agent roles/eventarc.eventReceiver roles/firebasecloudmessaging.admin; do
  run gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:${SA}" --role="$role"
done
run gcloud storage buckets add-iam-policy-binding "$BUCKET" --member="serviceAccount:${SA}" \
  --role=roles/storage.objectAdmin
# Signed URLs (identity documents, exports) are signed with the account's own key via IAM.
run gcloud iam service-accounts add-iam-policy-binding "$SA" --project="$PROJECT" \
  --member="serviceAccount:${SA}" --role=roles/iam.serviceAccountTokenCreator
for secret in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET DOC_HASH_PEPPER EMAIL_API_KEY; do
  run gcloud secrets add-iam-policy-binding "$secret" --project="$PROJECT" \
    --member="serviceAccount:${SA}" --role=roles/secretmanager.secretAccessor
done
echo "   Then set FUNCTIONS_SERVICE_ACCOUNT=${SA} in functions/.env.${PROJECT}, redeploy, and remove"
echo "   the Editor role from the default compute service account (check nothing else uses it)."

echo "== Region check: everything must live in ${REGION} (NFR-05)"
run gcloud firestore databases describe --project="$PROJECT" --database="$DB" --format='value(locationId)'
