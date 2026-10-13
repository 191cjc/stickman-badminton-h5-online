# Deployment, isolation, and provenance

## Owned resources

| Resource               | Current value                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Independent project    | `/home/ubuntu/stickman-badminton-h5-online/`                                                                    |
| Public entrance        | `https://www.firesoul.cn/badminton-h5-online/`                                                                  |
| Backend                | `127.0.0.1:8794`                                                                                                |
| Development frontend   | `127.0.0.1:5184` with project base path                                                                         |
| systemd                | `badminton-h5-online.service`                                                                                   |
| Nginx snippet          | `/etc/nginx/snippets/badminton-h5-online.conf`                                                                  |
| Production environment | `/etc/badminton-h5-online.env`, root 0600                                                                       |
| Release storage        | `/opt/stickman-badminton-h5-online/releases/`; sibling `current`/`previous` symlinks at the project deploy root |

Sources: [unit](../../../ops/badminton-h5-online.service), [Nginx snippet](../../../ops/badminton-h5-online.nginx.conf), [environment example](../../../ops/production.env.example), and [deployment documentation](../../../docs/deployment.md).

The existing HTTPS server adds only this project's include; community `/badminton/`, original `/badminton-original/`, and cloud `/badminton-cloud/` routes/services/source remain separately owned. Do not reuse their ports, alter their snippets, restart their services, or overwrite their files as part of this project's release.

## Development and builds

Use Node.js 24+, this project's [package scripts](../../../package.json), independent package-lock, and local .npmrc. `npm run dev` starts Vite and tsx with project-only API/WS proxying. `npm run build` type-checks, writes `dist/client`, and bundles `dist/server/index.js`; ws is the production dependency. Nginx serves the frontend; Node handles only session/health/WS.

The unit source currently names the host's Node executable at `/home/ubuntu/.nvm/versions/node/v24.19.0/bin/node`. Inspect it when migrating a host/version instead of assuming it follows PATH. Production secret must remain stable across releases and must not be committed or printed.

## Publish and rollback

[publish.sh](../../../scripts/publish.sh) installs dependencies, checks types/lint/tests, builds, prepares a release and production dependency, installs unit/snippet, creates secret only if absent, and adds the independent include if missing. It validates Nginx before switching current, then restarts this service, checks loopback health, reloads Nginx, and runs HTTP checks. Service restart clears in-memory matches.

The release files are owned root:root after installation. Static hashed assets get immutable cache headers; index gets no-cache. The current symlink switches the frontend and backend release together.

[rollback.sh](../../../scripts/rollback.sh) points current at the previous/selected existing release, restarts this service, and checks local health. It does not regenerate the Cookie secret. First release has no previous version; withdrawal and safe Nginx include removal are documented separately. Do not restore an old shared-vhost backup over subsequent unrelated edits.

Nginx-validation failure exits before current switches, this service restarts or Nginx reloads. The diagnostic directs inspection of this project's snippet/include and removal only of an include newly added by that release, if necessary. Follow the matching recovery/order in [deployment documentation](../../../docs/deployment.md), preserving subsequent unrelated shared-vhost edits.

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

## Active source and historical record

The active source is4399 Flash90302. [GAME_SOURCE.json](../../../GAME_SOURCE.json) records URL/hash/scope; [reference](../../../reference/flash-90302/README.md) freezes unchanged SWF, recovered ActionScript and gzip XML. This is recovered bytecode/data, not the author's editable source project. Preserve original copyright/markings and do not claim MIT or an unverified open-source grant.

The community [UPSTREAM.json](../../../UPSTREAM.json) and frozen [upstream](../../../upstream/README.md) retain commit1a8799e65a39f7dafab2075c9297d8e4965f1ecb as historical provenance. No community gameplay modules are live. Never change separate demo/cloud/original source or treat this historical simulation as the new parity reference.

Releases include GAME_SOURCE.json and UPSTREAM.json, while reference/tools/artifacts remain outside dist/client and the public alias. Static resources are extracted public/classic SVGs; regeneration uses frozen XML and documented research-only JPEXS. Protocol2 requires refreshed pages; rollback to the prior community release also requires refresh. Always switch frontend/backend together and preserve the Cookie secret.
