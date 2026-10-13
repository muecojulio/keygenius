#!/bin/sh
# Arranque de la vista previa: idempotente y no bloqueante.
# Si ya responde en 8080 no hace nada; si no, lanza `npm run dev` en segundo plano.
cd "$(dirname "$0")" || exit 0
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
nohup npm run dev > /tmp/keygenius-dev.log 2>&1 &
i=0
while [ "$i" -lt 120 ]; do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done
exit 0
