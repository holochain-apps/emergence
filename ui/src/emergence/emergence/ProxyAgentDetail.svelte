<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { storeContext } from '../../contexts';
import type {Info, ProxyAgent} from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import ProxyAgentCrud from './ProxyAgentCrud.svelte'; 
import type { EmergenceStore } from '../../emergence-store';
import Confirm from './Confirm.svelte';
import { encodeHashToBase64,  } from '@holochain/client';

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

async function deleteProxyAgent() {
  try {
    await store.deleteProxyAgent(proxyAgent.original_hash)
    //await store.updateProxyAgent(proxyAgent.original_hash, {trashed:true})
    dispatch('proxyagent-deleted', { proxyAgentHash: proxyAgent.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the proxyAgent: ${e.data.data}`;
    errorSnackbar.show();
  }
}
let confirmDialog
</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the proxyAgent: {error.data.data}</span>
{:else if editing}
  <div class="modal">
    <ProxyAgentCrud
    proxyAgent={ proxyAgent }
    on:proxyagent-updated={async () => {
      editing = false;
  //    await fetchProxyAgent()
    } }
    on:edit-canceled={() => { editing = false; } }
  ></ProxyAgentCrud>
  </div>
{:else}
  <Confirm 
    bind:this={confirmDialog}
    message="This will remove this proxyAgent for everyone!" 
    on:confirm-confirmed={deleteProxyAgent}></Confirm>

<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row">
    <span style="flex: 1"></span>
    <sl-button style="margin-left: 8px; " on:click={() => { editing = true; } } circle>
      <Fa icon={faEdit} />
    </sl-button>
    <sl-button style="margin-left: 8px;" on:click={() => {confirmDialog.open()}} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Nickname:</strong></span>
    <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.nickname }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Bio:</strong></span>
    <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.bio }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Location:</strong></span>
    <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.location }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Picture</strong></span>

    {#if proxyAgent.record.entry.pic}
    <div class="pic">
    <show-image image-hash={encodeHashToBase64(proxyAgent.record.entry.pic)}></show-image>
    </div>
    {/if}
  </div>

</div>
{/if}

<style>
  .pic {
   max-width: 300px;
  }
</style> 