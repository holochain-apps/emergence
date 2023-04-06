<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, ActionHash, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import { storeContext } from '../../contexts';
import type { Slot } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let length: number = 60;
let start: Date|undefined;

let errorSnackbar: Snackbar;

$: length, start;
$: isSlotValid = length > 0;

onMount(() => {
});

async function createSlot() { 
  start = new Date
  const slot: Slot = { 
    start: parseInt((start.getTime()).toFixed(0)),
    length: length!,
  };
  
  try {
    const actionHash: Record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'create_slot',
      payload: slot,
    });
    start = undefined
    length = 60
    dispatch('slot-created', { slot:slot, slotHash: actionHash });
    store.fetchSlots()
  } catch (e) {
    errorSnackbar.labelText = `Error creating the slot: ${e.data.data}`;
    errorSnackbar.show();
  }
}

const setLen = (l:number) => {
  if (l) {
    length = l
  }
}
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Create Slot</span>
  

  <div style="margin-bottom: 16px">
    <sl-input
    label=Length
    value={length}
    on:input={e=>setLen(parseInt(e.target.value))}
  ></sl-input>

  </div>
            
  <sl-button 
  on:click={() => createSlot()}
  disabled={!isSlotValid}
  variant=primary>Create Slot</sl-button>

</div>
