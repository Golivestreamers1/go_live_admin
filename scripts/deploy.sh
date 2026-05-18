#!/usr/bin/env bash
# Simple deploy: build locally → backup remote → rsync to server.
# Server info is hardcoded. Do NOT commit this file (it has the password).
#
# Run:   ./scripts/deploy.sh

set -e

# --- server info ---
HOST="168.231.67.120"
USER="root"
PASS="Golivestreamers1."
REMOTE="/var/www/go_live_admin"
BACKUP_ROOT="~/backup/go_live_admin"
# -------------------

LOCAL="$(cd "$(dirname "$0")/.." && pwd)"

command -v sshpass >/dev/null || { echo "Install sshpass: sudo apt-get install -y sshpass"; exit 1; }

echo "==> [1/3] Building dist locally (mode=production)"
if [ -f "$LOCAL/.env.production" ]; then
  echo "    using $LOCAL/.env.production"
elif [ -f "$LOCAL/.env" ]; then
  echo "    no .env.production found — falling back to $LOCAL/.env"
else
  echo "    WARNING: no .env or .env.production found; build will have no VITE_* values"
fi

(cd "$LOCAL" && npm run build -- --mode production)

if [ ! -f "$LOCAL/dist/index.html" ]; then
  echo "ERROR: build did not produce dist/index.html — aborting before upload" >&2
  exit 1
fi
echo "    build ok: $LOCAL/dist"

echo "==> [2/3] Backing up remote to ${BACKUP_ROOT} (overwrites previous backup)"
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=accept-new "${USER}@${HOST}" "
  mkdir -p \$(dirname ${BACKUP_ROOT})
  rm -rf ${BACKUP_ROOT}
  if [ -d ${REMOTE} ]; then
    cp -a ${REMOTE} ${BACKUP_ROOT}
    echo '    backup saved: ${BACKUP_ROOT}'
  else
    echo '    no existing remote folder, skipping backup'
    mkdir -p ${REMOTE}
  fi
"

echo "==> [3/3] Uploading ${LOCAL} → ${USER}@${HOST}:${REMOTE}"
sshpass -p "$PASS" rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude '.git/' \
  --exclude '.claude/' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  -e "ssh -o StrictHostKeyChecking=accept-new" \
  "$LOCAL/" "${USER}@${HOST}:${REMOTE}/"

echo "==> Done. To revert: ssh ${USER}@${HOST} 'rm -rf ${REMOTE} && cp -a ${BACKUP_ROOT} ${REMOTE}'"
