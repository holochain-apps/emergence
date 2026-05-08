<script lang="ts">
  import {
    hwcClient,
    hwcConnectionState,
    hwcBootStage,
    HWC_STAGE_LABEL,
  } from "../../stores/hwc-connection-store";

  // `compact` = small footer-style badge (used after main UI has
  // loaded). Default = full panel suitable for the loading screen.
  export let compact: boolean = false;

  $: state = $hwcConnectionState;
  $: stage = $hwcBootStage;
  $: linkerHost = (() => {
    try {
      return state?.linkerUrl ? new URL(state.linkerUrl).host : null;
    } catch {
      return null;
    }
  })();

  const dotColor = (ok: boolean | undefined, warn: boolean = false) =>
    ok ? "#4caf50" : warn ? "#ff9800" : "#f44336";
</script>

{#if compact}
  <div class="hwc-badge" title={state?.linkerUrl ?? ""}>
    <span class="dot" style="background:{dotColor(state?.authenticated, state?.wsHealthy)}"></span>
    <span class="label">linker</span>
    {#if linkerHost}
      <span class="muted">·</span>
      <span class="muted">{linkerHost}</span>
    {/if}
    {#if state?.peerCount != null}
      <span class="muted">·</span>
      <span>{state.peerCount} {state.peerCount === 1 ? "peer" : "peers"}</span>
    {/if}
    {#if state?.reconnectAttempt}
      <span class="muted">·</span>
      <span class="warn">reconnecting…</span>
    {/if}
  </div>
{:else}
  <div class="hwc-panel">
    <div class="hwc-stage">{HWC_STAGE_LABEL[stage]}</div>

    <div class="hwc-rows">
      <div class="row">
        <span class="dot" style="background:{dotColor(!!$hwcClient)}"></span>
        <span class="key">Extension</span>
        <span>{$hwcClient ? "active" : "waiting"}</span>
      </div>
      <div class="row">
        <span class="dot" style="background:{dotColor(state?.httpHealthy)}"></span>
        <span class="key">HTTP</span>
        <span>{state?.httpHealthy ? "connected" : "unreachable"}</span>
      </div>
      <div class="row">
        <span class="dot" style="background:{dotColor(state?.wsHealthy)}"></span>
        <span class="key">WebSocket</span>
        <span>{state?.wsHealthy ? "connected" : "disconnected"}</span>
      </div>
      <div class="row">
        <span
          class="dot"
          style="background:{dotColor(state?.authenticated, state?.wsHealthy)}"
        ></span>
        <span class="key">Auth</span>
        <span>
          {state?.authenticated
            ? "authenticated"
            : state?.wsHealthy
              ? "not authenticated"
              : "n/a"}
        </span>
      </div>

      {#if state?.linkerUrl}
        <div class="row">
          <span class="key">Linker</span>
          <span class="mono">{state.linkerUrl}</span>
        </div>
      {/if}

      {#if state?.peerCount != null}
        <div class="row">
          <span
            class="dot"
            style="background:{dotColor(state.peerCount > 0, true)}"
          ></span>
          <span class="key">Peers</span>
          <span>{state.peerCount}</span>
        </div>
      {/if}

      {#if state?.reconnectAttempt}
        <div class="row warn">
          <span class="key">Reconnect</span>
          <span>
            attempt {state.reconnectAttempt}{#if state.nextReconnectMs}, next
              in {Math.round(state.nextReconnectMs / 1000)}s{/if}
          </span>
        </div>
      {/if}

      {#if state?.joiningServiceError}
        <div class="row err">
          <span class="key">Joining</span>
          <span>{state.joiningServiceError}</span>
        </div>
      {/if}

      {#if state?.lastError}
        <div class="row err">
          <span class="key">Error</span>
          <span class="mono small">{state.lastError}</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .hwc-panel {
    background: rgba(0, 0, 0, 0.45);
    color: #f0f0f0;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 14px 18px;
    margin-top: 18px;
    font-size: 12px;
    width: min(360px, 90vw);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }

  .hwc-stage {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #ffffff;
  }

  .hwc-rows .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
  }

  .hwc-rows .key {
    width: 80px;
    font-weight: 600;
    color: #d0d0e0;
  }

  .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .mono {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    word-break: break-all;
  }

  .small {
    font-size: 10px;
    opacity: 0.85;
  }

  .warn {
    color: #ffc266;
  }
  .err {
    color: #ff8e8e;
  }

  .hwc-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--sl-color-neutral-500, #666);
    background: rgba(0, 0, 0, 0.06);
    padding: 4px 10px;
    border-radius: 999px;
  }
  .hwc-badge .label {
    font-weight: 600;
  }
  .hwc-badge .muted {
    opacity: 0.55;
  }
  .hwc-badge .warn {
    color: #c47b00;
  }
</style>
