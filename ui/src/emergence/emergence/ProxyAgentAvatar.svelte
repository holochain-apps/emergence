<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey, type ActionHash } from "@holochain/client";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import "@holochain-open-dev/elements/dist/elements/holo-identicon.js";
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext } from "svelte";

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let proxyAgentHash: ActionHash
  export let size = 32

  $: proxyAgentHash
  $: proxyAgent = store.getProxyAgent(proxyAgentHash)
</script>

<div class="avatar">
    {#if proxyAgent.record.entry.pic}
        <div class="pic"><show-image style={`width:${size}px;height:${size}px;`} image-hash={encodeHashToBase64(proxyAgent.record.entry.pic)}></show-image></div>
    {:else}
        <holo-identicon disable-tooltip={true} disable-copy={true} size={size} hash={proxyAgent.original_hash}></holo-identicon>
    {/if}
</div>

<style>
    .pic {
        border-radius: 50%;
        overflow: hidden;
        box-shadow: 0 3px 3px rgba(0,0,0,.15);
    }
    .avatar {
    }
    
</style>