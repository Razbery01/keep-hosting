#!/bin/bash
# Test deploy-site, suspend-site, or reactivate-site Edge Functions
# Usage: bash test-deploy.sh [deploy|suspend|reactivate] [site-id]

set -e

FUNC="${1:-deploy-site}"
SITE_ID="${2:-4a73eb66-7044-4ae3-a501-3a78e6a79007}"

if [[ ! -f .env ]]; then
  echo "Missing .env"; exit 1
fi

KEY=$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
BASE=$(grep -E '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's:/*$::')

echo "Calling $FUNC for site $SITE_ID..."
echo

curl -i -X POST "$BASE/functions/v1/$FUNC" \
  -H "Authorization: Bearer $KEY" \
  -H "apikey: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"siteId\":\"$SITE_ID\"}"

echo
