import { writable, derived, type Readable } from "svelte/store";
import type { WebConductorAppClient } from "@holo-host/web-conductor-client";

// Subset of @holo-host/web-conductor-client's ConnectionState shape we
// actually use in the UI. Avoids a hard import-time coupling on the
// full type so this store also works when no HWC client is set.
export interface HwcConnectionState {
  status: string;
  httpHealthy: boolean;
  wsHealthy: boolean;
  authenticated: boolean;
  linkerUrl?: string | null;
  lastError?: string;
  reconnectAttempt?: number;
  nextReconnectMs?: number;
  joiningServiceError?: string;
  peerCount?: number;
}

export const hwcClient = writable<WebConductorAppClient | null>(null);
export const hwcConnectionState = writable<HwcConnectionState | null>(null);

/**
 * Set the HWC client and start mirroring its connection:change events
 * into hwcConnectionState. Returns an unsubscribe function suitable
 * for `onDestroy`. Safe to call multiple times — each call replaces
 * the previous subscription.
 */
let _unsubscribe: (() => void) | null = null;
export function bindHwcClient(client: WebConductorAppClient): () => void {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  hwcClient.set(client);
  hwcConnectionState.set(client.getConnectionState() as HwcConnectionState);

  const off = client.onConnection("connection:change", (state) => {
    hwcConnectionState.set({ ...(state as HwcConnectionState) });
  });
  _unsubscribe = off;
  return off;
}

/**
 * Boot-phase summary derived from connection state. Drives the
 * progressive loader text.
 */
export type HwcBootStage =
  | "waiting-extension"
  | "connecting-linker"
  | "ws-handshake"
  | "authenticating"
  | "no-peers"
  | "ready";

export const hwcBootStage: Readable<HwcBootStage> = derived(
  [hwcClient, hwcConnectionState],
  ([$client, $state]) => {
    if (!$client) return "waiting-extension";
    if (!$state) return "waiting-extension";
    if (!$state.httpHealthy) return "connecting-linker";
    if (!$state.wsHealthy) return "ws-handshake";
    if (!$state.authenticated) return "authenticating";
    if (($state.peerCount ?? 0) === 0) return "no-peers";
    return "ready";
  },
);

export const HWC_STAGE_LABEL: Record<HwcBootStage, string> = {
  "waiting-extension": "Waiting for HWC extension…",
  "connecting-linker": "Connecting to linker…",
  "ws-handshake": "Establishing WebSocket…",
  "authenticating": "Authenticating with linker…",
  "no-peers": "Connected. Waiting for peers…",
  "ready": "Connected",
};
