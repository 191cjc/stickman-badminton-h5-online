#!/usr/bin/env bash
set -euo pipefail
deploy_root=/opt/stickman-badminton-h5-online
rollback_release=${1:-$(readlink "$deploy_root/previous")}
if [[ "$rollback_release" != "$deploy_root/releases/"* ]]; then rollback_release="$deploy_root/releases/$rollback_release"; fi
[[ "$rollback_release" =~ ^/opt/stickman-badminton-h5-online/releases/[A-Za-z0-9_-]+$ ]] || { echo 'Invalid release path' >&2; exit 1; }
sudo test -f "$rollback_release/dist/server/index.js"
sudo test -f "$rollback_release/dist/client/index.html"
sudo ln -s "$rollback_release" "$deploy_root/current.next"
sudo mv -Tf "$deploy_root/current.next" "$deploy_root/current"
sudo systemctl restart badminton-h5-online.service
curl --fail --silent --show-error --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:8794/badminton-h5-online/api/health
echo "Rolled back to $rollback_release; in-memory rooms were cleared by restart."
