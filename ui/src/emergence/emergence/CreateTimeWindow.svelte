<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, ActionHash, DnaHash } from '@holochain/client';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import '@vaadin/date-time-picker'

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let length: number = 60;
let start: Date|undefined;

let errorSnackbar: Snackbar;

let datePicker:any

$: length, start;
$: isTimeWindowValid = length > 0;

onMount(() => {
});

async function createTimeWindow() { 
  try {
    const actionHash = store.createTimeWindow(new Date(datePicker.value), length!)
    start = undefined
    length = 60
    dispatch('timeWindow-created', { timeWindowHash: actionHash });
    
  } catch (e) {
    errorSnackbar.labelText = `Error creating the timeWindow: ${e.data.data}`;
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
  <span style="font-size: 18px">Create TimeWindow</span>
  
  <vaadin-date-time-picker bind:this={datePicker}></vaadin-date-time-picker>
  <div style="margin-bottom: 16px">
    <sl-input
    label=Length
    value={length}
    on:input={e=>setLen(parseInt(e.target.value))}
  ></sl-input>

  </div>
            
  <sl-button 
  on:click={() => createTimeWindow()}
  disabled={!isTimeWindowValid}
  variant=primary>Create TimeWindow</sl-button>

</div>
