<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record  } from '@holochain/client';
import { storeContext } from '../../contexts';
import ProxyAgentSummary from './ProxyAgentSummary.svelte';
import type { EmergenceStore } from '../../emergence-store';
import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import ProxyAgentCrud from './ProxyAgentCrud.svelte';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let error: any = undefined;
let createProxyAgentDialog: ProxyAgentCrud

$: proxyAgents = store.proxyAgents
$: error;

onMount(async () => {
  store.fetchProxyAgents();
});

</script>

<ProxyAgentCrud
  bind:this={createProxyAgentDialog}
  on:proxyagent-created={() => {} }
></ProxyAgentCrud>

<div class="pane-header">
  <div class="header-content">
    <h3>Proxy Agents List</h3>
    <div class="section-controls">
      <sl-button style="margin-left: 8px; " on:click={() => { dispatch('proxyagents-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      <div class="pill-button" on:click={() => {createProxyAgentDialog.open(undefined) } }>
        <span>+</span> Create
      </div>
    </div> 
  </div>

</div>
<div class="pane-content">
  {#if error}
    <span>Error fetching the proxyagents: {error}.</span>
  {:else if $proxyAgents.length === 0}
    <span class="notice">No Proxy Agents Found.</span>
  {:else}
    {#each $proxyAgents as proxyAgent}
      <div style="margin-bottom: 8px; " >
        <ProxyAgentSummary proxyAgent={proxyAgent}  on:proxyagent-deleted={() => store.fetchProxyAgents()}></ProxyAgentSummary>
      </div>
    {/each}
  {/if}
</div>

<style>
</style>
