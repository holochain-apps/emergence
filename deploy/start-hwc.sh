#!/usr/bin/env bash
# Wrapper for `npm run start:hwc[:joining]`. Centralizes env-var
# plumbing so the network seed is shared by every moving part:
#
#   NETWORK_SEED                     read by deploy/local-dev.sh
#   VITE_PROGENITOR_NETWORK_SEED     read by ui/src/App.svelte (vite
#                                     bakes it into import.meta.env)
#
# Both default to "emergence-local-dev". Override in your shell:
#
#   NETWORK_SEED=my-test-net npm run start:hwc:joining
#
# Usage:
#   ./deploy/start-hwc.sh           # backend stack (no joining service) + vite
#   ./deploy/start-hwc.sh joining   # also start joining service

set -euo pipefail

MODE="${1:-basic}"

export NETWORK_SEED="${NETWORK_SEED:-emergence-local-dev}"
# Mirror it into the VITE_-prefixed slot so vite exposes it via
# import.meta.env. The hc-spin UI loads the same vite dev server, so
# this env var lands in the bundle the progenitor window evaluates.
export VITE_PROGENITOR_NETWORK_SEED="$NETWORK_SEED"

echo "[start-hwc] NETWORK_SEED=$NETWORK_SEED"

npm run build:happ

if [ "$MODE" = "joining" ]; then
    SCRIPT_ARG="joining"
    NAMES="joining,ui"
else
    SCRIPT_ARG=""
    NAMES="linker,ui"
fi

exec npx concurrently --kill-others \
    --names "$NAMES" \
    --prefix-colors cyan,magenta \
    "./deploy/local-dev.sh $SCRIPT_ARG" \
    "UI_PORT=1420 npm run -w ui start"
