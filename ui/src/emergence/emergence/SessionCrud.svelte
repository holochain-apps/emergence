<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import {  Amenities, setAmenity, type Info, type Session, type Slot, sessionSelfTags, SessionInterestBit, type AnyAgent } from './types';
import SlotSelect from './SlotSelect.svelte';
import { encodeHashToBase64, type AgentPubKey, decodeHashFromBase64 } from '@holochain/client';
import AnyAvatar from './AnyAvatar.svelte';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import MultiSelect from 'svelte-multiselect'

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []
$: uiProps = store.uiProps
const dispatch = createEventDispatcher();

export let session: Info<Session>|undefined = undefined;  // set this if update
export const open = (ses) => {
  if (ses) {
    session = ses
    title = session.record.entry.title
    amenities = session.record.entry.amenities
    description = session.record.entry.description
    leaders = session.record.entry.leaders
    smallest = session.record.entry.smallest
    largest = session.record.entry.largest
    duration = session.record.entry.duration
    tags = sessionSelfTags(session)
    slot = store.getSessionSlot(session)
  } else {
    title = ""
    amenities = 0
    description = ""
    smallest = 2;
    largest = 100;
    duration = 30
    amenities = 0;
    leaders = [{type:"Agent", hash:store.myPubKey}]
    tags = []
    slot = undefined
  }
  console.log("SLOT", slot)
  slotSelect.setSlot(slot)
  dialog.show()
}
let slotSelect
const MAX_GROUP_SIZE = 600

let title: string = '';
let description: string = '';
let smallest: number = 2;
let largest: number = 100;
let duration: number = 60
let amenities: number = 0;
let leaders:Array<AnyAgent> = []
let tags:Array<string> = []

$: proxyAgents = store.proxyAgents
$: proxyAgentOptions = $proxyAgents.map(a=>{return {label: a.record.entry.nickname, value: encodeHashToBase64(a.original_hash)}})
let proxyAgentSelect

let errorSnackbar: Snackbar;

let slot: Slot | undefined
let slotValid: boolean = true

$: title, description, leaders, smallest, largest, duration, amenities, slot, slotValid, tags;
$: isSessionValid = leaders.length > 0 && title !== '' && description !== '' && slotValid && smallest > 0 && largest < MAX_GROUP_SIZE && duration > 0;
$: tagUses = store.allTags
$: allTags = $tagUses.map(t=>t.tag)

onMount(() => {
});


async function updateSession() {
  if (session) {
    const updateRecord = await store.updateSession(session.original_hash, {title, amenities, slot, description, leaders, smallest, largest, duration, tags})
    if (updateRecord) {
      dispatch('session-updated', { actionHash: updateRecord.actionHash });
    }
    dialog.hide()
  }
}

async function createSession() {    
  try {
    const record = await store.createSession(title!, description, leaders, smallest, largest, duration, amenities, slot, tags)

    if (leaders.find(l=>encodeHashToBase64(l.hash) === store.myPubKeyBase64))
      await store.setSessionInterest(record.actionHash, SessionInterestBit.Going )

    title = ""
    description = ""
    smallest = 2;
    largest = 100;
    duration = 60
    amenities = 0
    slot = undefined
    dispatch('session-created', { session: record });
  } catch (e) {
    console.log("CREATE SESSION ERROR", e)
    errorSnackbar.labelText = `Error creating the session: ${e.data.data}`;
    errorSnackbar.show();
  }
  dialog.hide()
}

function addleader(agent: AnyAgent) {
  
  const agentB64 = encodeHashToBase64(agent.hash)
  if (leaders.findIndex(l=>encodeHashToBase64(l.hash)=== agentB64) == -1 ) {
    leaders.push(agent)
    leaders = leaders
  }
}
function deleteLeader(index: number) {
  leaders.splice(index, 1)
  leaders = leaders
}
let dialog
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<sl-dialog
  on:sl-request-close={(event)=>{
    if (event.detail.source === 'overlay') {
      event.preventDefault();    
  }}}
  style="--width: 80vw;" label={session ? "Edit Session" : "Create Session"} bind:this={dialog}>
<div style="display: flex; flex-direction: column">
  {#if session}
    Key: {session.record.entry.key}
  {/if}
  <div style="margin-bottom: 16px">
    <sl-input
    label=Title
    autocomplete="off"
    value={title}
    on:input={e => { title = e.target.value; } }
  ></sl-input>
  </div>
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Description 
      autocomplete="off"
      value={ description } on:input={e => { description = e.target.value;} }
    ></sl-textarea>
  </div>
  <div style="margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Leaders:</strong></span>
    <div style="display:flex;">
      {#each leaders as leader, i}
        <div style="display:flex;margin-right:10px">
          <AnyAvatar agent={leader}></AnyAvatar>
          <sl-button style="margin-left: 8px;" on:click={() => deleteLeader(i)} circle>
            <Fa icon={faTrash} />
          </sl-button>
        </div>      
      {/each}
    </div>
    <div style="margin-bottom: 16px; display:flex; ">
      <search-agent field-label="Add Leader" include-myself={true} clear-on-select={true} on:agent-selected={(e)=>addleader({type:"Agent", hash:e.detail.agentPubKey})}></search-agent>

      {#if $uiProps.amSteward}
          <sl-select
            bind:this={proxyAgentSelect}
            label="Add Proxy Agent"
            on:sl-change={(e) => {
              const hash = decodeHashFromBase64(e.target.value)
              addleader({type:"ProxyAgent", hash})
              proxyAgentSelect.value=""
             } }
          >
          {#each proxyAgentOptions as option}
          <sl-option value={option.value}>{option.label}</sl-option>
          {/each}
          </sl-select>

      {/if}
      </div>  
  </div>
  <div style="margin-bottom: 16px">
    <span>Tags:</span >
    <MultiSelect 
      bind:selected={tags} 
      options={allTags} 
      allowUserOptions={true}
      />
  </div>
  <div style="display:flex">
    <!-- <div style="margin-bottom: 16px; display:flex; flex-direction:column">
      <span>Group Size:</span >
      <div style="display:flex; ">
          <sl-input
          style="width:70px;margin-right:10px"
          maxlength=4
          label="Smallest"
          value={isNaN(smallest)? '' : `${smallest}`}
          on:input={e => { smallest = parseInt(e.target.value); } }
        ></sl-input>
          <sl-input
          style="width:70px"
          maxlength=4
          label="Largest"
          value={isNaN(largest)? '' : `${largest}`}
          on:input={e => { largest = parseInt(e.target.value); } }
        ></sl-input>
      </div>
    </div> -->
    <div style="margin-bottom: 16px;">
      <sl-input
      style="width:120px"
      maxlength=4
      label="Duration (min)"
      value={isNaN(duration)? '' : `${duration}`}
      on:input={e => { duration = parseInt(e.target.value); } }
    ></sl-input>
    </div>
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
  <SlotSelect bind:this={slotSelect} bind:slot={slot} bind:valid={slotValid} sitemap={store.getCurrentSiteMap()}></SlotSelect>
  {#if !slotValid} *You must select both a time and a space or neither {/if}
  {#if session}
    <div style="display: flex; flex-direction: row; justify-content:flex-end;">
      <sl-button
      label="Cancel"
      on:click={() => dialog.hide()}
      style=" margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style=""
      on:click={() => updateSession()}
      disabled={!isSessionValid}
      variant=primary>Save</sl-button>
    </div>
  {:else}
  <div style="display: flex; flex-direction: row; justify-content:flex-end;">
    <sl-button
    label="Cancel"
    on:click={() => {dialog.hide()}}
    style="margin-right: 16px"
    >Cancel</sl-button>

    <sl-button 
    on:click={() => createSession()}
    disabled={!isSessionValid}
    variant=primary>Create Session</sl-button>
  </div>
  {/if}

</div>
</sl-dialog>

<style>
  sl-checkbox {
    margin-right:15px;
  }
</style>
