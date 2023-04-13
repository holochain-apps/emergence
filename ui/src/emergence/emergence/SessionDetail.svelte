<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import { timeWindowStartToStr, type Slot, timeWindowDurationToStr, Amenities, amenitiesList, type Session, type Info, durationToStr, type Note, type TimeWindow, SessionInterest } from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import Fa from 'svelte-fa'
import { faTrash, faEdit, faPlus, faCircleArrowLeft, faBookmark, faStar } from '@fortawesome/free-solid-svg-icons';

import SessionCrud from './SessionCrud.svelte';
import NoteCrud from './NoteCrud.svelte';
import { encodeHashToBase64, type ActionHash } from '@holochain/client';
import NoteDetail from './NoteDetail.svelte';

const dispatch = createEventDispatcher();

export let sessionHash: ActionHash;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;
let error: any = undefined;

let editing = false;
let creatingNote = false;

let errorSnackbar: Snackbar;

$: session = store.sessionStore(sessionHash)
$: entry = $session.record.entry
$: slot = sessionSlot($session)
$: notes = sessionNotes($session)


const sessionSlot = (session: Info<Session>): Slot | undefined => {
  const spaces = session.relations.filter(r=>r.content.path == "session.space")
        if (spaces.length > 0) {
          let r = spaces[spaces.length-1]
          const window = JSON.parse(r.content.data) as TimeWindow
                  return {
                      space: r.dst,
                      window
                  }
        }
        return undefined
}

const sessionNotes = (session: Info<Session>):Array<ActionHash> => {
  return session.relations.filter(r=>r.content.path == "session.note").map(r=> r.dst)
}


// $: sessions = store.sessions
// $: session = derived(sessions, $sessions => $sessions.find(s=>encodeHashToBase64(sessionHash) == encodeHashToBase64(s.original_hash)))
// $: entry = derived(session, $session => $session.record.entry)
// $: relations = derived(session, $session => $session.relations)
// $: slot = derived(relations, $relations=> {
//   const r = $relations.find(r=>r.content.path == "session.space")
//   if (r) {
//     const window = JSON.parse(r.content.data) as TimeWindow
//             return {
//                 space: r.dst,
//                 window
//             }
//   }
//   return undefined
// })
// $: notes = derived(relations, $relations=> 
//   $relations.filter(r=>r.content.path == "session.note").map(r=> {
//     const note = store.getNote(r.dst)
//     if (note) return note
//     return undefined
//   }))

$: editing,  error, loading, slot, notes;
$: myInterest = store.sessionInterestStore(session)

const interestIcon = (interest) => {
  switch (interest) {
    case SessionInterest.NoOpinion: return faBookmark
    case SessionInterest.Going: return faStar
    case SessionInterest.Interested: return faBookmark
  }
}

onMount(async () => {
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionDetail element`);
  }
});

async function attendSession() {
  try {
    await store.setSessionInterest($session.original_hash, $myInterest == SessionInterest.NoOpinion ? SessionInterest.Going : SessionInterest.NoOpinion )
  } catch (e: any) {
    console.log("E", e)

    errorSnackbar.labelText = `Error attending the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}

async function deleteSession() {
  try {
    await store.deleteSession($session.original_hash)
    dispatch('session-deleted', { sessionHash: $session.original_hash });
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
  session={ $session}
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
    <h2 style="margin-left: 10px">{ entry.title }</h2>

    <span style="flex: 1"></span>
    <sl-button style="margin-left: 8px; " size=small on:click={attendSession} circle>
      <Fa icon={interestIcon($myInterest)} />
    </sl-button>

    <sl-button style="margin-left: 8px; " size=small on:click={() => { editing = true; } } circle>
      <Fa icon={faEdit} />
    </sl-button>

    <sl-button style="margin-left: 8px;" size=small on:click={deleteSession} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Key:</strong></span>
    <span style="white-space: pre-line">{ entry.key }</span>
  </div>



  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Description:</strong></span>
    <span style="white-space: pre-line">{ entry.description }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Leaders:</strong></span>
    {#each entry.leaders as leader}
    <div style="margin:0 10px 0 10px; border:solid 1px; border-radius:50%; width:40px; height:40px;     display: flex;
      justify-content: center;
      flex-direction: column;
      ">{encodeHashToBase64(leader).slice(-5)}</div>
      {/each}
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Smallest Group Size:</strong></span>
    <span style="white-space: pre-line">{ entry.smallest }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Largest Group Size:</strong></span>
    <span style="white-space: pre-line">{ entry.largest }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Duration:</strong></span>
    <span style="white-space: pre-line">{ durationToStr(entry.duration) }</span>
  </div>
  
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Required Amenities:</strong></span>
    <span style="white-space: pre-line">
      {amenitiesList(entry.amenities).join(", ")}
    </span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    {#if slot}
    Scheduled in {store.getSpace(slot.space) ? store.getSpace(slot.space).record.entry.name : "Unknown"} on {timeWindowStartToStr(slot.window)} for {timeWindowDurationToStr(slot.window)}
    {/if}
  </div>
  <div class="notes">
    {#each notes as note}
      <div class="note">
        <NoteDetail noteHash={note}></NoteDetail>
      </div>
    {/each}
  </div>
    Create Note:  <sl-button on:click={() => {creatingNote = true; } } circle>
    <Fa icon={faPlus} />
  </sl-button>

  {#if creatingNote}
  <div class="create">
    <NoteCrud sessionHash={$session.original_hash}
      on:note-created={() => {creatingNote = false;} }
      on:edit-canceled={() => { creatingNote = false; } }
    ></NoteCrud>
    </div>
  {/if}

</div>
{/if}

<style>
  .notes{
    border-top: solid 1px;
  }

  .note{
    display: flex;
    align-items: center;
    margin: 10px;
  }
</style>