<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, DnaHash, ActionHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { clientContext, storeContext } from '../../contexts';
import { Amenities, type Space } from './types';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
  import type { EmergenceStore } from '../../emergence-store';
  import type { EntryRecord } from '@holochain-open-dev/utils';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();

export let originalSpaceHash!: ActionHash;

export let currentRecord!: Record;
let currentSpace: Space = decode((currentRecord.entry as any).Present.entry) as Space;

let name: string | undefined = currentSpace.name;
let description: string | undefined = currentSpace.description;
let amenities: number = currentSpace.amenities

let errorSnackbar: Snackbar;

$: name, description;
$: isSpaceValid = true && name !== '' && description !== '';

onMount(() => {
  if (currentRecord === undefined) {
    throw new Error(`The currentRecord input is required for the EditSpace element`);
  }
  if (originalSpaceHash === undefined) {
    throw new Error(`The originalSpaceHash input is required for the EditSpace element`);
  }
});

async function updateSpace() {

  try {
    const updatedSpace: EntryRecord<Space> = await store.updateSpace(originalSpaceHash, name!,description!,amenities!)
  
    dispatch('space-updated', { actionHash: updatedSpace.actionHash });
  } catch (e) {
    errorSnackbar.labelText = `Error updating the space: ${e.data.data}`;
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
  <span style="font-size: 18px">Edit Space</span>
  

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
    <div style="font-size: 16px">Amenities Available </div>
    {#each Amenities as amenity, i}
      <sl-checkbox 
        bind:this={amenityElems[i]}
        checked={(amenities >> i)&1}
        on:sl-change={e => { setAmenity(i, e.target.checked)} }
      >{amenity}</sl-checkbox>
    {/each}
  </div>

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
    variant=primary>Update Space</sl-button>
  
  </div>
</div>
