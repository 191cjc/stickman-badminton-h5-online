#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
release_id=${1:-$(date -u +%Y%m%dT%H%M%SZ)}
[[ "$release_id" =~ ^[A-Za-z0-9_-]+$ ]] || { echo 'Invalid release id' >&2; exit 1; }
deploy_root=/opt/stickman-badminton-h5-online
release_dir="$deploy_root/releases/$release_id"
sudo test ! -e "$release_dir" || { echo 'Release already exists' >&2; exit 1; }
npm ci --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
sudo install -d -m 755 -o ubuntu -g ubuntu "$release_dir"
tar -cf - dist package.json package-lock.json .npmrc UPSTREAM.json GAME_SOURCE.json | tar -xf - -C "$release_dir"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix "$release_dir"
sudo chown -R root:root "$release_dir"
previous_release=$(readlink "$deploy_root/current" || true)
sudo install -m 644 ops/badminton-h5-online.service /etc/systemd/system/badminton-h5-online.service
sudo install -m 644 ops/badminton-h5-online.nginx.conf /etc/nginx/snippets/badminton-h5-online.conf
sudo python3 - <<'PY'
from pathlib import Path
import os,secrets
env = Path('/etc/badminton-h5-online.env')
if not env.exists():
    fd=os.open(env,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:
        f.write('NODE_ENV=production\nPORT=8794\nALLOWED_ORIGINS=https://www.firesoul.cn\nCOOKIE_SECRET='+secrets.token_hex(32)+'\n')
config=Path('/etc/nginx/sites-available/flash-global-data')
include='    include snippets/badminton-h5-online.conf;\n'
text=config.read_text()
if include not in text:
    anchor='    include snippets/badminton-cloud.conf;\n'
    if text.count(anchor)!=1: raise SystemExit('Expected HTTPS include anchor not found; install include manually.')
    backup=config.with_name('flash-global-data.before-badminton-h5-online')
    if not backup.exists(): backup.write_text(text)
    config.write_text(text.replace(anchor,anchor+include,1))
PY
if ! sudo nginx -t; then
    echo 'Nginx validation failed; inspect this project snippet/include. If necessary, remove only the include newly added by this release, then rerun nginx -t. Do not overwrite the shared config with an old backup.' >&2
    exit 1
fi
sudo ln -s "$release_dir" "$deploy_root/current.next"
sudo mv -Tf "$deploy_root/current.next" "$deploy_root/current"
if [[ -n "$previous_release" ]]; then
    sudo ln -sfn "$previous_release" "$deploy_root/previous"
fi
sudo systemctl daemon-reload
sudo systemctl enable badminton-h5-online.service
sudo systemctl restart badminton-h5-online.service
curl --fail --silent --show-error --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:8794/badminton-h5-online/api/health
sudo systemctl reload nginx
node scripts/http-check.mjs https://www.firesoul.cn
echo "Published $release_id"
