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
import type { UploadFiles } from '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import MultiSelect from 'svelte-multiselect'

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import { encodeHashToBase64, type EntryHash } from '@holochain/client';
  import { errorText } from './utils';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();
export let sitemap: Info<SiteMap>|undefined = undefined;  // set this if update

let text: string = '';
let pic: EntryHash | undefined = undefined;
let uploadFiles: UploadFiles
let tags: Array<string> = []

let errorSnackbar: Snackbar;

$: text
$: isSiteMapValid = text !== ""

onMount(() => {
});

export const open = (smap) => {
  sitemap = smap
  if (sitemap) {
    text = sitemap.record.entry.text
    pic = sitemap.record.entry.pic
    uploadFiles.defaultValue = pic ? pic : undefined  // can't be null, must be undefined
    tags = sitemap.record.entry.tags
  } else {
    text = ""
    pic = undefined
    uploadFiles.defaultValue = undefined
    tags= []
  }
  uploadFiles.reset()
  dialog.show()
}

async function updateSiteMap() {
  if (sitemap) {
    const pic = uploadFiles.value
    const updateRecord = await store.updateSiteMap(sitemap.original_hash, text, pic, tags)
    if (updateRecord) {
      dispatch('sitemap-updated', { actionHash: updateRecord.actionHash });
    }
    dialog.hide()
  }
}

async function createSiteMap() {  
  try {
    const pic = uploadFiles.value
    const record = await store.createSiteMap(text, pic, tags)

    dispatch('sitemap-created', { sitemap: record });
  } catch (e) {
    console.log("CREATE SITEMAP ERROR", e)
    errorSnackbar.labelText = `Error creating the sitemap: ${errorText(e)}`;
    errorSnackbar.show();
  }
  dialog.hide()
}

let dialog

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<sl-dialog label={sitemap?"Edit Sitemap":"Create Sitemap"}
  bind:this={dialog}
  >
              
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Text 
      value={ text } on:input={e => { text = e.target.value;} }
    ></sl-textarea>
  </div>

  <div style="margin-bottom: 16px">
    <span>Slot type:</span >
    <MultiSelect 
      bind:selected={tags} 
      options={store.getSlotTypeTags()}
      allowUserOptions={true}
      />
  </div>

  <div style="margin-bottom: 16px">
    <span>Add a pic (optional):</span >
  
      <upload-files
        bind:this={uploadFiles}
        one-file
        accepted-files="image/jpeg,image/png,image/gif"
        defaultValue={pic ? encodeHashToBase64(pic) : undefined}
        on:file-uploaded={(e) => {
          pic = e.detail.file.hash;
        }}
      ></upload-files>
  </div>

  {#if sitemap}
    <div style="display: flex; flex-direction: row; justify-content:flex-end;">
      <sl-button
        label="Cancel"
        on:click={() => dialog.hide()}
        style="margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
        on:click={() => updateSiteMap()}
        disabled={!isSiteMapValid}
        variant=primary>Save</sl-button>
    </div>
  {:else}
  <div style="display: flex; flex-direction: row; justify-content:flex-end;">
    <sl-button
    label="Cancel"
    on:click={() => dialog.hide()}
    style=" margin-right: 16px"
    >Cancel</sl-button>
    <sl-button 
    on:click={() => createSiteMap()}
    disabled={!isSiteMapValid}
    variant=primary>Create SiteMap</sl-button>
    </div>
  {/if}

</sl-dialog>
