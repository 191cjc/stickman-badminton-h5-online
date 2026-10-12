# Deployment, isolation, and provenance

## Owned resources

| Resource | Current value |
| --- | --- |
| Independent project | `/home/ubuntu/stickman-badminton-h5-online/` |
| Public entrance | `https://www.firesoul.cn/badminton-h5-online/` |
| Backend | `127.0.0.1:8794` |
| Development frontend | `127.0.0.1:5184` with project base path |
| systemd | `badminton-h5-online.service` |
| Nginx snippet | `/etc/nginx/snippets/badminton-h5-online.conf` |
| Production environment | `/etc/badminton-h5-online.env`, root 0600 |
| Release storage | `/opt/stickman-badminton-h5-online/releases/`; sibling `current`/`previous` symlinks at the project deploy root |

Sources: [unit](../../../ops/badminton-h5-online.service), [Nginx snippet](../../../ops/badminton-h5-online.nginx.conf), [environment example](../../../ops/production.env.example), and [deployment documentation](../../../docs/deployment.md).

The existing HTTPS server adds only this project's include; community `/badminton/`, original `/badminton-original/`, and cloud `/badminton-cloud/` routes/services/source remain separately owned. Do not reuse their ports, alter their snippets, restart their services, or overwrite their files as part of this project's release.

## Development and builds

Use Node.js 24+, this project's [package scripts](../../../package.json), independent package-lock, and local .npmrc. `npm run dev` starts Vite and tsx with project-only API/WS proxying. `npm run build` type-checks, writes `dist/client`, and bundles `dist/server/index.js`; ws is the production dependency. Nginx serves the frontend; Node handles only session/health/WS.

The unit source currently names the host's Node executable at `/home/ubuntu/.nvm/versions/node/v24.19.0/bin/node`. Inspect it when migrating a host/version instead of assuming it follows PATH. Production secret must remain stable across releases and must not be committed or printed.

## Publish and rollback

[publish.sh](../../../scripts/publish.sh) installs dependencies, checks types/lint/tests, builds, prepares a release and production dependency, installs unit/snippet, creates secret only if absent, and adds the independent include if missing. It validates Nginx before switching current, then restarts this service, checks loopback health, reloads Nginx, and runs HTTP checks. Service restart clears in-memory matches.

The release files are owned root:root after installation. Static hashed assets get immutable cache headers; index gets no-cache. The current symlink switches the frontend and backend release together.

[rollback.sh](../../../scripts/rollback.sh) points current at the previous/selected existing release, restarts this service, and checks local health. It does not regenerate the Cookie secret. First release has no previous version; withdrawal and safe Nginx include removal are documented separately. Do not restore an old shared-vhost backup over subsequent unrelated edits.

Known mismatch: the publish script's Nginx-validation failure diagnostic recommends restoring the shared backup. Follow the safe include-removal procedure in [deployment documentation](../../../docs/deployment.md); the script diagnostic needs a separate correction.

## Logging and verification

```bash
sudo systemctl status badminton-h5-online.service --no-pager
sudo journalctl -u badminton-h5-online.service -n 100 --no-pager
curl -fsS http://127.0.0.1:8794/badminton-h5-online/api/health
sudo nginx -t
node scripts/http-check.mjs https://www.firesoul.cn
```

[http-check.mjs](../../../scripts/http-check.mjs) checks HTML/assets/health/Cookie/WS handshake plus HTTP 200 on all three existing entrances. [public-match-check.mjs](../../../scripts/public-match-check.mjs) creates two actual matchmaking guests; run it only with an empty queue to avoid matching real waiting players. Neither starts a browser or proves visual quality/input latency. Record those manual effects separately in [validation.md](../../../docs/validation.md).

A docs-only task does not call publish or restart services. Validate Markdown/link/index changes locally. Publishing must belong to the authorized task scope, with checks completed before the release action.

## Upstream reuse and license record

The frozen source is from `https://github.com/LoveSeele-max/stickman_badminton_h5`, commit `1a8799e65a39f7dafab2075c9297d8e4965f1ecb`, originally downloaded at `/home/ubuntu/stickman-badminton-online/demo/`. [UPSTREAM.json](../../../UPSTREAM.json) stores file/blob checks, the inherited demo Vite-base change, and provenance; [upstream](../../../upstream/README.md) retains the original source for comparison.

The verified commit root contains no license file and its README has no license grant. Do not add or claim MIT for that code. Preserve its origin/version, programmatic Canvas appearance, and test comparison; original-game asset replacement requires separate assessment. Copying source must exclude node_modules, dist, caches, and temporary output.
