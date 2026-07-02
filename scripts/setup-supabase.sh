#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== TRYB / Wander With Me — Supabase setup ==="
echo ""
echo "1. Create a free project at https://supabase.com/dashboard/new/new-project"
echo "2. After it finishes provisioning, open Settings → API and copy:"
echo "   - Project URL"
echo "   - anon public key"
echo "   - service_role key (keep secret)"
echo ""

read -rp "Project URL (e.g. https://xxxx.supabase.co): " SUPABASE_URL
read -rp "Anon / publishable key: " ANON_KEY
read -rsp "Service role key: " SERVICE_KEY
echo ""

cat > .env <<EOF
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
EOF

echo "Wrote .env"

if ! npx supabase projects list >/dev/null 2>&1; then
  echo ""
  echo "Log in to Supabase CLI to push migrations:"
  npx supabase login
fi

REF="${SUPABASE_URL#https://}"
REF="${REF%%.supabase.co}"

echo "Linking project ${REF} and pushing migrations..."
npx supabase link --project-ref "$REF"
npx supabase db push

echo ""
echo "Done. Restart the dev server: npm run dev"
