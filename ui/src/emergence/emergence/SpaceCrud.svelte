<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, ActionHash, DnaHash } from '@holochain/client';
import { storeContext } from '../../contexts';
import { Amenities, type Info, type Space, setAmenity } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();
export let space: Info<Space>|undefined = undefined;  // set this if update

let name: string = '';
let description: string = '';
let amenities: number = 0;
let capacity: number = 0;

let errorSnackbar: Snackbar;

$: name, description, amenities;
$: isSpaceValid = true && name !== '' && description !== '' && capacity > 0;

onMount(() => {
  if (space) {
    name = space.record.entry.name
    amenities = space.record.entry.amenities
    description = space.record.entry.description
    capacity = space.record.entry.capacity
  }
});

async function updateSpace() {
  if (space) {
    const updateRecord = await store.updateSpace(space.original_hash, name!, description, capacity, amenities)
    if (updateRecord) {
      dispatch('space-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createSpace() {  
  try {
    const record = await store.createSpace(name, description, capacity, amenities)

    name = ""
    description = ""
    amenities = 0
    capacity = 0
    dispatch('space-created', { space: record });
  } catch (e) {
    console.log("CREATE SPACE ERROR", e)
    errorSnackbar.labelText = `Error creating the space: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  {#if space}
    <span style="font-size: 18px">Edit Space</span>
  {:else}
    <span style="font-size: 18px">Create Space</span>
  {/if}
  

  <div style="margin-bottom: 16px">
    <sl-input
    label=Name
    value={name}
    on:input={e => { name = e.target.value; } }
  ></sl-input>
  </div>
            
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Description 
      value={ description } on:input={e => { description = e.target.value;} }
    ></sl-textarea>
  </div>

  <div style="margin-bottom: 16px">
    <sl-input
    label="Capacity"
    value={`${capacity}`}
    on:input={e => { capacity = parseInt(e.target.value); } }
    ></sl-input>
  </div>

  <div style="margin-bottom: 16px">
    <div style="font-size: 16px">Amenities Available </div>
    {#each Amenities as amenity, i}
      <sl-checkbox 
        bind:this={amenityElems[i]}
        checked={(amenities >> i)&1}
        on:sl-change={e => { amenities = setAmenity(amenities, i, e.target.checked)} }
      >{amenity}</sl-checkbox>
    {/each}
  </div>
  {#if space}
    <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => dispatch('edit-canceled')}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => updateSpace()}
      disabled={!isSpaceValid}
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
    on:click={() => createSpace()}
    disabled={!isSpaceValid}
    variant=primary>Create Space</sl-button>
    </div>
  {/if}

</div>
