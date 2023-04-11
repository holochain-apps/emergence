<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import { timeWindowStartToStr, type Slot, timeWindowDurationToStr, Amenities, amenitiesList, type Session, type Info, durationToStr, type Note } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash, faEdit, faPlus, faBackward, faCircleArrowLeft,  } from '@fortawesome/free-solid-svg-icons';

import SessionCrud from './SessionCrud.svelte';
import NoteCrud from './NoteCrud.svelte';
import { encodeHashToBase64 } from '@holochain/client';

const dispatch = createEventDispatcher();

export let session: Info<Session>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;
let error: any = undefined;

let editing = false;
let creatingNote = false;

let errorSnackbar: Snackbar;
let slot:Slot|undefined = undefined
let notes: Array<Info<Note>> = []

$: editing,  error, loading, session, slot, notes;

onMount(async () => {
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionDetail element`);
  }
  slot = store.getSessionSlot(session)
  notes = store.getSessionNotes(session)
});

async function deleteSession() {
  try {
    await store.deleteSession(session.original_hash)
    dispatch('session-deleted', { sessionHash: session.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the session: ${e.data.data}`;
    errorSnackbar.show();
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
<span>Error fetching the session: {error.data.data}</span>
{:else if editing}
<SessionCrud
  session={ session}
  on:session-updated={async () => {
    editing = false;
  //  await fetchSession()
  } }
  on:edit-canceled={() => { editing = false; } }
></SessionCrud>
{:else}

<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row; justify-content:space-around; align-items: center;">
    <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('session-close') } } circle>
      <Fa icon={faCircleArrowLeft} />
    </sl-button>
    <h2 style="margin-left: 10px">{ session.record.entry.title }</h2>

    <span style="flex: 1"></span>
   
    <sl-button style="margin-left: 8px; " size=small on:click={() => { editing = true; } } circle>
      <Fa icon={faEdit} />
    </sl-button>
    <sl-button style="margin-left: 8px;" size=small on:click={() => deleteSession()} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Key:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.key }</span>
  </div>



  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Description:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.description }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Leaders:</strong></span>
    {#each session.record.entry.leaders as leader}
    <div style="margin:0 10px 0 10px; border:solid 1px; border-radius:50%; width:40px; height:40px;     display: flex;
      justify-content: center;
      flex-direction: column;
      ">{encodeHashToBase64(leader).slice(-5)}</div>
      {/each}
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Smallest Group Size:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.smallest }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Largest Group Size:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.largest }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Duration:</strong></span>
    <span style="white-space: pre-line">{ durationToStr(session.record.entry.duration) }</span>
  </div>
  
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Required Amenities:</strong></span>
    <span style="white-space: pre-line">
      {amenitiesList(session.record.entry.amenities).join(", ")}
    </span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    {#if slot}
    Scheduled in {store.getSpace(slot.space) ? store.getSpace(slot.space).record.entry.name : "Unknown"} on {timeWindowStartToStr(slot.window)} for {timeWindowDurationToStr(slot.window)}
    {/if}
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Notes:</strong></span>
    {#each notes as note}
      <div style="border: solid, 1px">{note.record.entry.text}</div>
    {/each}
  </div>
    Create Note:  <sl-button on:click={() => {creatingNote = true; } } circle>
    <Fa icon={faPlus} />
  </sl-button>
  {#if creatingNote}
  <div class="create">
    <NoteCrud sessionHash={session.original_hash}
      on:note-created={() => {creatingNote = false;} }
      on:edit-canceled={() => { creatingNote = false; } }
    ></NoteCrud>
    </div>
  {/if}

</div>
{/if}

