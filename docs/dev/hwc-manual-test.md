# Manual HWC test for emergence

End-to-end smoke test that emergence works under the Holo Web Conductor
browser extension. Adapted from [`unyt/docs/dev/hwc-manual-test.md`](../../../unyt/docs/dev/hwc-manual-test.md).

The local stack (modelled on [`unyt/deploy/local-dev.sh`](../../../unyt/deploy/local-dev.sh)):

```
                                     ┌──── browser tab ─────────┐
                                     │  emergence UI (HWC mode) │   ← end user
                                     │  + HWC extension         │
                                     └─────────┬────────────────┘
                                               │ via linker
                                               ▼
   ┌──── hc-spin window ─────────┐    ┌────── h2hc-linker ─────┐
   │  emergence UI (progenitor)  │ ◄──│  port 8000             │
   │  → Admin pane Quick Setup   │peer│  admin → conductor B   │
   └─────────────┬───────────────┘ via└─────────┬──────────────┘
                 │  conductor A    bootstrap    │
                 ▼                              ▼
   ┌────── conductor A (hc-spin) ────────── conductor B (hc sandbox) ─────┐
   │  Same network_seed: "emergence-local-dev"  →  same DNA → same DHT    │
   └────────────────────────┬────────────────────────────────────────────┬┘
                            │                                            │
                            └──── kitsune2-bootstrap-srv (random port) ──┘
                                  + iroh QUIC relay
```

Two conductors are involved because the linker (and therefore the HWC
extension) talks to conductor B via admin websocket, while the
progenitor/configuration UI runs in hc-spin against conductor A. Both
conductors share the same `network_seed` and bootstrap/relay URLs, so
they sit on the same DHT and the progenitor's site-maps + time-windows
gossip out to the HWC user.

## Why a "progenitor" at all

Emergence's `dnas/emergence/workdir/dna.yaml` ships with no
`progenitor_pubkey` baked in (relaxed validation), so any agent who
reaches the Admin pane while the network is unconfigured can set up
site-maps and time-windows. The Admin pane is gated on
`uiProps.amSteward`. The flag is set if any of:

- `VITE_PROGENITOR_NETWORK_SEED` is set in the vite-dev-server's
  environment (the dev/local-dev path's stand-in for the Moss
  tool-installer affordance — see `deploy/start-hwc.sh`).
- We're in Weave: tool-installer pubkey matches my pubkey.
- We're in plain non-Weave/non-HWC dev (Tauri or browser without the
  env var): everyone is steward.

In production builds the env var is unset, so plain HWC-browser users
do NOT become stewards.

## How the network seed flows through every layer

`deploy/start-hwc.sh` defaults `NETWORK_SEED=emergence-local-dev` and
exports it to two places at once:

- `NETWORK_SEED` → read by `deploy/local-dev.sh`, used as the
  `--network-seed` for `hc sandbox`/`hc-spin` and stamped into the
  `dna_modifiers.network_seed` of the joining-service config and the
  staged `ui/public/emergence.happ` bundle.
- `VITE_PROGENITOR_NETWORK_SEED` → vite bakes it into
  `import.meta.env`, which `App.svelte` reads. When it's set the UI
  auto-joins a clone with that exact seed (skipping NetworkOnboarding)
  so the hc-spin window lands on the same DHT as the conductor and
  the joining service.

Override globally:

```bash
NETWORK_SEED=my-test npm run start:hwc:joining
```

## Prerequisites

- `nix develop` (the flake provides `hc`, `holochain`,
  `kitsune2-bootstrap-srv`).
- Sibling checkouts of [`h2hc-linker`](../../../h2hc-linker) and
  [`joining-service`](../../../joining-service).
- The HWC browser extension installed in dev mode (see
  [`holo-web-conductor/packages/extension`](../../../holo-web-conductor/packages/extension)).
- `npm install` already run in this repo.

## Quickstart

```bash
# In the emergence repo:
npm run start:hwc:joining
```

This single command:

1. builds the .happ
2. spawns `kitsune2-bootstrap-srv` on a random port
3. launches a fresh `hc sandbox` conductor against that bootstrap/relay
4. builds + launches `h2hc-linker` (port 8000) against conductor's admin port
5. launches `joining-service` (port 3000) configured for that linker
6. starts vite (port 1420)
7. launches `hc-spin` as the progenitor against the same network seed
8. tails everything until you Ctrl-C (or `npm run stop:hwc`)

After "Local HWC infrastructure ready." appears, the **hc-spin window**
should boot into emergence. Because it inherits launcher context,
`amSteward` is true and the **Admin pane** auto-opens with the "Get
Started" cards (Quick Setup / Import a Setup / Manual Config).

Pick "Quick Setup" → choose a template → wait for the import to
finish. The site-maps and time-windows will be created and the
progenitor is now serving them on the DHT.

Then in a regular browser:

```
http://localhost:1420/?runtime=hwc&joiningServiceUrl=http://localhost:3000/v1
```

The HWC extension picks up `?runtime=hwc`, fetches the linker URL from
the joining service, installs `emergence.happ` (served from
`ui/public/emergence.happ`, repacked with the right `network_seed`),
and the UI lands on the profile-creation prompt. Once profiled, the
sessions and spaces from the progenitor's setup should appear within a
few seconds (gossip latency).

## What "Quick Setup" looks like in the progenitor window

`Admin.svelte` shows the setup cards iff
`(no sitemaps) && (no time-windows) && !manualConfig`. Quick Setup
applies a template via `doImport()`, then `current_sitemap` is set to
the imported sitemap. Once `$sitemaps.length > 0` or
`$allWindows.length > 0`, the cards collapse and the regular admin
sections (Site-maps, Scheduling, Proxy Agents, etc.) take over.

## Resetting

When something is wrong and you want a clean slate:

```bash
npm run stop:hwc
rm -rf /tmp/emergence-local-dev
```

Then in the HWC extension popup, click "Wipe Storage" (or remove and
re-add the extension). This clears the cached agent key + linker
selection so the next visit goes through a fresh `joinAndInstall`.

## Status

```bash
npm run status:hwc
```

Reports PIDs and ports of bootstrap, conductor(s), linker, joining,
and progenitor. Also prints the browser URL.

## Why the .happ has to be repacked

`@holo-host/web-conductor-client`'s `joinAndInstall` does NOT pass
`dna_modifiers.network_seed` from the joining-service provision
response to the extension's `installApp` call (only `bundle`,
`installedAppId`, `membraneProofs`). So the extension installs with
whatever seed is baked into the bundle's manifest. Emergence's
`dnas/emergence/workdir/dna.yaml` ships with `network_seed: ~`, so
`deploy/local-dev.sh` repacks the .happ with `$NETWORK_SEED` stamped
in before staging it to `ui/public/emergence.happ`. The original
`dna.yaml` is restored after pack so the working tree stays clean.

If you skip this step, the HWC browser will land on a different DHT
than the conductors and silently see "no peers" forever.

## Why bootstrap and relay URLs are equal

`kitsune2-bootstrap-srv` runs the iroh-relay endpoint on the same HTTP
listener as bootstrap (the `no_relay_server: false` default). The
auxiliary "QUIC server listening on bind_addr=…" line is the QAD
(QUIC Address Discovery) port — handing that port to the conductor as
the relay URL would leave iroh stuck without a "current url", so
agent info never gets published to the bootstrap and peer discovery
silently fails. `local-dev.sh` extracts the bootstrap port from the
`#kitsune2_bootstrap_srv#listening#` line and uses it for both
bootstrap and relay.

## Why the linker runs in open-auth mode

`local-dev.sh` strips `H2HC_LINKER_ADMIN_SECRET` from the linker's
env, even in joining mode. The joining service still does its job
(provision / linker URL handout / membrane proofs) but the linker
auto-accepts any agent's WS auth — no allowlist round-trip needed.
This avoids the trap where a stale HWC install can't auth into a
freshly-restarted linker because its in-memory allowlist is empty.

## Troubleshooting

- **"hApp bundle not found"** — run `npm run build:happ` first, or
  use `npm run start:hwc[:joining]` which builds it.
- **Browser tab in HWC mode but `cell_info[…]` is empty** — the
  `roleName: "emergence"` was not passed to `WebConductorAppClient`
  (HWC's synthetic `appInfo()` defaults to `"default"`/<app-id> when
  no role is given). See `App.svelte`'s HWC branch.
- **"You are about to leave Emergence!" warning when reloading** —
  this is the regular `beforeunload` listener on App.svelte, not an
  HWC issue.
- **Browser sees no peers** — verify both windows are on the same
  network seed: in the progenitor's Admin pane the "Active Network
  DNA Hash" should match the HWC tab's hash (also on Admin → Active
  Network DNA Hash, but only visible if you reach the admin pane,
  which by default you can't on the HWC side because amSteward is
  false there). Easier: check `cat /tmp/emergence-local-dev/bootstrap_url.txt`
  matches what the conductors logged, and that the .happ in
  `ui/public/emergence.happ` was repacked this run (its mtime).
- **hc-spin window doesn't open the Admin pane** — in the devtools
  console, confirm `import.meta.env.VITE_PROGENITOR_NETWORK_SEED`
  resolves to the seed string. If it's `undefined`, the vite dev
  server didn't inherit the env var — restart the stack via
  `npm run start:hwc:joining` (which goes through
  `deploy/start-hwc.sh`) rather than launching vite directly.
- **Linker dies with "stale interpreter"** — the binary at
  `../h2hc-linker/target/release/h2hc-linker` was built against a
  previous nix shell. `local-dev.sh`'s prereq check catches this and
  rebuilds.
- **"Joining service died"** — check
  `/tmp/emergence-local-dev/joining.log`. Most often it's a port
  collision on 3000; set `JOINING_SERVICE_PORT=4000` (and pass
  `?joiningServiceUrl=http://localhost:4000/v1` to the browser).
