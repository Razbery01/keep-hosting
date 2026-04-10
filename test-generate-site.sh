#!/bin/bash
# One-shot test of the generate-site Edge Function
# Run from project root: bash test-generate-site.sh

set -e

KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d= -f2)
SITE_ID="4a73eb66-7044-4ae3-a501-3a78e6a79007"
URL="https://wozonryvuvbxxfdykzne.supabase.co/functions/v1/generate-site"

echo "Calling generate-site for site $SITE_ID..."
echo

curl -i -X POST "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "apikey: $KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}"

echo
