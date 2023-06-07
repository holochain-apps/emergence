<script lang="ts">
import { faCircleArrowLeft, faEdit, faTrash, faUserGroup } from '@fortawesome/free-solid-svg-icons';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { createEventDispatcher, getContext, onMount } from 'svelte';
import Fa from 'svelte-fa';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import { amenitiesList, durationToStr, timeWindowDurationToStr, timeWindowStartToStr, type Info, type Session, type Slot, type TimeWindow, sessionNotes, sessionTags, SessionInterestBit } from './types';

import { encodeHashToBase64, type ActionHash } from '@holochain/client';
import Avatar from './Avatar.svelte';
import AnyAvatar from './AnyAvatar.svelte';
import Confirm from './Confirm.svelte';
import InterestSelect from './InterestSelect.svelte';
import NoteCrud from './NoteCrud.svelte';
import NoteDetail from './NoteDetail.svelte';
import SessionCrud from './SessionCrud.svelte';
import { slide } from 'svelte/transition';
import SpaceLink from './SpaceLink.svelte';
import { Marked } from "@ts-stack/markdown";

const dispatch = createEventDispatcher();

export let sessionHash: ActionHash;
export let opened = false

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;
let error: any = undefined;

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
          if (r.content.data) {
            const window = JSON.parse(r.content.data) as TimeWindow
            return {
                space: r.dst,
                window
            }
          }
        }
        return undefined
}

$: error, loading, slot, notes, session;
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

<div transition:slide={{ axis: 'x', duration: 400 }}  class="pane-content">
  <div class="pane-header">

    <div class="controls">
      <sl-button on:click={() => { dispatch('session-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      {#if $uiProps.amSteward || $session.record.entry.leaders.find(l=>encodeHashToBase64(l.hash)==store.myPubKeyBase64)}
        <div>
          <sl-button on:click={() => { updateSessionDialog.open($session) } } circle>
            <Fa icon={faEdit} />
          </sl-button>
          <sl-button on:click={()=>confirmDialog.open()} circle>
            <Fa icon={faTrash} />
          </sl-button>
        </div>
      {/if}
    </div>
    <span style="flex: 1"></span>
 
  </div>
 
  <Confirm bind:this={confirmDialog}
    message="This will remove this session for everyone!" on:confirm-confirmed={deleteSession}></Confirm>

  <div class="details">

    <div class="properties">
      <div class="general-info">
        <h3 class="title">{ entry.title }</h3>
        <div class="leaders">
          <span style="margin-right: 4px"><strong>Hosted by </strong></span>
          {#each entry.leaders as leader}
            <div style="margin-right:10px"><AnyAvatar agent={leader}></AnyAvatar></div>
          {/each}
        </div>
        <div class="description"> {@html Marked.parse(entry.description) }</div>
        <div class="tags">
          {#each tags as tag}
            <div class="tag clickable-tag"
              on:click={()=>{
                store.setUIprops({discoverPanel:`tags#${tag}`})
                store.setPane("discover")
              }}
            >
              #{tag}
            </div>
          {/each}
        </div>
      </div>

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

      <!-- <div style="display: flex; flex-direction: row; margin-bottom: 16px">
        <span style="margin-right: 4px"><strong>Smallest Group Size:</strong></span>
        <span style="white-space: pre-line">{ entry.smallest }</span>
      </div> -->
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
        Scheduled in <SpaceLink spaceHash={slot.space}></SpaceLink> on {timeWindowStartToStr(slot.window)} for {timeWindowDurationToStr(slot.window)}
        {/if}
      </div>
    </div>

    <div class="stats">
      <div class="action">
        <InterestSelect sessionHash={sessionHash}></InterestSelect>
      </div>
  
      <div class="interest">
          <Fa icon={faUserGroup} /> {$relData.interest.size} 
          <!-- <span class="interest-max">/ { entry.largest }</span> -->
      </div>
      <div class="attenders">
          {#each Array.from($relData.interest.entries()).filter(([key,value])=>value & SessionInterestBit.Going) as [key,value]}
        {/each}
      </div>
    </div>
  
  </div>
  <div class="notes">
    <div class="notes-add">
      <NoteCrud
        modal={false}
        bind:this={createNoteDialog}
        sessionHash={$session.original_hash}
        on:note-created={() => {creatingNote = false;} }
        on:edit-canceled={() => { creatingNote = false; } }
      ></NoteCrud>
    </div>
    <div class="notes-list">
      {#each notes.reverse() as note}
        <NoteDetail showFrame={true} showSession={false} noteHash={note}></NoteDetail>
      {/each}
    </div>
  </div>

</div>
{/if}

<style>
  .general-info {
    width: 100%;
    margin: 0 auto;
    padding-bottom: 30px;
  }
  .event-image {
    height: 300px;
    width: 100%;
    background-image: url(images/default-image.png);
    background-size: cover;
    max-width: 720px;
    margin: 0 auto;
    border-radius: 10px;
    margin-bottom: 15px;
  }
  .title {
    font-size: 36px;
    text-align: left;
  }
  .leaders {
    font-size: 12px;
    display: inline-flex;
  }

  .leaders holo-identicon {
    display: none;
  }
  .description {
    padding-bottom: 8px;
  }
  .tags {
    display: block;
    padding-top: 8px;
  }

  .tag {
    display: inline;
  }
  .notes {
    display:flex;
    flex-direction: column;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
  }
  .notes-add {
    background-color: lightgray;
    padding: 10px;
    border-radius: 10px;
  }
  .notes-list {
    flex:1;
    overflow-y: scroll;
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

  :global(.controls) {
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

  .interest-max {
    opacity: .5;
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

  .clickable-tag {
    cursor: pointer;
  }
  .clickable-tag:hover {
    border: 1px solid #25bab054;
    color: #25BAB1;
    background-color: rgb(240, 249, 2244);
  }

</style>
