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
import { NULL_HASHB64, amenitiesList, timeWindowDurationToStr, timeWindowStartToStr, type Info, type Session, type Slot, type TimeWindow, sessionNotes, sessionTags, SessionInterestBit } from './types';

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
  import { errorText } from './utils';

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
$: settings = store.settings
$: uiProps = store.uiProps

let updateSessionDialog

const sessionSlot = (session: Info<Session>): Slot | undefined => {
  const slottings = session.relations.filter(r=>r.relation.content.path == "session.slot")
  if (slottings.length > 0) {
    const ri = slottings[slottings.length-1]
    const r = ri.relation
    if (r.content.data) {
      const window = JSON.parse(r.content.data) as TimeWindow
      return {
          space: encodeHashToBase64(r.dst)== NULL_HASHB64 ? undefined : r.dst,
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
    errorSnackbar.labelText = `Error deleting the session: ${errorText(e)}`;
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

  <div class="details card">

    <div class="properties">
      <div class="general-info">
        {#if slot}
          <div class="timeslot">{timeWindowStartToStr(slot.window)} for {timeWindowDurationToStr(slot.window)}</div>
        {/if}
        <h3 class="title">{ entry.title }</h3>
        <div class="leaders">
          <span class="hosted-by"><strong>Hosted by </strong></span>
          {#each entry.leaders as leader}
            <div style="margin-right:10px"><AnyAvatar showNickname={true} showAvatar={false} agent={leader}></AnyAvatar></div>
          {/each}
        </div>
        <div class="attenders">
          {#each Array.from($relData.interest.entries()).filter(([key,value])=>value & SessionInterestBit.Going) as [key,value]}
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


    {#if $uiProps.amSteward}
    <div style="display: flex; flex-direction: row; margin-bottom: 16px">
      <span style="margin-right: 4px"><strong>Key:</strong></span>
      <span style="white-space: pre-line">{ entry.key }</span>
    </div>
    {/if}
    <div style="display: flex; flex-direction: row; margin-bottom: 16px">
      <span style="margin-right: 4px"><strong>Type:</strong></span>
      <span style="white-space: pre-line">{ $settings.session_types[entry.session_type].name }</span>
      <div style={`margin-left:5px;width:20px;height:20px;border-radius:50%;background:${$settings.session_types[entry.session_type].color}`}>&nbsp</div>
    </div>
    <!-- <div style="display: flex; flex-direction: row; margin-bottom: 16px">
      <span style="margin-right: 4px"><strong>Smallest Group Size:</strong></span>
      <span style="white-space: pre-line">{ entry.smallest }</span>
    </div> -->
    {#if $uiProps.amSteward}
    <div style="display: flex; flex-direction: row; margin-bottom: 16px">
      <span style="margin-right: 4px"><strong>Required Amenities:</strong></span>
      <span style="white-space: pre-line">
        {amenitiesList(entry.amenities).join(", ")}
      </span>
    </div>
    {/if}
      {#if $settings.session_types[$session.record.entry.session_type].can_rsvp}
        <div class="call-to-action">
          <div class="interest">
            <Fa icon={faUserGroup} /> {$relData.interest.size} attending 
            <!-- <span class="interest-max">/ { entry.largest }</span> -->
          </div>
          <div class="action">
            <InterestSelect sessionHash={sessionHash}></InterestSelect>
          </div>
        </div>
      {/if}
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

  .call-to-action {
    display: flex;
    align-items: center;
    margin-top: 15px;
    justify-content: space-between;
    flex-direction: row;
    padding: 15px;
    box-shadow: 0 5px 5px rgba(86, 94, 109, .25);
    border-radius: 5px;
    border-top: 1px solid #f0f0f0;
    margin-bottom: -14px;
  }
  .general-info {
    width: 100%;
    margin: 0 auto;
  }

  .hosted-by {
    margin-right: 4px;
    position: relative;
    top: 4px;
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
    font-size: 48px;
    text-align: left;
  }
  .leaders {
    position: relative;
    top: -20px;
    opacity: .6;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
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

  .timeslot {
    display: inline-block;
    padding: 5px 10px;
    background: #565E6D;
    text-align: center;
    border-radius: 10px 10px 0 0;
    color: white;
    font-size: 14px;
    box-shadow: inset -20px 0 30px rgba(0, 0, 0, .5);
    position: absolute;
    top: -31px;
    left: 0;
  }
  .tag {
    display: inline;
    border: 1px solid #2F87D840;
    color: #2F87D8;
    background-color: transparent;
    margin-bottom: 0;
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
    padding: 15px;
    border-radius: 0 0 10px 10px;
    box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.15);
    background-color: rgba(247, 247, 248, 1.0);
    z-index: 13;
    border-top: 1px solid rgba(240, 230, 230, 1.0);
    margin-bottom: 20px;
  }
  .notes-list {
    flex:1;
  }
  .details {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    margin-bottom: 16px;
    justify-content: space-between;
    max-width: 720px;
    margin: 30px auto 0 auto;
    padding: 15px;
    position: relative;
    border-radius: 0 10px 0 0;
  }

  :global(.controls) {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .controls sl-button {
    margin-left: 5px;
    box-shadow: 0 15px 25px rgba(0,0,0,.3);
    border-radius: 100%;
  }

  .call-to-action {
    position: sticky;
    top: 0;
  }

  .action {
    padding-bottom: 15px;
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
    width: 100%;
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
