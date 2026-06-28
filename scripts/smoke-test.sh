#!/bin/bash
# Verifica que las rutas base del API Gateway y sus microservicios están en línea.
# Uso: ./smoke-test.sh <BASE_URL>
# Ejemplo: ./smoke-test.sh http://34.16.29.121

set -euo pipefail

BASE_URL="${1:?Error: se requiere la URL base. Uso: $0 <BASE_URL>}"
FAILED=0
TOTAL=0

check() {
  local description="$1"
  local expected="$2"
  local method="${3:-GET}"
  local path="$4"
  local data="${5:-}"

  TOTAL=$((TOTAL + 1))

  if [ -n "$data" ]; then
    ACTUAL=$(curl -s -o /dev/null -w "%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -d "$data" \
      --max-time 15 \
      --connect-timeout 10 \
      "${BASE_URL}${path}" 2>/dev/null || echo "000")
  else
    ACTUAL=$(curl -s -o /dev/null -w "%{http_code}" \
      -X "$method" \
      --max-time 15 \
      --connect-timeout 10 \
      "${BASE_URL}${path}" 2>/dev/null || echo "000")
  fi

  if [ "$ACTUAL" = "$expected" ]; then
    echo "  ✅ [$ACTUAL] $description"
  else
    echo "  ❌ [$ACTUAL] $description (esperado: $expected)"
    FAILED=$((FAILED + 1))
  fi
}

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║           SMOKE TESTS — Quetzal TV                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  URL base: ${BASE_URL}"
echo ""

echo "── API Gateway ──────────────────────────────────────────"
check "Health del gateway"                  200 GET  "/health"
check "Ruta protegida sin JWT → rechazada"  401 GET  "/api/usuario/api/v1/auth/me"

echo ""
echo "── Servicio Usuario ─────────────────────────────────────"
check "Login sin body → validación activa"  422 POST "/api/usuario/api/v1/auth/login" '{}'

echo ""
echo "── Servicio Catálogo (público) ──────────────────────────"
check "Listado del catálogo accesible"      200 GET  "/api/catalogo/api/v1/catalog"

echo ""
echo "── Servicio Suscripción (público) ───────────────────────"
check "Planes disponibles accesibles"       200 GET  "/api/suscripcion/api/v1/plans"

echo ""
echo "── Servicio Divisas (público) ───────────────────────────"
check "Lista de monedas disponibles"        200 GET  "/api/divisas/api/v1/monedas"

echo ""
echo "────────────────────────────────────────────────────────"
if [ "$FAILED" -eq 0 ]; then
  echo "  ✅ RESULTADO: $TOTAL/$TOTAL pruebas pasaron"
  echo ""
  exit 0
else
  echo "  ❌ RESULTADO: $((TOTAL - FAILED))/$TOTAL pruebas pasaron — $FAILED fallo(s)"
  echo ""
  exit 1
fi
