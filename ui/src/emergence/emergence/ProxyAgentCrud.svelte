<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import type { Info, ProxyAgent } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import type { UploadFiles } from '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import { encodeHashToBase64, type EntryHash } from '@holochain/client15';
  import { errorText } from './utils';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();
export let proxyAgent: Info<ProxyAgent>|undefined = undefined;  // set this if update

let nickname: string = '';
let bio: string = '';
let location: string = '';
let pic: EntryHash | undefined = undefined;
let uploadFiles: UploadFiles

let errorSnackbar: Snackbar;

$: nickname, bio, location
$: isProxyAgentValid = nickname !== ""

onMount(() => {
});

export const open = (pagent) => {
  proxyAgent = pagent

  if (proxyAgent) {
    nickname = proxyAgent.record.entry.nickname
    bio = proxyAgent.record.entry.bio
    location = proxyAgent.record.entry.location
    pic = proxyAgent.record.entry.pic
    uploadFiles.defaultValue = pic ? pic : undefined  // can't be null, must be undefined

  } else {
    nickname = ""
    bio = ""
    location = ""
    pic = undefined
    uploadFiles.defaultValue = undefined
  }
  console.log("SDF", uploadFiles.defaultValue)
  uploadFiles.reset()
  dialog.show()
}

async function updateProxyAgent() {
  if (proxyAgent) {
    const updateRecord = await store.updateProxyAgent(proxyAgent.original_hash, nickname, bio, location, pic)
    if (updateRecord) {
      dispatch('proxyagent-updated', { actionHash: updateRecord.actionHash });
    }
    dialog.hide()
  }
}

async function createProxyAgent() {  
  try {
    const record = await store.createProxyAgent(nickname, bio, location, pic)

    dispatch('proxyagent-created', { proxyAgent: record });
  } catch (e) {
    console.log("CREATE PROXYAGENT ERROR", e)
    errorSnackbar.labelText = `Error creating the proxyAgent: ${errorText(e)}`;
    errorSnackbar.show();
  }
  dialog.hide()
}
let dialog

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<sl-dialog label={proxyAgent?"Edit Proxy Agent":"Create Proxy Agent"}
bind:this={dialog}
>
              
  <div style="margin-bottom: 16px">
    <sl-input
      label=Nickname 
      value={ nickname } on:input={e => { nickname = e.target.value;} }
    ></sl-input>
  </div>
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Bio 
      value={ bio } on:input={e => { bio = e.target.value;} }
    ></sl-textarea>
  </div>
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Location 
      value={ location } on:input={e => { location = e.target.value;} }
    ></sl-textarea>
  </div>

  <div style="margin-bottom: 16px">
    <span>Add a pic (optional):</span >
  
      <upload-files
        bind:this={uploadFiles}
        one-file
        accepted-files="image/jpeg,image/png,image/gif,image/svg"
        defaultValue={pic ? encodeHashToBase64(pic) : undefined}
        on:file-uploaded={(e) => {
          pic = e.detail.file.hash;
        }}
      ></upload-files>
  </div>

  {#if proxyAgent}
    <div style="display: flex; flex-direction: row; justify-content:flex-end;">
      <sl-button
        label="Cancel"
        on:click={() => dialog.hide()}
        style="margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
        on:click={() => updateProxyAgent()}
        disabled={!isProxyAgentValid}
        variant=primary>Save</sl-button>
    </div>
  {:else}
  <div style="display: flex; flex-direction: row; justify-content:flex-end;">
    <sl-button
    label="Cancel"
    on:click={() => dialog.hide()}
    style="margin-right: 16px"
    >Cancel</sl-button>
    <sl-button 
    on:click={() => createProxyAgent()}
    disabled={!isProxyAgentValid}
    variant=primary>Create Proxy Agent</sl-button>
    </div>
  {/if}

</sl-dialog>
