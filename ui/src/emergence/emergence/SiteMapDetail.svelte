<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { storeContext } from '../../contexts';
import type {Info, SiteMap} from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import SiteMapCrud from './SiteMapCrud.svelte'; 
import type { EmergenceStore } from '../../stores/emergence-store';
import Confirm from './Confirm.svelte';
import { encodeHashToBase64,  } from '@holochain/client';
  import { errorText } from './utils';

const dispatch = createEventDispatcher();

export let sitemap: Info<SiteMap>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

let errorSnackbar: Snackbar;
  
$: error, loading, sitemap;

onMount(async () => {
  if (sitemap === undefined) {
    throw new Error(`The sitemap input is required for the SiteMapDetail element`);
  }
  loading=false
});

async function deleteSiteMap() {
  try {
    await store.deleteSiteMap(sitemap.original_hash)
    //await store.updateSiteMap(sitemap.original_hash, {trashed:true})
    dispatch('sitemap-deleted', { sitemapHash: sitemap.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the sitemap: ${errorText(e)}`;
    errorSnackbar.show();
  }
}
let confirmDialog
let updateSitemapDialog

</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
  <SiteMapCrud
  bind:this={updateSitemapDialog}
  sitemap={ sitemap }
  on:sitemap-updated={async () => {} }
></SiteMapCrud>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the sitemap: {error}</span>
{:else}
  <Confirm 
    bind:this={confirmDialog}
    message="This will remove this sitemap for everyone!" 
    on:confirm-confirmed={deleteSiteMap}></Confirm>

<div class="detail">
  <div style="display: flex; flex-direction: row">
    <span style="flex: 1"></span>
    <sl-button style="margin-left: 8px; " on:click={() => { updateSitemapDialog.open(sitemap) } } circle>
      <Fa icon={faEdit} />
    </sl-button>
    <sl-button style="margin-left: 8px;" on:click={() => {confirmDialog.open()}} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Name:</strong></span>
    <span style="white-sitemap: pre-line">{ sitemap.record.entry.text }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Slot Type:</strong></span>
    <span style="white-sitemap: pre-line">{ sitemap.record.entry.tags.join(",") }</span>
  </div>


  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Picture</strong></span>

    {#if sitemap.record.entry.pic}
    <div class="pic">
    <show-image image-hash={encodeHashToBase64(sitemap.record.entry.pic)}></show-image>
    </div>
    {/if}
  </div>

</div>
{/if}

<style>
  .detail {
    padding: 10px;
    display: flex;
    flex-direction: column;
  }
  .pic {
   max-width: 300px;
  }
</style> 