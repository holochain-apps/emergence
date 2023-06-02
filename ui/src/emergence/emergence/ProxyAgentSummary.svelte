<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { storeContext } from '../../contexts';
import {DetailsType, type Info, type ProxyAgent} from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import ProxyAgentAvatar from "./ProxyAgentAvatar.svelte";

const dispatch = createEventDispatcher();


export let proxyAgent: Info<ProxyAgent>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

let editing = false;

let errorSnackbar: Snackbar;
  
$: editing,  error, loading, proxyAgent;

onMount(async () => {
  if (proxyAgent === undefined) {
    throw new Error(`The proxyAgent input is required for the ProxyAgentDetail element`);
  }
  loading=false
});

</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the proxyAgent: {error.data.data}</span>
{:else}

<div class="summary card"
  on:click={(e)=>{
    store.openDetails(DetailsType.ProxyAgent, proxyAgent.original_hash)
    e.stopPropagation()
  }}
  >

  <div class="pic">
    <ProxyAgentAvatar size={64} proxyAgentHash={proxyAgent.original_hash}></ProxyAgentAvatar>
  </div>
  <div style="display: flex; flex-direction: column;">
    <h2>{proxyAgent.record.entry.nickname}</h2>
    {#if proxyAgent.record.entry.location}
      <div style="display: flex; flex-direction: row; ">
        <span style="margin-right: 4px"><strong>Location:</strong></span>
        <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.location }</span>
      </div>
    {/if}
    {#if proxyAgent.record.entry.bio}
      <div style="display: flex; flex-direction: row; ">
        <span style="margin-right: 4px"><strong>Bio:</strong></span>
        <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.bio }</span>
      </div>
    {/if}
  </div>
</div>
{/if}

<style>
  .summary {
    padding: 10px;
  }
  .pic {
   margin-right: 10px;
  }
</style> 