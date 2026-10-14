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

echo "== Storage: object versioning 30 days + private exports deleted after 1 day"
LIFECYCLE="$(mktemp)"
cat > "$LIFECYCLE" <<'JSON'
{
  "rule": [
    { "action": { "type": "Delete" }, "condition": { "daysSinceNoncurrentTime": 30 } },
    { "action": { "type": "Delete" }, "condition": { "age": 1, "matchesPrefix": ["private/exports/"] } }
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
echo "   Then create alert policies on both metrics (> 0 in 5 min) in Cloud Monitoring → e-mail to ops."

echo "== Region check: everything must live in ${REGION} (NFR-05)"
run gcloud firestore databases describe --project="$PROJECT" --database="$DB" --format='value(locationId)'
