<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext } from "svelte";
  import Fa from "svelte-fa";
  import { faSync } from "@fortawesome/free-solid-svg-icons";
  import type { AgentPubKey } from '@holochain/client';

  export let agentPubKey: AgentPubKey | undefined
  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let syncing = false

  const doSync=async () => {
        syncing = true;
        console.log("start sync", new Date);
        await store.sync(agentPubKey);
        console.log("end sync", new Date);
        syncing=false 
    }
</script>
{#if syncing}
<sl-spinner></sl-spinner>
{:else}
<sl-button style="" size=small on:click={doSync} circle>
    <Fa icon={faSync} />
</sl-button>
{/if}

<style>

</style>