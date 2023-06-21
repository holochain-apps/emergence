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
import { faTrash, faEdit, faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import SpaceCrud from './SpaceCrud.svelte'; 
import type { EmergenceStore } from '../../emergence-store';
import Confirm from './Confirm.svelte';
import Avatar from './Avatar.svelte';
import { encodeHashToBase64,  } from '@holochain/client';
import { slide } from 'svelte/transition';
  import { errorText } from './utils';

const dispatch = createEventDispatcher();

export let space: Info<Space>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;

let editing = false;

let errorSnackbar: Snackbar;
  
$: editing,  error, space;
$: uiProps = store.uiProps

onMount(async () => {
});


async function deleteSpace() {
  try {
    // await store.deleteSpace(space.original_hash)
    await store.updateSpace(space.original_hash, {trashed:true})
    dispatch('space-deleted', { spaceHash: space.original_hash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the space: ${errorText(e)}`;
    errorSnackbar.show();
  }
  dialog.hide()
  store.fetchSpace([space.original_hash])
}

const slottedSessionTitle = (ss: SlottedSession) : string => {
  return `${ss.session.record.entry.title}`
}
const slottedSessionTime = (ss: SlottedSession) : string => {
  return `${timeWindowStartToStr(ss.window)}`
}
const slottedSessionDuration = (ss: SlottedSession) : string => {
  return `${timeWindowDurationToStr(ss.window)}`
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


{#if error}
<span>Error fetching the space: {error.data.data}</span>
{:else}

<div transition:slide={{ axis: 'x', duration: 400 }}  class="SpaceDetail pane-content">
  <div class="pane-header">

    <div class="controls">
      <sl-button on:click={() => { dispatch('space-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      {#if $uiProps.amSteward}
      <div>
        <sl-button on:click={() => { editDialog.open(space) } } circle>
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


  <Confirm 
    bind:this={confirmDialog}
    message="This will remove this space for everyone!" 
    on:confirm-confirmed={deleteSpace}>
  </Confirm>
<div class="space-details">

  {#if space.record.entry.pic}
  <div class="pic">
    <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
    <div class="pic-card">
      <div class="space-symbol">{ space.record.entry.key }</div>
      <div class="space-name">{ space.record.entry.name }</div>
    </div>
  </div>
  {:else}
  <div class="space-card">
    <div class="space-symbol">{ space.record.entry.key }</div>
    <div class="space-name">{ space.record.entry.name }</div>
  </div>
  {/if}

  {#if $uiProps.debuggingEnabled}
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Action Hash:</strong></span>
    <span style="white-space: pre-line">{ encodeHashToBase64(space.record.actionHash) }</span>
  </div>
  {/if}

  <div class="space-description">
    <span style="white-space: pre-line">{ space.record.entry.description }</span>
  </div>

  {#if space.record.entry.stewards.length > 0}
    <span style="margin-right: 4px"><strong>Stewards:</strong></span>
    {#each space.record.entry.stewards as steward}
      <Avatar agentPubKey={steward}></Avatar>
    {/each}
  {/if}

  <div class="space-detail">
    <div class="amenity"><img src="/images/Capacity.svg"> Up to { space.record.entry.capacity }</div>
    {#each amenitiesList(space.record.entry.amenities) as amenity}
      <div class="amenity"><img src="/images/{amenity}.svg"> {amenity}</div>
    {/each}
  </div>

  {#if store && $uiProps.amSteward}


    <div style="display: flex; flex-direction: row; margin-bottom: 16px">
      <span style="margin-right: 4px"><strong>Slot Type:</strong></span>
      <span style="white-space: pre-line">
        {space.record.entry.tags.join(", ")}
      </span>
    </div>
    {/if}
  {#if store.getSlottedSessions(space).length > 0}
    <div class="upcoming-sessions">
      <h3><span>Upcoming sessions</span></h3>
  
      <ul>
        {#each store.getSlottedSessions(space) as session}
        <li class="upcoming-session">
          <span class="session-time">{slottedSessionTime(session)}</span>

          <p>
            <span class="session-title">{slottedSessionTitle(session)}</span>
            <span> - {slottedSessionDuration(session)}</span>
          </p>
        </li>
        {/each}
      </ul>
    </div>
  {/if}
  </div>
  </div>
  {/if}

<style>

  .upcoming-sessions h3 {
    text-align: left;
    padding-bottom: 10px;
    font-size: 12px;
    text-transform: uppercase;
    border-top: 1px dashed rgba(0,0,0,.2);
    margin-top: 20px;
  } 

  .upcoming-sessions h3 span {
    display: inline-block;
    padding: 5px;
    position: relative;
    top: -15px;
    background-color: white;
  }

  .session-time {
    display: block;
    font-size: 14px;
    opacity: .5;
  }

  .session-title {
    font-size: 18px;
    font-weight: bold;
  }

  .upcoming-session {
    display: flex;
    flex-direction: column;
    padding: 15px;
    border-radius: 10px;
    background-color: white;
    box-shadow: 0px 10px 15px rgba(0, 0, 0, 0.15);
    align-items: stretch;
    max-width: 720px;
    margin: 0 auto 10px auto;
  }

  .pic {
   max-width: 100%;
   overflow: hidden;
   border-radius: 10px;
   box-shadow: 0px 15px 15px rgba(0,0,0,.2);
   position: relative;
  }

  .space-details {
    display: flex;
    flex-direction: column;
    max-width: 720px;
    width: 100%;
    margin: 0 auto;
  }

  .space-detail {
    display: block;
    margin-bottom: 16px;
  }

  .pane-header {
    padding-top: 0px;
    padding-bottom: 10px;
    position: sticky;
    top: 0;
  }

  .pane-content {
    padding-top: 10px;
  }

  .pic-card {
    border-radius: 10px;
    box-shadow: 0px 10px 10px rgba(0,0,0,.25);
    background-color: white;
    position: absolute;
    bottom: 20px;
    left: 20px;
    display: flex;
    padding: 15px;
  }

  .space-card {
    border-radius: 10px;
    box-shadow: 0px 5px 10px rgba(0,0,0,.1);
    background-color: white;
    display: flex;
    padding: 15px;
    align-items: center;
  }


  .space-symbol {
    position: relative;
    border: 1px solid rgba(33, 179, 95, .5);
    border-radius: 50%;
    text-align: center;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px #0D5E3340;
    line-height: 30px;
    font-weight: normal;
    cursor: pointer;
    background: linear-gradient(129.46deg, #2F87D8 30%, #00D1FF 90%);
    box-shadow: 0 5px 5px rgba(0,0,0,.15);
    width: 30px;
    height: 30px;
  }

  .space-name {
    padding: 0 20px 0 10px;
    font-size: 18px;
    font-weight: bold;
  }

  .space-description {
    width: 100%;
    max-width: 720px;
    margin: 20px auto;
  }

  .amenity {
    border: 1px solid rgba(123, 66, 217, .2);
    color: rgba(123, 66, 217, 1.0);
    border-radius: 7px;
    padding: 5px;
    margin-right: 5px;
    margin-bottom: 5px;
    padding-top: 0px;
    padding-bottom: 0px;
    font-size: 12px;
    display: inline-flex;
    padding: 3px 8px;
    justify-content: center;
    align-items: center;
    display: inline-block;
    line-height: 24px;
  }

  .amenity img {
    height: 16px;
    margin-right: 3px;
  }

  @media (min-width: 720px) {
    .space-name {
      font-size: 24px;
    }
  }
</style> 