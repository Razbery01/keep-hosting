#!/bin/bash
# One-shot test of the generate-site Edge Function
# Run from project root: bash test-generate-site.sh
# Requires .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (same as the web app).

set -e

if [[ ! -f .env ]]; then
  echo "Missing .env — copy .env.example and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  exit 1
fi

# shellcheck disable=SC2046
KEY=$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
BASE=$(grep -E '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's:/*$::')

if [[ -z "$KEY" || -z "$BASE" ]]; then
  echo "Could not read VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_URL from .env"
  exit 1
fi

SITE_ID="${SITE_ID:-4a73eb66-7044-4ae3-a501-3a78e6a79007}"
URL="${BASE}/functions/v1/generate-site"

echo "Calling generate-site for site $SITE_ID..."
echo

curl -i -X POST "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "apikey: $KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}"

echo
