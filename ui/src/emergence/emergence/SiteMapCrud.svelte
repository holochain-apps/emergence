<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import type { Info, SiteMap } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import { encodeHashToBase64, type EntryHash } from '@holochain/client';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();
export let sitemap: Info<SiteMap>|undefined = undefined;  // set this if update

let text: string = '';
let pic: EntryHash | undefined = undefined;

let errorSnackbar: Snackbar;

$: text
$: isSiteMapValid = text !== ""

onMount(() => {
  store.fetchTags()
  if (sitemap) {
    text = sitemap.record.entry.text
    pic = sitemap.record.entry.pic
  }
});

async function updateSiteMap() {
  if (sitemap) {
    const updateRecord = await store.updateSiteMap(sitemap.original_hash, text, pic)
    if (updateRecord) {
      dispatch('sitemap-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createSiteMap() {  
  try {
    const record = await store.createSiteMap(text, pic)

    text = ""
    pic = undefined

    dispatch('sitemap-created', { sitemap: record });
  } catch (e) {
    console.log("CREATE SITEMAP ERROR", e)
    errorSnackbar.labelText = `Error creating the sitemap: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column; z-index:2;">
  {#if sitemap}
    <span style="font-size: 18px">Edit SiteMap</span>
  {:else}
    <span style="font-size: 18px">Create SiteMap</span>
  {/if}
              
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Text 
      value={ text } on:input={e => { text = e.target.value;} }
    ></sl-textarea>
  </div>

  <div style="margin-bottom: 16px">
    <span>Add a pic (optional):</span >
  
      <upload-files
        one-file
        accepted-files="image/jpeg,image/png,image/gif"
        defaultValue={pic ? encodeHashToBase64(pic) : undefined}
        on:file-uploaded={(e) => {
          pic = e.detail.file.hash;
        }}
      ></upload-files>
  </div>

  {#if sitemap}
    <div style="display: flex; flex-direction: row">
      <sl-button
        label="Cancel"
        on:click={() => dispatch('edit-canceled')}
        style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
        style="flex: 1;"
        on:click={() => updateSiteMap()}
        disabled={!isSiteMapValid}
        variant=primary>Save</sl-button>
    </div>
  {:else}
  <div style="display: flex; flex-direction: row">
    <sl-button
    label="Cancel"
    on:click={() => dispatch('edit-canceled')}
    style="flex: 1; margin-right: 16px"
    >Cancel</sl-button>
    <sl-button 
    on:click={() => createSiteMap()}
    disabled={!isSiteMapValid}
    variant=primary>Create SiteMap</sl-button>
    </div>
  {/if}

</div>
