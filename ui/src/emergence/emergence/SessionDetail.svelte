<script lang="ts">
import { faCircleArrowLeft, faEdit, faPlus, faTrash, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { createEventDispatcher, getContext, onMount } from 'svelte';
import Fa from 'svelte-fa';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import { SessionInterest, amenitiesList, durationToStr, timeWindowDurationToStr, timeWindowStartToStr, type Info, type Session, type Slot, type TimeWindow, sessionNotes, sessionTags } from './types';

import { encodeHashToBase64, type ActionHash } from '@holochain/client';
import Avatar from './Avatar.svelte';
import Confirm from './Confirm.svelte';
import InterestSelect from './InterestSelect.svelte';
import NoteCrud from './NoteCrud.svelte';
import NoteDetail from './NoteDetail.svelte';
import SessionCrud from './SessionCrud.svelte';
//
const dispatch = createEventDispatcher();

export let sessionHash: ActionHash;
export let opened = false

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
$: tags = sessionTags($session)

$: uiProps = store.uiProps

let updateSessionDialog

const sessionSlot = (session: Info<Session>): Slot | undefined => {
  const spaces = session.relations.filter(r=>r.relation.content.path == "session.space")
        if (spaces.length > 0) {
          const ri = spaces[spaces.length-1]
          const r = ri.relation
          const window = JSON.parse(r.content.data) as TimeWindow
                  return {
                      space: r.dst,
                      window
                  }
        }
        return undefined
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

$: editing,  error, loading, slot, notes, session;
$: relData = store.sessionReleationDataStore(session)

onMount(async () => {
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionDetail element`);
  }
  if (opened) {
    open()
  }
});

async function deleteSession() {
  try {
    //await store.deleteSession($session.original_hash)
    const updateRecord = await store.updateSession($session.original_hash, {trashed: true})

    dispatch('session-deleted', { sessionHash: $session.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}
let createNoteDialog
let confirmDialog

</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the session: {error.data.data}</span>
{:else}

<SessionCrud
bind:this={updateSessionDialog}
  session={ $session}
  on:session-updated={async () => {
    await store.fetchSessions()
  } }
></SessionCrud>

<div class="pane-content">
  <div class="pane-header">

    <div class="controls">
      <sl-button size=small on:click={() => { dispatch('session-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      <div>
        <sl-button size=small on:click={() => { updateSessionDialog.open($session) } } circle>
          <Fa icon={faEdit} />
        </sl-button>
        <sl-button size=small on:click={()=>confirmDialog.open()} circle>
          <Fa icon={faTrash} />
        </sl-button>
      </div>
    </div>

    <h2 style="margin-left: 10px">{ entry.title }</h2>

    <span style="flex: 1"></span>

    <div class="action">
      <InterestSelect sessionHash={sessionHash}></InterestSelect>
    </div>

  </div>

  <Confirm bind:this={confirmDialog}
    message="This will remove this session for everyone!" on:confirm-confirmed={deleteSession}></Confirm>

  <div class="details">

    <div class="properties">

      {#if $uiProps.debuggingEnabled}
        <div style="display: flex; flex-direction: row; margin-bottom: 16px">
          <span style="margin-right: 4px"><strong>Original Hash:</strong></span>
          <span style="white-space: pre-line">{ encodeHashToBase64($session.original_hash) }</span>
        </div>
        <div style="display: flex; flex-direction: row; margin-bottom: 16px">
            <span style="margin-right: 4px"><strong>Action Hash:</strong></span>
          <span style="white-space: pre-line">{ encodeHashToBase64($session.record.actionHash) }</span>
        </div>
      {/if}


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
          <Avatar agentPubKey={leader}></Avatar>
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
    </div>

    <div class="stats">
      <div>
        Total Interested: <Fa icon={faUserGroup} /> {$relData.interest.size} 
      </div>
      <div>
        Attenders: {#each Array.from($relData.interest.entries()).filter(([key,value])=>value==SessionInterest.Going) as [key,value]}
          <Avatar agentPubKey={key}></Avatar>
        {/each}
      </div>
      <div class="tags">
        Tags: 
        {#each tags as tag}
          <div class="tag">
            {tag}
          </div>
        {/each}
      </div>
    </div>
  
  </div>
  <div class="notes">
    <div>
      <NoteCrud
        modal={false}
        bind:this={createNoteDialog}
        sessionHash={$session.original_hash}
        on:note-created={() => {creatingNote = false;} }
        on:edit-canceled={() => { creatingNote = false; } }
      ></NoteCrud>
    </div>
      {#each notes.reverse() as note}
        <NoteDetail showFrame={true} showSession={false} noteHash={note}></NoteDetail>
    {/each}
  </div>

</div>
{/if}

<style>
  .notes{
    border-top: solid 1px;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
  }
  .details {
    display: flex;
    flex-direction: row; 
    align-items: flex-start;
    margin-bottom: 16px;
    justify-content: space-between;
    max-width: 720px;
    margin: 0 auto;
  }

  .controls {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .controls div sl-button {
    margin-left: 5px;
  }

  .action {
    padding-bottom: 15px;
    position: sticky;
    top: 0;
  }

  .pane-header h2 {
    font-size: 24px;
    line-height: 30px;
    margin: 40px 0 20px 0;
    letter-spacing: -0.01rem;
  }

  .properties {
    display: flex;
    flex-direction: column; 
    margin-bottom: 16px;
  }
  .stats {
    display: flex;
    flex-direction: column; 
    align-items: center;
    margin-bottom: 16px;
  }

  .note{
    display: flex;
    align-items: center;
    margin: 10px;
    background-color: aqua;
  }
</style>
