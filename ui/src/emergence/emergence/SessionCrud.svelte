<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import "@holochain-open-dev/profiles/dist/elements/search-agent.js";

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import {  Amenities, setAmenity, type Info, type Session, type Slot } from './types';
import SlotSelect from './Slot.svelte';
import { encodeHashToBase64, type AgentPubKey } from '@holochain/client';
import Avatar from './Avatar.svelte';
  import { faTrash } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();

export let session: Info<Session>|undefined = undefined;  // set this if update

const MAX_GROUP_SIZE = 600

let title: string = '';
let description: string = '';
let smallest: number = 2;
let largest: number = 100;
let duration: number = 30
let amenities: number = 0;
let leaders:Array<AgentPubKey> = []

let errorSnackbar: Snackbar;

let slot: Slot | undefined
let slotValid: boolean = true

$: title, description, leaders, smallest, largest, duration, amenities, slot, slotValid;
$: isSessionValid = title !== '' && description !== '' && slotValid && smallest > 0 && largest < MAX_GROUP_SIZE && duration > 0;

onMount(() => {
  if (session) {
    title = session.record.entry.title
    amenities = session.record.entry.amenities
    description = session.record.entry.description
    leaders = session.record.entry.leaders
    smallest = session.record.entry.smallest
    largest = session.record.entry.largest
    duration = session.record.entry.duration

    slot = store.getSessionSlot(session)
  } else {
    leaders = []
  }
});

async function updateSession() {
  if (session) {
    const updateRecord = await store.updateSession(session.original_hash, {title, amenities, slot, description, leaders, smallest, largest, duration})
    if (updateRecord) {
      dispatch('session-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createSession() {    
  try {
    const record = await store.createSession(title!, description, leaders, smallest, largest, duration, amenities, slot)

    title = ""
    description = ""
    smallest = 2;
    largest = 100;
    duration = 30
    amenities = 0
    slot = undefined
    dispatch('session-created', { session: record });
  } catch (e) {
    console.log("CREATE SESSION ERROR", e)
    errorSnackbar.labelText = `Error creating the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}

function addleader(agent: AgentPubKey) {
  const agentB64 = encodeHashToBase64(agent)
  if (leaders.findIndex(l=>encodeHashToBase64(l)=== agentB64) == -1 ) {
    leaders.push(agent)
    leaders = leaders
  }
}
function deleteLeader(index: number) {
  leaders.splice(index, 1)
  leaders = leaders
}
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

<div style="display: flex; flex-direction: column">
  {#if session}
    <span style="font-size: 18px">Edit Session</span>
    Key: {session.record.entry.key}
  {:else}
    <span style="font-size: 18px">Create Session</span>
  {/if}
  <div style="margin-bottom: 16px">
    <sl-input
    label=Title
    value={title}
    on:input={e => { title = e.target.value; } }
  ></sl-input>
  </div>
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Description 
      value={ description } on:input={e => { description = e.target.value;} }
    ></sl-textarea>
  </div>
  <div style="margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Leaders:</strong></span>
    {#each leaders as leader, i}
    <div style="display:flex;">
      <Avatar agentPubKey={leader}></Avatar>
      <sl-button style="margin-left: 8px;" size=small on:click={() => deleteLeader(i)} circle>
        <Fa icon={faTrash} />
      </sl-button>

    </div>
      
    {/each}

    <search-agent field-label="Add Leader" include-myself={true} clear-on-select={true} on:agent-selected={(e)=>addleader(e.detail.agentPubKey)}></search-agent>
  </div>
  <div style="margin-bottom: 16px">
    <sl-input
    label="Smallest Group-Size"
    value={`${smallest}`}
    on:input={e => { smallest = parseInt(e.target.value); } }
  ></sl-input>
  </div>
  <div style="margin-bottom: 16px">
    <sl-input
    label="Largest Group-Size"
    value={`${largest}`}
    on:input={e => { largest = parseInt(e.target.value); } }
  ></sl-input>
  </div>
  <div style="margin-bottom: 16px">
    <sl-input
    label="Duration (min)"
    value={`${duration}`}
    on:input={e => { duration = parseInt(e.target.value); } }
  ></sl-input>
  </div>

  <div style="margin-bottom: 16px">
    <div style="font-size: 16px" on:click={()=>amenities = 0}>Required Amenities </div>
    {#each Amenities as amenity, i}
      <sl-checkbox 
        bind:this={amenityElems[i]}
        checked={(amenities >> i)&1}
        on:sl-change={e => { amenities = setAmenity(amenities, i, e.target.checked)} }
      >{amenity}</sl-checkbox>
    {/each}
  </div>
  <SlotSelect bind:slot={slot} bind:valid={slotValid}></SlotSelect>
  {#if !slotValid} *You must select both a time and a space or neither {/if}
  {#if session}
    <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => dispatch('edit-canceled')}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => updateSession()}
      disabled={!isSessionValid}
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
    on:click={() => createSession()}
    disabled={!isSessionValid}
    variant=primary>Create Session</sl-button>
  </div>
  {/if}

</div>
