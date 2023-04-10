<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import { timeWindowDurationToStr, timeWindowStartToStr,  type UpdateSessionInput, Amenities, type Info, type Session } from './types';
import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
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
let spaceSelect: SlSelect;
let windowSelect: SlSelect;

let selectedSpace: string = ""
let selectedWindow: string = ""

$: title, selectedSpace, selectedWindow, amenities;
$: isSessionValid = title !== '' && ((selectedSpace && selectedWindow) || (!selectedSpace && !selectedWindow));
$: spaces = store.spaces
$: windows = store.timeWindows

onMount(() => {
  if (session) {
    title = session.record.entry.title
    amenities = session.record.entry.amenities
    const slot = store.getSessionSlot(session)
    if (slot) {
      spaceSelect.value = encodeHashToBase64(slot.space)
      windowSelect.value = JSON.stringify(slot.window)
    }
  }
});

async function updateSession() {
  if (session) {
    const updateRecord = await store.updateSession(session.original_hash, title!, amenities)
    if (selectedSpace && selectedWindow) {
      const window = JSON.parse(selectedWindow)
      await store.slot(session.original_hash, decodeHashFromBase64(selectedSpace), window)
    }
    dispatch('session-updated', { actionHash: updateRecord.actionHash });
  }
}

async function createSession() {    
  try {
    const record = await store.createSession(title!, amenities)
    if (selectedSpace && selectedWindow) {
      const window = JSON.parse(selectedWindow)
      await store.slot(record.actionHash, decodeHashFromBase64(selectedSpace), window)
    }

    title = ""
    spaceSelect.value = ""
    windowSelect.value = ""

    dispatch('session-created', { session: record });
  } catch (e) {
    errorSnackbar.labelText = `Error creating the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}

const setAmenity = (i:number, value:boolean) => {
  if (value) {
    amenities |= 1 << i
  } else {
    amenities &= ~(1 << i)
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
    <div style="font-size: 16px">Required Amenities </div>
    {#each Amenities as amenity, i}
      <sl-checkbox 
        bind:this={amenityElems[i]}
        checked={session && (amenities >> i)&1}
        on:sl-change={e => { setAmenity(i, e.target.checked)} }
      >{amenity}</sl-checkbox>
    {/each}
  </div>
  <div style="margin-bottom: 16px">
    <sl-select bind:this={spaceSelect}
      label="Space"
      value={selectedSpace}
      on:sl-change={e => {selectedSpace = e.target.value; } }
    >
    <sl-option value="">No Space Selected</sl-option>
    {#each $spaces as space}
    <sl-option value={encodeHashToBase64(space.record.actionHash)}>{space.record.entry.name}</sl-option>
    {/each}
    </sl-select>
  </div>
  <div style="margin-bottom: 16px">
    <sl-select bind:this={windowSelect}
      label="Time Window"
      on:sl-change={e => {selectedWindow = e.target.value; } }
    >
    <sl-option value="">No Time Window Selected</sl-option>
    {#each $windows as window}
      <sl-option value={JSON.stringify(window)}>{timeWindowStartToStr(window)} {timeWindowDurationToStr(window)}</sl-option>
    {/each}
    </sl-select>
  </div>
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
