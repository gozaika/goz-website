#!/usr/bin/env bash
# Server-side consolidated smoke (Slices 3+4+5+6): phone-OTP -> token -> BFF.
# Requires local Supabase running + demo seed + linkage applied.
# Usage: bash scripts/smoke/otp-bff-smoke.sh [RESTAURANT_API_ORIGIN]
set -uo pipefail

ENV_FILE=".env.local"
ANON=$(sed -n 's/^NEXT_PUBLIC_SUPABASE_ANON_KEY=//p' "$ENV_FILE" | tr -d '"' | tr -d "'")
AUTH="http://127.0.0.1:54321"
API_ORIGIN="${1:-}"

mint() {
  local phone="$1" otp="$2"
  curl -s -X POST "$AUTH/auth/v1/otp" -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"create_user\":false}" -o /dev/null
  curl -s -X POST "$AUTH/auth/v1/verify" -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d "{\"type\":\"sms\",\"phone\":\"$phone\",\"token\":\"$otp\"}"
}

token_of() { echo "$1" | grep -oE '"access_token":"[^"]+"' | head -1 | sed 's/"access_token":"//; s/"$//'; }

check() { # label, phone, otp
  local resp tok
  resp=$(mint "$2" "$3")
  tok=$(token_of "$resp")
  if [ -n "$tok" ]; then
    echo "  [OK]   $1 ($2) -> token minted"
    echo "$tok" > "/tmp/tok_$1.txt"
  else
    echo "  [FAIL] $1 ($2) -> $(echo "$resp" | head -c 120)"
  fi
}

echo "== 1. Phone-OTP via local test_otp =="
check owner    "+919876520001" "200001"
check finance  "+919876530004" "300004"
check pickup   "+919876530003" "300003"
check consumer "+919876510001" "100001"

if [ -z "$API_ORIGIN" ]; then
  echo "== BFF checks skipped (no API origin; start restaurant-mgmt-web and pass its origin) =="
  exit 0
fi

echo "== 2. BFF bootstrap + role enforcement ($API_ORIGIN) =="
hdr() { echo -H "Authorization: Bearer $1" -H "X-Client-Schema-Version: 1" -H "X-GoZaika-App: gozaika-restaurant"; }

call() { # label, method, path, token, expect_http
  local code
  code=$(curl -s -o "/tmp/bff_$1.json" -w "%{http_code}" -X "$2" "$API_ORIGIN$3" \
    -H "Authorization: Bearer $4" -H "X-Client-Schema-Version: 1" -H "Content-Type: application/json" -d '{}')
  local mark="[OK]"; [ "$code" = "$5" ] || mark="[FAIL want $5]"
  echo "  $mark $1: $2 $3 -> $code"
}

OWNER=$(cat /tmp/tok_owner.txt 2>/dev/null)
FIN=$(cat /tmp/tok_finance.txt 2>/dev/null)
call owner_bootstrap   POST "/api/mobile/v1/auth/bootstrap"     "$OWNER" 200
call owner_summary     GET  "/api/mobile/v1/restaurant/summary" "$OWNER" 200
call finance_summary   GET  "/api/mobile/v1/restaurant/summary" "$FIN"   200
call noauth_me         GET  "/api/mobile/v1/me"                 "bad"    401

echo "== 3. Bootstrap created NO consumer profile for the owner (D1) =="
echo "  (run the SQL check in the next step)"
