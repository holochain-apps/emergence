<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import { storeContext } from '../../contexts';
import { amenitiesList, timeWindowDurationToStr, type Info, type Relation, type Space, timeWindowStartToStr } from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import SpaceCrud from './SpaceCrud.svelte'; 
import type { EmergenceStore } from '../../emergence-store';
import Confirm from './Confirm.svelte';
  import Avatar from './Avatar.svelte';
  import { encodeHashToBase64 } from '@holochain/client';

const dispatch = createEventDispatcher();

export let space: Info<Space>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

let editing = false;
let showConfirm = false

let errorSnackbar: Snackbar;
  
$: editing,  error, loading, space, showConfirm;

onMount(async () => {
  if (space === undefined) {
    throw new Error(`The space input is required for the SpaceDetail element`);
  }
  loading=false
});

async function deleteSpace() {
  try {
    // await store.deleteSpace(space.original_hash)
    await store.updateSpace(space.original_hash, {trashed:true})
    dispatch('space-deleted', { spaceHash: space.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the space: ${e.data.data}`;
    errorSnackbar.show();
  }
}

const relationSummary = (relation: Relation) : string => {
  switch (relation.content.path) {
    case "space.sessions":
      const session = store.getSession(relation.dst)
      if (session) {
        const slot = store.getSessionSlot(session)
        return `${session.record.entry.title} ${timeWindowStartToStr(slot.window)} for ${timeWindowDurationToStr(slot.window)}`
      }
      return "unknown session"
    default: {
      return JSON.stringify(relation.content)
    }
  }
}
</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the space: {error.data.data}</span>
{:else if editing}
<SpaceCrud
  space={ space }
  on:space-updated={async () => {
    editing = false;
//    await fetchSpace()
  } }
  on:edit-canceled={() => { editing = false; } }
></SpaceCrud>
{:else}
{#if showConfirm}
<div class="modal">
  <Confirm message="This will remove this space for everyone!" 
    on:confirm-canceled={()=>showConfirm=false} 
    on:confirm-confirmed={deleteSpace}></Confirm>
</div>
{/if}

<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row">
    <span style="flex: 1"></span>
    <sl-button style="margin-left: 8px; " size=small on:click={() => { editing = true; } } circle>
      <Fa icon={faEdit} />
    </sl-button>
    <sl-button style="margin-left: 8px;" size=small on:click={() => showConfirm=true} circle>
      <Fa icon={faTrash} />
    </sl-button>
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
    <span style="margin-right: 4px"><strong>Picture</strong></span>

    {#if space.record.entry.pic}
    <div class="pic">
    <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
    </div>
    {/if}
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Secheduled Sessions:</strong></span>

    <ul>
      {#each space.relations as relation}
        <li>{relationSummary(relation)}</li>
      {/each}
    </ul>
  </div>

</div>
{/if}

<style>
  .pic {
   max-width: 300px;
  }
</style> 