<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import {  Amenities, setAmenity, type Info, type Session, type Slot } from './types';
import SlotSelect from './Slot.svelte';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();

export let session: Info<Session>|undefined = undefined;  // set this if update

let title: string = '';
let smallest: number = 2;
let largest: number = 100;
let duration: string = ""
let amenities: number = 0;

let errorSnackbar: Snackbar;

let slot: Slot | undefined
let slotValid: boolean = true

$: title, amenities, slot, slotValid;
$: isSessionValid = title !== '' && slotValid;

onMount(() => {
  if (session) {
    title = session.record.entry.title
    amenities = session.record.entry.amenities
    slot = store.getSessionSlot(session)
  }
});

async function updateSession() {
  if (session) {
    const updateRecord = await store.updateSession(session.original_hash, {title, amenities, slot})
    if (updateRecord) {
      dispatch('session-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createSession() {    
  try {
    const record = await store.createSession(title!, amenities, slot)

    title = ""
    amenities = 0
    slot = undefined
    dispatch('session-created', { session: record });
  } catch (e) {
    console.log("CREATE SESSION ERROR", e)
    errorSnackbar.labelText = `Error creating the session: ${e.data.data}`;
    errorSnackbar.show();
  }
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
    <sl-button 
    on:click={() => createSession()}
    disabled={!isSessionValid}
    variant=primary>Create Session</sl-button>
  {/if}

</div>
