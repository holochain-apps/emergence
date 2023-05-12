<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

import { storeContext } from '../../contexts';
import { amenitiesList, timeWindowDurationToStr, type Info, type Space, timeWindowStartToStr, type SlottedSession } from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import SpaceCrud from './SpaceCrud.svelte'; 
import type { EmergenceStore } from '../../emergence-store';
import Confirm from './Confirm.svelte';
import Avatar from './Avatar.svelte';
import { encodeHashToBase64,  } from '@holochain/client';

const dispatch = createEventDispatcher();

export let space: Info<Space>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

let editing = false;

let errorSnackbar: Snackbar;
  
$: editing,  error, loading, space;
$: amSteward = store.amSteward
$: debuggingEnabled = store.debuggingEnabled

onMount(async () => {
});

export const open = (spc) => {
  space = spc
  loading = false
  dialog.show()
}

async function deleteSpace() {
  try {
    // await store.deleteSpace(space.original_hash)
    await store.updateSpace(space.original_hash, {trashed:true})
    dispatch('space-deleted', { spaceHash: space.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the space: ${e.data.data}`;
    errorSnackbar.show();
  }
  dialog.hide()
  store.fetchSpaces()
}

const slottedSessionSummary = (ss: SlottedSession) : string => {
  return `${ss.session.record.entry.title} ${timeWindowStartToStr(ss.window)} for ${timeWindowDurationToStr(ss.window)}`
}
let dialog
let editDialog
let confirmDialog
</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<SpaceCrud
  bind:this={editDialog}
  space={ space }
  on:space-updated={async () => {
  } }
></SpaceCrud>

<sl-dialog label={space? space.record.entry.name : ""} bind:this={dialog} class="dialog-header-actions">
  {#if $amSteward}
  <sl-button style="margin-top:12px" slot="header-actions" on:click={() => confirmDialog.open()} circle ><Fa icon={faTrash} ></Fa></sl-button>
  <sl-button style="margin-top:12px" slot="header-actions" on:click={() => {dialog.hide();editDialog.open(space)}} circle ><Fa icon={faEdit} ></Fa></sl-button>
  {/if}
  
{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the space: {error.data.data}</span>
{:else}
  <Confirm 
    bind:this={confirmDialog}
    message="This will remove this space for everyone!" 
    on:confirm-confirmed={deleteSpace}>
  </Confirm>
<div style="display: flex; flex-direction: column">
  {#if $debuggingEnabled}
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Action Hash:</strong></span>
    <span style="white-space: pre-line">{ encodeHashToBase64(space.record.actionHash) }</span>
  </div>
{/if}
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Map Symbol:</strong></span>
    <span style="white-space: pre-line">{ space.record.entry.key }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Name:</strong></span>
    <span style="white-space: pre-line">{ space.record.entry.name }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Description:</strong></span>
    <span style="white-space: pre-line">{ space.record.entry.description }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Stewards:</strong></span>
    {#each space.record.entry.stewards as steward}
      <Avatar agentPubKey={steward}></Avatar>
    {/each}
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Capacity:</strong></span>
    <span style="white-space: pre-line">{ space.record.entry.capacity }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Available Amenities:</strong></span>
    <span style="white-space: pre-line">
      {amenitiesList(space.record.entry.amenities).join(", ")}
    </span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Tags:</strong></span>
    <span style="white-space: pre-line">
      {space.record.entry.tags.join(", ")}
    </span>
  </div>


  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Picture</strong></span>

    {#if space.record.entry.pic}
    <div class="pic">
    <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
    </div>
    {/if}
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Scheduled Sessions:</strong></span>

    <ul>
      {#each store.getSlottedSessions(space) as session}
        <li>{slottedSessionSummary(session)}</li>
      {/each}
    </ul>
  </div>

</div>
{/if}
</sl-dialog>

<style>
  .pic {
   max-width: 300px;
  }
</style> 