#!/bin/bash
# Testa push notification via servidor PetLink
# Uso:
#   ./scripts/test-push.sh <token> [título] [corpo]
#   ./scripts/test-push.sh eyJhbG... "Teste" "Push funcionou!"
#
# Token JWT: pega no AsyncStorage do app ou faz login via curl

API_URL="${API_URL:-http://localhost:3000}"
TOKEN="$1"
TITLE="${2:-🐾 PetLink Teste}"
BODY="${3:-Notificação push funcionou via FCM!}"

if [ -z "$TOKEN" ]; then
  echo "❌ Uso: $0 <token_jwt> [título] [corpo]"
  echo ""
  echo "📌 Para obter o token JWT, faça login via API:"
  echo '   curl -s '$API_URL'/auth/login -H "Content-Type: application/json" -d "{\"email\":\"seu@email.com\",\"password\":\"sua_senha\"}" | jq -r .token'
  echo ""
  echo "📌 Ou extraia do AsyncStorage no app Reactotron / debug"
  exit 1
fi

echo "🚀 Enviando push para $API_URL/notifications/test ..."
echo "   Título: $TITLE"
echo "   Corpo:  $BODY"
echo ""

curl -s -X POST "$API_URL/notifications/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$(cat <<EOF
{
  "title": "$TITLE",
  "body": "$BODY",
  "type": "social"
}
EOF
)" | jq .
