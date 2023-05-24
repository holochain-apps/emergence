<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record  } from '@holochain/client';
import { storeContext } from '../../contexts';
import ProxyAgentDetail from './ProxyAgentDetail.svelte';
import type { EmergenceStore } from '../../emergence-store';
import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;

$: proxyAgents = store.proxyAgents
$: error;

onMount(async () => {
  store.fetchProxyAgents();
});

</script>
<div class="pane-header">
  <sl-button style="margin-left: 8px; " on:click={() => { dispatch('proxyagents-close') } } circle>
    <Fa icon={faCircleArrowLeft} />
  </sl-button>
<h3>Proxy Agents List</h3>
</div>
<div class="pane-content">
  {#if error}
    <span>Error fetching the proxyagents: {error.data.data}.</span>
  {:else if $proxyAgents.length === 0}
    <span>No proxyagents found.</span>
  {:else}
    {#each $proxyAgents as proxyAgent}
      <div style="margin-bottom: 8px; width:500px; background:lightgray">
        <ProxyAgentDetail proxyAgent={proxyAgent}  on:proxyagent-deleted={() => store.fetchProxyAgents()}></ProxyAgentDetail>
      </div>
    {/each}
  {/if}
</div>

<style>
</style>
