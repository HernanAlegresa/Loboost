#!/usr/bin/env bash
echo "🔍 Verificando tipos..."
if ! npm run typecheck 2>&1; then
  echo "❌ TypeScript errors encontrados. Revisalos antes de continuar."
  exit 1
fi
echo "✅ TypeScript OK"
exit 0
