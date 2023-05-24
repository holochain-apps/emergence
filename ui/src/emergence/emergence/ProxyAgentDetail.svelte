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
import { faTrash, faEdit, faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import ProxyAgentCrud from './ProxyAgentCrud.svelte'; 
import type { EmergenceStore } from '../../emergence-store';
import Confirm from './Confirm.svelte';
import { encodeHashToBase64,  } from '@holochain/client';
  import { slide } from 'svelte/transition';

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
{/if}
{#if editing}
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
{/if}
  <Confirm 
    bind:this={confirmDialog}
    message="This will remove this proxy agent for everyone!" 
    on:confirm-confirmed={deleteProxyAgent}></Confirm>


    <div transition:slide={{ axis: 'x', duration: 400 }}  class="pane-content">
      <div class="pane-header">
        <div class="controls">
          <sl-button on:click={() => { dispatch('proxyagent-close') } } circle>
            <Fa icon={faCircleArrowLeft} />
          </sl-button>
          <div>
            <sl-button style="margin-left: 8px; " on:click={(e) => { e.stopPropagation(); editing = true; } } circle>
              <Fa icon={faEdit} />
            </sl-button>
            <sl-button style="margin-left: 8px;" on:click={() => {confirmDialog.open()}} circle>
              <Fa icon={faTrash} />
            </sl-button>
          </div>
        </div>
    </div>

    <div class="details">

      <div style="display: flex; flex-direction: column; margin-left:20px">
        <div style="display: flex; flex-direction: row">
          <div class="pic">
            {#if proxyAgent.record.entry.pic}
            <show-image image-hash={encodeHashToBase64(proxyAgent.record.entry.pic)}></show-image>
            {/if}
          </div>
          <div style="display: flex; flex-direction: column; margin-left:10px">
            <h1>{ proxyAgent.record.entry.nickname }</h1>
            <div style="display: flex; flex-direction: row; margin-bottom: 16px">
              <span style="margin-right: 4px"><strong>Bio:</strong></span>
              <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.bio }</span>
            </div>
            <div style="display: flex; flex-direction: row; margin-bottom: 16px">
              <span style="margin-right: 4px"><strong>Location:</strong></span>
              <span style="white-proxyAgent: pre-line">{ proxyAgent.record.entry.location }</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

<style>
  .pic {
   max-width: 300px;
  }
</style> 