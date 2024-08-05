<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../stores/emergence-store';
  import { getContext } from "svelte";

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let agentPubKey: AgentPubKey

  $: agentPubKey
  $: s = store.profilesStore.profiles.get(agentPubKey)
  $: nickname = $s.status == "complete" ? $s.value?.entry.nickname : "..."
  $: fields = $s.status == "complete" ? Object.entries($s.value?.entry.fields).filter(([k,_])=>k!="avatar") : undefined
</script>

{#if $s.status == "complete" && $s.value}
<div style="display: flex; flex-direction:column; align-items: center">
    <h3 style="display: flex; flex-direction:row">
        <agent-avatar style="margin-right:10px" disable-tooltip={true} disable-copy={true}  agent-pub-key="{encodeHashToBase64(agentPubKey)}"></agent-avatar>
        {nickname}
    </h3>
        {#each fields as [label,value]}
            <div><strong>{label}</strong>: {value}</div>
        {/each}   
</div>
{:else}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <sl-spinner></sl-spinner>
    </div>

{/if}

<style>

</style>