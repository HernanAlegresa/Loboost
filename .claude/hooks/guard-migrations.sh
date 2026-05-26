#!/usr/bin/env bash
FILE=$(cat | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
if [[ "$FILE" == *"supabase/migrations"* ]]; then
  echo "⛔ STOP: Modificación de migración detectada en $FILE"
  echo "Este cambio requiere aprobación explícita. Describí qué necesita cambiar y esperá confirmación antes de continuar."
  exit 2
fi
exit 0
