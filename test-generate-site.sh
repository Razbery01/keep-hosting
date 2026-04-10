#!/bin/bash
# One-shot test of the generate-site Edge Function
# Run from project root: bash test-generate-site.sh

set -e

KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d= -f2)
SITE_ID="d6c5bf87-2ac4-4cfd-a92c-6f0cdb9995a5"
URL="https://wozonryvuvbxxfdykzne.supabase.co/functions/v1/generate-site"

echo "Calling generate-site for site $SITE_ID..."
echo

curl -i -X POST "$URL" \
  -H "Authorization: Bearer $KEY" \
  -H "apikey: $KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}"

echo
