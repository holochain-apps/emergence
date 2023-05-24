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

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import { encodeHashToBase64, type EntryHash } from '@holochain/client';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();
export let proxyAgent: Info<ProxyAgent>|undefined = undefined;  // set this if update

let nickname: string = '';
let bio: string = '';
let location: string = '';
let pic: EntryHash | undefined = undefined;

let errorSnackbar: Snackbar;

$: nickname, bio, location
$: isProxyAgentValid = nickname !== ""

onMount(() => {
  store.fetchTags()
  if (proxyAgent) {
    nickname = proxyAgent.record.entry.nickname
    bio = proxyAgent.record.entry.bio
    location = proxyAgent.record.entry.location
    pic = proxyAgent.record.entry.pic
  }
});

async function updateProxyAgent() {
  if (proxyAgent) {
    const updateRecord = await store.updateProxyAgent(proxyAgent.original_hash, nickname, bio, location, pic)
    if (updateRecord) {
      dispatch('proxyagent-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createProxyAgent() {  
  try {
    const record = await store.createProxyAgent(nickname, bio, location, pic)
    console.log("DOG", record)
    nickname = ""
    bio = ""
    location = ""
    pic = undefined

    dispatch('proxyagent-created', { proxyAgent: record });
  } catch (e) {
    console.log("CREATE PROXYAGENT ERROR", e)
    errorSnackbar.labelText = `Error creating the proxyAgent: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column; z-index:2;">
  {#if proxyAgent}
    <span style="font-size: 18px">Edit ProxyAgent</span>
  {:else}
    <span style="font-size: 18px">Create ProxyAgent</span>
  {/if}
              
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
        one-file
        accepted-files="image/jpeg,image/png,image/gif"
        defaultValue={pic ? encodeHashToBase64(pic) : undefined}
        on:file-uploaded={(e) => {
          pic = e.detail.file.hash;
        }}
      ></upload-files>
  </div>

  {#if proxyAgent}
    <div style="display: flex; flex-direction: row">
      <sl-button
        label="Cancel"
        on:click={() => dispatch('edit-canceled')}
        style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
        style="flex: 1;"
        on:click={() => updateProxyAgent()}
        disabled={!isProxyAgentValid}
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
    on:click={() => createProxyAgent()}
    disabled={!isProxyAgentValid}
    variant=primary>Create ProxyAgent</sl-button>
    </div>
  {/if}

</div>
