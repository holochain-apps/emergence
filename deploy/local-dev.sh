#!/usr/bin/env bash
# Local HWC development script for emergence.
# Adapted from ../unyt/deploy/local-dev.sh.
#
# emergence has the "progenitor configures the network" pattern: the
# first agent on a fresh network sets up site-maps + time-windows via
# the Admin pane, and that initial-config UI is gated on `amSteward`.
# In Weave/Moss this is gated by the toolInstaller affordance; in
# hc-spin/launcher with relaxed-validation DNA we treat the user as a
# prospective progenitor so the Admin pane auto-shows. So the typical
# flow is:
#
#     # Terminal 1 — backend stack (bootstrap, conductor, linker, joining)
#     npm run start:hwc:joining
#
#     # Terminal 2 — progenitor UI window via hc-spin (same network seed)
#     npm run start:hwc:progenitor
#
# When done, `npm run stop:hwc` tears everything down.
#
# The stack runs THREE separate kitsune2 nodes that gossip on the
# same DHT via the local bootstrap+relay:
#   1. h2hc-linker's own k2     (browser-agent DHT participation)
#   2. the "background conductor" started by `hc sandbox generate`
#      here  (linker's H2HC_LINKER_CONDUCTOR_URL points at its admin
#      port for installApp; as a peer it's just another k2 node)
#   3. the progenitor's hc-spin conductor                (the
#      "progenitor window")
#
# Usage:
#   ./deploy/local-dev.sh              Start bootstrap + conductor + linker (foreground, no joining service)
#   ./deploy/local-dev.sh joining      Also start local joining service
#   ./deploy/local-dev.sh progenitor   Run hc-spin as progenitor against an already-running stack
#   ./deploy/local-dev.sh stop         Stop all local services (preserves $SANDBOX_DIR for forensics)
#   ./deploy/local-dev.sh status       Show component status
#   ./deploy/local-dev.sh clean        Wipe $SANDBOX_DIR (logs + conductor state + repacked .happ)
#
# Env (all have defaults):
#   NETWORK_SEED           shared by every conductor + hc-spin   (default: emergence-local-dev)
#   AUTH_METHOD            invite_code | email_code | open       (default: open)
#   INVITE_CODES           comma-separated                       (default: test-invite-123)
#   NUM_CONDUCTORS         1 or 2 (2 enables peer gossip)        (default: 1)
#   LINKER_PORT                                                  (default: 8000)
#   JOINING_SERVICE_PORT                                         (default: 3000)
#   LINKER_ADMIN_SECRET    only set in joining mode              (default: local-dev-secret)
#   H2HC_LINKER_DIR                                              (default: ../h2hc-linker)
#   JOINING_SERVICE_DIR                                          (default: ../joining-service)
#   PROGENITOR_UI_PORT     vite dev server hc-spin loads UI from (default: 1420)
#
# Parent layout assumed:
#   parent/
#   ├── emergence/
#   ├── h2hc-linker/
#   └── joining-service/   (only needed for `joining` mode)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Configurable via env ---
HAPP_BUNDLE_PATH="${HAPP_BUNDLE_PATH:-$PROJECT_DIR/workdir/emergence.happ}"
H2HC_LINKER_DIR="${H2HC_LINKER_DIR:-$PROJECT_DIR/../h2hc-linker}"
JOINING_SERVICE_DIR="${JOINING_SERVICE_DIR:-$PROJECT_DIR/../joining-service}"
LINKER_PORT="${LINKER_PORT:-8000}"
JOINING_SERVICE_PORT="${JOINING_SERVICE_PORT:-3000}"
SANDBOX_DIR="${SANDBOX_DIR:-/tmp/emergence-local-dev}"
NUM_CONDUCTORS="${NUM_CONDUCTORS:-1}"
LINKER_ADMIN_SECRET="${LINKER_ADMIN_SECRET:-local-dev-secret}"
AUTH_METHOD="${AUTH_METHOD:-open}"
INVITE_CODES="${INVITE_CODES:-test-invite-123}"
NETWORK_SEED="${NETWORK_SEED:-emergence-local-dev}"
PROGENITOR_UI_PORT="${PROGENITOR_UI_PORT:-1420}"

LINKER_BINARY="$H2HC_LINKER_DIR/target/release/h2hc-linker"

BOOTSTRAP_URL=""
RELAY_URL=""

# --- Logging ---
log_info()  { echo -e "\033[0;36m[emergence-dev]\033[0m $*"; }
log_warn()  { echo -e "\033[0;33m[emergence-dev]\033[0m $*"; }
log_error() { echo -e "\033[0;31m[emergence-dev]\033[0m $*"; }

read_state() { cat "$SANDBOX_DIR/$1" 2>/dev/null || echo ""; }

# --- Prerequisites ---
check_prereqs() {
    local ok=true

    for cmd in hc holochain curl kitsune2-bootstrap-srv; do
        if ! command -v "$cmd" &>/dev/null; then
            log_error "Missing: $cmd (run 'nix develop')"
            ok=false
        fi
    done

    if [ ! -f "$HAPP_BUNDLE_PATH" ]; then
        log_error "hApp bundle not found at $HAPP_BUNDLE_PATH"
        log_error "Run 'npm run build:happ' first"
        ok=false
    fi

    # Always run `cargo build --release` against the local linker checkout
    # so source edits in ../h2hc-linker get picked up on the next start
    # without a manual rebuild step. Cargo's own incremental check
    # short-circuits when nothing has changed (sub-second), and the prior
    # presence-only guard silently shipped stale binaries when the source
    # was edited between runs.
    if [ ! -d "$H2HC_LINKER_DIR" ]; then
        log_error "h2hc-linker checkout not found at $H2HC_LINKER_DIR"
        ok=false
    else
        log_info "Building h2hc-linker (cargo skips if up to date)..."
        if ! (cd "$H2HC_LINKER_DIR" && cargo build --release) >/dev/null 2>&1; then
            log_error "Failed to build linker. Re-run with verbose output:"
            log_error "  (cd $H2HC_LINKER_DIR && cargo build --release)"
            ok=false
        fi
    fi
    # Guard against the rare nix-store-interpreter staleness that survives
    # a successful build (e.g. cached binary from a previous nix develop).
    if [ "$ok" = true ] && [ -f "$LINKER_BINARY" ] \
        && ! "$LINKER_BINARY" --help >/dev/null 2>&1; then
        log_warn "Linker binary won't run (stale interpreter); forcing rebuild..."
        (cd "$H2HC_LINKER_DIR" && cargo clean -p h2hc-linker --release \
            && cargo build --release) || {
            log_error "Failed to rebuild linker"; ok=false;
        }
    fi

    [ "$ok" = true ] || exit 1

    # Repack the .happ with NETWORK_SEED baked into dna.yaml.
    #
    # Why this is needed: HWC's `joinAndInstall` does NOT pass
    # `dna_modifiers.network_seed` from the joining-service provision
    # response to the extension's `installApp` call (only `bundle`,
    # `installedAppId`, `membraneProofs`). So the extension installs
    # with whatever seed is baked into the bundle's manifest. Since
    # dnas/emergence/workdir/dna.yaml ships with no network_seed,
    # we have to repack against $NETWORK_SEED before serving the
    # bundle, or the HWC browser will land on a different DHT than
    # the conductors (which install via `hc sandbox --network-seed` /
    # `hc-spin --network-seed`).
    repack_happ_with_seed
    mkdir -p "$PROJECT_DIR/ui/public"
    cp "$SANDBOX_DIR/emergence-dev.happ" "$PROJECT_DIR/ui/public/emergence.happ"
    log_info "Staged repacked happ to ui/public/emergence.happ (seed=$NETWORK_SEED)"

    log_info "Prerequisites OK"
}

# Repack workdir/emergence.happ with NETWORK_SEED stamped into dna.yaml.
# Output goes to $SANDBOX_DIR/emergence-dev.happ. Original dna.yaml is
# restored after packing so the user's working tree stays clean.
repack_happ_with_seed() {
    local DNA_YAML="$PROJECT_DIR/dnas/emergence/workdir/dna.yaml"
    local DNA_YAML_BAK="$SANDBOX_DIR/dna.yaml.orig"
    local DEV_HAPP="$SANDBOX_DIR/emergence-dev.happ"

    # Skip if we've already repacked for this run with the right seed
    # AND neither dna.yaml nor the source .happ is newer.
    if [ -f "$DEV_HAPP" ] && [ "$DEV_HAPP" -nt "$DNA_YAML" ] && [ "$DEV_HAPP" -nt "$HAPP_BUNDLE_PATH" ]; then
        log_info "Repacked happ is up-to-date, skipping"
        return 0
    fi

    log_info "Repacking happ with network_seed='$NETWORK_SEED'..."

    cp "$DNA_YAML" "$DNA_YAML_BAK"

    # Replace the network_seed value in dna.yaml. emergence's dna.yaml
    # ships with `network_seed: ~` (null), so we replace that line with
    # the literal seed. Use a tab-aware regex; the original has 2-space
    # indent.
    sed -i "s|^\(\s*network_seed:\s*\).*$|\1$NETWORK_SEED|" "$DNA_YAML"

    # Repack DNA + happ. Capture failures to ensure we restore dna.yaml.
    local pack_ok=true
    hc dna pack "$PROJECT_DIR/dnas/emergence/workdir" \
        > "$SANDBOX_DIR/dna-pack.log" 2>&1 || pack_ok=false

    # Pack the .happ — happ.yaml references ./emergence.dna relative to
    # workdir/, so we use the user's workdir as the pack target. The
    # user's emergence.happ output gets temporarily overwritten; we
    # move it to our DEV_HAPP and rebuild from the restored dna.yaml
    # afterward.
    if [ "$pack_ok" = true ]; then
        rm -f "$PROJECT_DIR/workdir/emergence.happ"
        hc app pack "$PROJECT_DIR/workdir" \
            >> "$SANDBOX_DIR/dna-pack.log" 2>&1 || pack_ok=false
        if [ "$pack_ok" = true ] && [ -f "$PROJECT_DIR/workdir/emergence.happ" ]; then
            mv "$PROJECT_DIR/workdir/emergence.happ" "$DEV_HAPP"
        else
            pack_ok=false
        fi
    fi

    # ALWAYS restore the original dna.yaml, even on failure.
    mv "$DNA_YAML_BAK" "$DNA_YAML"

    if [ "$pack_ok" = false ]; then
        log_error "Failed to repack happ. Last 20 lines of log:"
        tail -20 "$SANDBOX_DIR/dna-pack.log"
        exit 1
    fi

    # Re-pack the user's .happ from the (now-restored) dna.yaml so the
    # workdir is left in a consistent state for downstream tooling
    # (tryorama tests etc. that read workdir/emergence.happ).
    hc dna pack "$PROJECT_DIR/dnas/emergence/workdir" \
        >> "$SANDBOX_DIR/dna-pack.log" 2>&1 || true
    hc app pack "$PROJECT_DIR/workdir" \
        >> "$SANDBOX_DIR/dna-pack.log" 2>&1 || true

    log_info "Repacked happ written to $DEV_HAPP"
}

# --- Bootstrap server (kitsune2 + iroh-relay) ---
start_bootstrap() {
    local PID_FILE="$SANDBOX_DIR/bootstrap.pid"

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log_warn "Bootstrap server already running (PID $(cat "$PID_FILE"))"
        BOOTSTRAP_URL=$(read_state "bootstrap_url.txt")
        RELAY_URL=$(read_state "relay_url.txt")
        return 0
    fi

    log_info "Starting kitsune2-bootstrap-srv..."

    kitsune2-bootstrap-srv --listen 127.0.0.1:0 \
        > "$SANDBOX_DIR/bootstrap.log" 2>&1 &

    local PID=$!
    echo "$PID" > "$PID_FILE"

    # Wait for the listening line. In kitsune2-bootstrap-srv with
    # `no_relay_server: false` (the default), the iroh-relay endpoint
    # is bundled into the same HTTP listener as bootstrap — so the
    # relay URL is the bootstrap URL. The "QUIC server listening on
    # bind_addr=…" line is the QAD (QUIC Address Discovery) port,
    # which is auxiliary and NOT the relay endpoint. Pointing the
    # conductor at the QAD port instead of the bootstrap URL leaves
    # iroh stuck without a "current url", so it never publishes agent
    # info to the bootstrap and no peer discovery happens.
    for _ in $(seq 1 15); do
        if grep -q "#kitsune2_bootstrap_srv#listening#" "$SANDBOX_DIR/bootstrap.log" 2>/dev/null; then
            local BOOTSTRAP_PORT
            BOOTSTRAP_PORT=$(grep -oP '#kitsune2_bootstrap_srv#listening#\K[^#]+' "$SANDBOX_DIR/bootstrap.log" \
                | head -1 | cut -d: -f2)
            BOOTSTRAP_URL="http://127.0.0.1:$BOOTSTRAP_PORT"
            RELAY_URL="$BOOTSTRAP_URL"
            echo "$BOOTSTRAP_URL" > "$SANDBOX_DIR/bootstrap_url.txt"
            echo "$RELAY_URL" > "$SANDBOX_DIR/relay_url.txt"
            log_info "Bootstrap ready: $BOOTSTRAP_URL  (relay: same)"
            return 0
        fi
        if ! kill -0 "$PID" 2>/dev/null; then
            log_error "Bootstrap server died. Last 20 lines:"
            tail -20 "$SANDBOX_DIR/bootstrap.log"
            exit 1
        fi
        sleep 1
    done

    log_error "Bootstrap timed out. Check $SANDBOX_DIR/bootstrap.log"
    exit 1
}

# --- Conductor ---
start_conductor() {
    local INDEX=${1:-1}
    local SUFFIX=""
    [ "$INDEX" -gt 1 ] && SUFFIX="_$INDEX"

    local DATA_DIR="$SANDBOX_DIR/data$SUFFIX"
    local PID_FILE="$SANDBOX_DIR/conductor$SUFFIX.pid"
    local LOG_FILE="$SANDBOX_DIR/conductor$SUFFIX.log"
    local ADMIN_FILE="$SANDBOX_DIR/admin_port$SUFFIX.txt"

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log_warn "Conductor $INDEX already running (PID $(cat "$PID_FILE"))"
        return 0
    fi

    log_info "Starting conductor $INDEX..."
    rm -rf "$DATA_DIR" "$LOG_FILE" 2>/dev/null || true
    mkdir -p "$DATA_DIR"

    # Match the App ID emergence's UI uses (note the historical typo
    # "emegence" — see ui/src/emergence/emergence/types.ts).
    local APP_ID="emegence"
    [ "$INDEX" -gt 1 ] && APP_ID="emegence_${INDEX}"

    (echo "test-passphrase" | \
        RUST_LOG="info,holochain=debug,kitsune2=debug" \
        hc sandbox --piped generate \
            --in-process-lair \
            --run 0 \
            --app-id "$APP_ID" \
            --network-seed "$NETWORK_SEED" \
            --root "$DATA_DIR" \
            "$HAPP_BUNDLE_PATH" \
            network -b "$BOOTSTRAP_URL" quic "$RELAY_URL") \
        > "$LOG_FILE" 2>&1 &

    local PID=$!
    echo "$PID" > "$PID_FILE"

    log_info "Waiting for conductor $INDEX (PID: $PID)..."
    for _ in $(seq 1 60); do
        if grep -q '"admin_port":' "$LOG_FILE" 2>/dev/null; then
            local ADMIN_PORT
            ADMIN_PORT=$(grep -oP '"admin_port":\K\d+' "$LOG_FILE" | head -1)
            echo "$ADMIN_PORT" > "$ADMIN_FILE"
            # Linker uses the FIRST conductor's admin port.
            [ "$INDEX" -eq 1 ] && echo "$ADMIN_PORT" > "$SANDBOX_DIR/admin_port.txt"
            log_info "Conductor $INDEX ready (admin port $ADMIN_PORT)"
            return 0
        fi
        if ! kill -0 "$PID" 2>/dev/null; then
            log_error "Conductor $INDEX died. Last 20 lines:"
            tail -20 "$LOG_FILE"
            exit 1
        fi
        sleep 1
    done

    log_error "Conductor $INDEX timed out. Check $LOG_FILE"
    exit 1
}

start_conductors() {
    for i in $(seq 1 "$NUM_CONDUCTORS"); do
        start_conductor "$i"
        [ "$i" -lt "$NUM_CONDUCTORS" ] && sleep 1
    done

    if [ "$NUM_CONDUCTORS" -ge 2 ]; then
        log_info "Waiting 30s for DHT arc establishment..."
        sleep 30
    fi
}

# --- Linker ---
start_linker() {
    local MODE="${1:-basic}"
    local PID_FILE="$SANDBOX_DIR/linker.pid"

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log_warn "Linker already running (PID $(cat "$PID_FILE"))"
        return 0
    fi

    local ADMIN_PORT
    ADMIN_PORT=$(read_state "admin_port.txt")
    if [ -z "$ADMIN_PORT" ]; then
        log_error "No admin port found. Start conductors first."
        exit 1
    fi

    local -a LINKER_ENV=(
        "H2HC_LINKER_CONDUCTOR_URL=127.0.0.1:$ADMIN_PORT"
        "H2HC_LINKER_BOOTSTRAP_URL=$BOOTSTRAP_URL"
        "H2HC_LINKER_RELAY_URL=$RELAY_URL"
        "RUST_LOG=info,h2hc_linker=debug"
    )
    # Local-dev runs the linker in open-auth mode (no admin secret) even
    # in joining mode. The joining service still does its job (provision
    # / linker URL handout / membrane proofs) but the linker auto-accepts
    # any agent's WS auth — no allowlist round-trip needed. This avoids
    # the trap where a stale HWC install can't auth into a freshly-
    # restarted linker because its allowlist is empty.
    log_info "Starting linker on port $LINKER_PORT (no auth, conductor admin $ADMIN_PORT)..."

    env -u H2HC_LINKER_ADMIN_SECRET "${LINKER_ENV[@]}" \
        "$LINKER_BINARY" --port "$LINKER_PORT" > "$SANDBOX_DIR/linker.log" 2>&1 &

    local PID=$!
    echo "$PID" > "$PID_FILE"

    for _ in $(seq 1 15); do
        if curl -sf "http://localhost:$LINKER_PORT/health" > /dev/null 2>&1; then
            log_info "Linker ready on port $LINKER_PORT"
            return 0
        fi
        if ! kill -0 "$PID" 2>/dev/null; then
            log_error "Linker died. Last 20 lines:"
            tail -20 "$SANDBOX_DIR/linker.log"
            exit 1
        fi
        sleep 1
    done

    if kill -0 "$PID" 2>/dev/null; then
        log_info "Linker started (health endpoint not yet responding, but process running)"
    else
        log_error "Linker failed to start. Check $SANDBOX_DIR/linker.log"
        exit 1
    fi
}

# --- Joining Service ---
start_joining_service() {
    local PID_FILE="$SANDBOX_DIR/joining.pid"

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log_warn "Joining service already running (PID $(cat "$PID_FILE"))"
        return 0
    fi

    if [ ! -d "$JOINING_SERVICE_DIR" ]; then
        log_error "joining-service not found at $JOINING_SERVICE_DIR"
        exit 1
    fi

    local CONFIG_FILE="$SANDBOX_DIR/joining-config.json"

    # Build invite-codes JSON array (only used for invite_code mode).
    local CODES_JSON="[]"
    if [ -n "$INVITE_CODES" ]; then
        CODES_JSON=$(echo "$INVITE_CODES" | tr ',' '\n' | sed 's/^/"/;s/$/"/' | paste -sd',' | sed 's/^/[/;s/$/]/')
    fi

    cat > "$CONFIG_FILE" <<JSONEOF
{
  "happ": { "id": "emegence", "name": "Emergence" },
  "auth_methods": ["$AUTH_METHOD"],
  "invite_codes": $CODES_JSON,
  "session": { "store": "memory" },
  "network": {
    "bootstrap_url": "$BOOTSTRAP_URL",
    "relay_url": "$RELAY_URL"
  },
  "dna_modifiers": {
    "network_seed": "$NETWORK_SEED",
    "properties": {}
  },
  "dna_hashes": ["emergence"],
  "port": $JOINING_SERVICE_PORT,
  "linker_registrations": [
    {
      "linker_url": { "url": "http://localhost:$LINKER_PORT" }
    }
  ]
}
JSONEOF

    log_info "Starting joining service ($AUTH_METHOD auth, config: $CONFIG_FILE)..."

    (cd "$JOINING_SERVICE_DIR" && npx tsx src/server.ts "$CONFIG_FILE") \
        > "$SANDBOX_DIR/joining.log" 2>&1 &

    local PID=$!
    echo "$PID" > "$PID_FILE"

    for _ in $(seq 1 15); do
        if curl -sf "http://localhost:$JOINING_SERVICE_PORT/v1/info" > /dev/null 2>&1; then
            log_info "Joining service ready on port $JOINING_SERVICE_PORT"
            return 0
        fi
        if ! kill -0 "$PID" 2>/dev/null; then
            log_error "Joining service died. Last 20 lines:"
            tail -20 "$SANDBOX_DIR/joining.log"
            exit 1
        fi
        sleep 1
    done

    if kill -0 "$PID" 2>/dev/null; then
        log_info "Joining service started (info not yet responding, but process running)"
    else
        log_error "Joining service failed. Check $SANDBOX_DIR/joining.log"
        exit 1
    fi
}

# --- Progenitor (hc-spin) ---
# Run a separate full-arc agent via hc-spin, joined to the same
# bootstrap+relay+network-seed as the background conductor. The first agent
# to complete the initial-config wizard (Quick Setup / Manual Config) on
# the Admin pane becomes the de-facto progenitor; emergence's dna.yaml
# does not bake in a progenitor_pubkey, so all integrity validation runs
# in relaxed mode.

# Background-launch hc-spin for use inside cmd_start. Tracks PID and
# pipes stdout/stderr to a log file. Returns immediately so the caller
# can keep going.
start_progenitor_ui_bg() {
    local PID_FILE="$SANDBOX_DIR/progenitor.pid"

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        log_warn "Progenitor already running (PID $(cat "$PID_FILE"))"
        return 0
    fi

    if [ ! -f "$HAPP_BUNDLE_PATH" ]; then
        log_warn "skipping progenitor: hApp bundle not built yet"
        return 0
    fi

    log_info "Launching hc-spin progenitor (background)..."
    log_info "  bootstrap=$BOOTSTRAP_URL  relay=$RELAY_URL  ui_port=$PROGENITOR_UI_PORT"
    log_info "  (network_seed=$NETWORK_SEED applied by UI via clone, not hc-spin)"

    # NOTE: we deliberately DO NOT pass --network-seed to hc-spin.
    # emergence's model is "provisioned cell = empty template; each
    # network is a clone." The UI (when VITE_PROGENITOR_NETWORK_SEED
    # is set) auto-creates a clone with $NETWORK_SEED on first boot.
    # If we *also* gave hc-spin --network-seed, the provisioned cell
    # would land on the same DNA hash as the clone the UI is about to
    # create → conductor returns DuplicateCellId.
    #
    # Strip ELECTRON_RUN_AS_NODE / ELECTRON_NO_ATTACH_CONSOLE — these
    # are set by some IDE shells and make electron behave as a node
    # interpreter, breaking hc-spin.
    env -u ELECTRON_RUN_AS_NODE -u ELECTRON_NO_ATTACH_CONSOLE \
        "$PROJECT_DIR/node_modules/.bin/hc-spin" -n 1 \
            --bootstrap-url "$BOOTSTRAP_URL" \
            --relay-url "$RELAY_URL" \
            --ui-port "$PROGENITOR_UI_PORT" \
            "$HAPP_BUNDLE_PATH" \
        > "$SANDBOX_DIR/progenitor.log" 2>&1 &

    local PID=$!
    echo "$PID" > "$PID_FILE"
    log_info "Progenitor running (PID $PID, log: $SANDBOX_DIR/progenitor.log)"
}

# Foreground hc-spin (for `npm run start:hwc:progenitor` standalone use).
cmd_progenitor() {
    BOOTSTRAP_URL=$(read_state "bootstrap_url.txt")
    RELAY_URL=$(read_state "relay_url.txt")

    if [ -z "$BOOTSTRAP_URL" ] || [ -z "$RELAY_URL" ]; then
        log_error "Bootstrap/relay URLs not found in $SANDBOX_DIR."
        log_error "Start the backend stack first: 'npm run start:hwc:joining' (or 'start:hwc')."
        exit 1
    fi

    if [ ! -f "$HAPP_BUNDLE_PATH" ]; then
        log_error "hApp bundle not found at $HAPP_BUNDLE_PATH (run 'npm run build:happ')"
        exit 1
    fi

    if ! curl -sf "http://localhost:$PROGENITOR_UI_PORT/" > /dev/null 2>&1; then
        log_warn "Vite dev server at port $PROGENITOR_UI_PORT not responding —"
        log_warn "hc-spin will fail unless the UI is being served. Start the"
        log_warn "backend stack first: 'npm run start:hwc:joining'."
    fi

    log_info "Launching hc-spin progenitor:"
    log_info "  bootstrap=$BOOTSTRAP_URL"
    log_info "  relay=$RELAY_URL"
    log_info "  ui_port=$PROGENITOR_UI_PORT (vite dev server)"
    log_info "  network_seed=$NETWORK_SEED applied by UI via clone, not hc-spin"

    # See note in start_progenitor_ui_bg: NO --network-seed to hc-spin.
    # The UI clones into $NETWORK_SEED on its own. exec so the
    # foreground PID is hc-spin itself; SIGINT/SIGTERM kill the
    # electron window cleanly. `env -u …` strips electron-as-node
    # markers some IDE shells set.
    exec env -u ELECTRON_RUN_AS_NODE -u ELECTRON_NO_ATTACH_CONSOLE \
        "$PROJECT_DIR/node_modules/.bin/hc-spin" -n 1 \
        --bootstrap-url "$BOOTSTRAP_URL" \
        --relay-url "$RELAY_URL" \
        --ui-port "$PROGENITOR_UI_PORT" \
        "$HAPP_BUNDLE_PATH"
}

# --- Stop ---
cmd_stop() {
    log_info "Stopping emergence local dev services..."
    local found=false

    for name in progenitor joining linker bootstrap; do
        local PID_FILE="$SANDBOX_DIR/${name}.pid"
        if [ -f "$PID_FILE" ]; then
            local PID
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
                log_info "Stopped $name (PID $PID)"
            fi
            rm -f "$PID_FILE"
            found=true
        fi
    done

    for i in $(seq 1 10); do
        local SUFFIX=""
        [ "$i" -gt 1 ] && SUFFIX="_$i"
        local PID_FILE="$SANDBOX_DIR/conductor$SUFFIX.pid"
        if [ -f "$PID_FILE" ]; then
            local PID
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
                log_info "Stopped conductor $i (PID $PID)"
            fi
            rm -f "$PID_FILE"
            found=true
        fi
    done

    # Belt-and-braces: catch anything still hanging on by name.
    # `hc sandbox generate` forks the actual holochain binary then exits,
    # so the PID we tracked is the wrapper's. The conductor child outlives
    # it and only dies if we kill it by name.
    pkill -f 'h2hc-linker --port' 2>/dev/null || true
    pkill -f 'kitsune2-bootstrap-srv' 2>/dev/null || true
    pkill -f 'tsx src/server.ts.*joining-config' 2>/dev/null || true
    pkill -f "holochain.*$SANDBOX_DIR" 2>/dev/null || true
    pkill -f "hc sandbox.*$SANDBOX_DIR" 2>/dev/null || true
    # hc-spin (progenitor) — match its electron child + cli wrapper +
    # the holochain conductor it spawns into its own /tmp/nix-shell.*
    # sandbox dir (not $SANDBOX_DIR).
    pkill -f 'hc-spin.*--network-seed' 2>/dev/null || true
    pkill -f 'electron.*hc-spin' 2>/dev/null || true
    pkill -f 'holochain --piped --structured=Log --config-path /tmp/nix-shell' 2>/dev/null || true

    # If launched via `npm run start:hwc[:joining]`, the script is running
    # inside a `concurrently` process tree alongside vite. Kill the
    # foreground script so concurrently --kill-others tears down vite too.
    local SCRIPT_PID
    SCRIPT_PID=$(read_state "local-dev.pid")
    if [ -n "$SCRIPT_PID" ] && [ "$SCRIPT_PID" != "$$" ] && kill -0 "$SCRIPT_PID" 2>/dev/null; then
        kill "$SCRIPT_PID" 2>/dev/null || true
        log_info "Stopped foreground local-dev.sh (PID $SCRIPT_PID)"
    fi
    rm -f "$SANDBOX_DIR/local-dev.pid" 2>/dev/null || true

    if [ "$found" = false ]; then
        log_info "No tracked services running"
    else
        log_info "All services stopped"
    fi
}

# --- Clean ---
# Wipe $SANDBOX_DIR (logs, conductor state, repacked .happ, stamped
# joining config). Refuses to run while any tracked process is still
# alive — call `stop` first. We deliberately do NOT clean on `stop`
# itself: leaving the sandbox dir intact is what makes post-mortem
# `tail .../linker.log` etc. useful when debugging gossip stalls or
# zombie agents.
cmd_clean() {
    local alive=()
    for name in bootstrap conductor linker joining progenitor; do
        local F="$SANDBOX_DIR/${name}.pid"
        [ -f "$F" ] && kill -0 "$(cat "$F")" 2>/dev/null && alive+=("$name")
    done
    if [ ${#alive[@]} -gt 0 ]; then
        log_error "Cannot clean while running: ${alive[*]}"
        log_error "Run './deploy/local-dev.sh stop' first."
        exit 1
    fi

    if [ ! -d "$SANDBOX_DIR" ]; then
        log_info "Sandbox dir $SANDBOX_DIR does not exist; nothing to clean."
        return 0
    fi

    log_info "Wiping sandbox dir $SANDBOX_DIR..."
    rm -rf "$SANDBOX_DIR"

    # Also remove the staged .happ. Vite serves it from ui/public/ to
    # the HWC extension; if the seed in the worktree's dna.yaml has
    # diverged from the staged bundle, wiping forces start to repack.
    if [ -f "$PROJECT_DIR/ui/public/emergence.happ" ]; then
        rm -f "$PROJECT_DIR/ui/public/emergence.happ"
        log_info "Removed staged ui/public/emergence.happ"
    fi

    log_info "Clean complete."
}

# --- Status ---
cmd_status() {
    echo ""
    log_info "=== emergence local HWC dev status ==="

    local F="$SANDBOX_DIR/bootstrap.pid"
    if [ -f "$F" ] && kill -0 "$(cat "$F")" 2>/dev/null; then
        echo "  Bootstrap:        running (PID $(cat "$F"), $(read_state "bootstrap_url.txt"))"
    else
        echo "  Bootstrap:        stopped"
    fi

    for i in $(seq 1 "$NUM_CONDUCTORS"); do
        local SUFFIX=""
        [ "$i" -gt 1 ] && SUFFIX="_$i"
        F="$SANDBOX_DIR/conductor$SUFFIX.pid"
        if [ -f "$F" ] && kill -0 "$(cat "$F")" 2>/dev/null; then
            echo "  Conductor $i:      running (PID $(cat "$F"), admin $(read_state "admin_port$SUFFIX.txt"))"
        else
            echo "  Conductor $i:      stopped"
        fi
    done

    F="$SANDBOX_DIR/linker.pid"
    if [ -f "$F" ] && kill -0 "$(cat "$F")" 2>/dev/null; then
        echo "  Linker:           running (PID $(cat "$F"), port $LINKER_PORT)"
    else
        echo "  Linker:           stopped"
    fi

    F="$SANDBOX_DIR/joining.pid"
    if [ -f "$F" ] && kill -0 "$(cat "$F")" 2>/dev/null; then
        echo "  Joining service:  running (PID $(cat "$F"), port $JOINING_SERVICE_PORT)"
    else
        echo "  Joining service:  not started"
    fi

    F="$SANDBOX_DIR/progenitor.pid"
    if [ -f "$F" ] && kill -0 "$(cat "$F")" 2>/dev/null; then
        echo "  Progenitor:       running (hc-spin PID $(cat "$F"), log: $SANDBOX_DIR/progenitor.log)"
    else
        echo "  Progenitor:       not started"
    fi

    echo "  Sandbox dir:      $SANDBOX_DIR"
    echo ""
    echo "  Open in browser:"
    echo "    http://localhost:1420/?runtime=hwc&joiningServiceUrl=http://localhost:$JOINING_SERVICE_PORT/v1"
    echo ""
}

# --- Main ---
TAIL_PID=""
cleanup() {
    log_info "Shutting down..."
    [ -n "$TAIL_PID" ] && kill "$TAIL_PID" 2>/dev/null || true
    cmd_stop
    exit 0
}

cmd_start() {
    local MODE="${1:-basic}"

    mkdir -p "$SANDBOX_DIR"
    # Stash this script's own PID so `cmd_stop` can SIGTERM it (and via
    # concurrently --kill-others, the sibling UI/vite process too).
    echo "$$" > "$SANDBOX_DIR/local-dev.pid"

    check_prereqs
    start_bootstrap
    start_conductors
    start_linker "$MODE"

    if [ "$MODE" = "joining" ]; then
        start_joining_service
    fi

    # Always launch hc-spin progenitor — emergence needs an existing
    # progenitor to set up site-maps + time-windows before any HWC
    # browser user can usefully use the app, and bundling it here
    # guarantees it shares the same bootstrap/relay/network-seed values
    # as the linker's backing conductor (no chance of stale URLs from a
    # separate-terminal launch).
    start_progenitor_ui_bg

    cmd_status

    log_info "Local HWC infrastructure ready. Press Ctrl-C (or run 'npm run stop:hwc') to stop."
    trap cleanup INT TERM
    # Keep script alive — backgrounded children may have detached, leaving
    # nothing for `wait`. tail -f /dev/null gives concurrently a process
    # to track.
    tail -f /dev/null &
    TAIL_PID=$!
    wait
}

case "${1:-start}" in
    start|"")    cmd_start ;;
    joining)     cmd_start joining ;;
    progenitor)  cmd_progenitor ;;
    stop)        cmd_stop ;;
    status)      cmd_status ;;
    clean)       cmd_clean ;;
    *)           echo "Usage: $0 [start|joining|progenitor|stop|status|clean]"; exit 1 ;;
esac
