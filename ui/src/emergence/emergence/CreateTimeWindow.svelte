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
  import { faClose, faSave } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import MultiSelect from 'svelte-multiselect'

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let duration: number = 60;
let start: Date|undefined;
let tags: Array<string> = []

let errorSnackbar: Snackbar;

let datePicker:any

$: duration, start, tags;
$: isTimeWindowValid = duration > 0 && start;

onMount(() => {
});

async function createTimeWindow() { 
  try {
    const actionHash = store.createTimeWindow(new Date(datePicker.value), duration!, tags)
    start = undefined
    duration = 60
    dispatch('timeWindow-created', { timeWindowHash: actionHash });
    
  } catch (e) {
    errorSnackbar.labelText = `Error creating the timeWindow: ${e.data.data}`;
    errorSnackbar.show();
  }
}

const setLen = (l:number) => {
  if (l) {
    duration = l
  }
}
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  
  <div style="display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 10px;">
    <span style="font-size: 18px">Slot Add</span>
    <div>
      <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('close-create-timeWindow') } } circle>
        <Fa icon={faClose} />
      </sl-button>
      <sl-button circle size=small
        on:click={() => createTimeWindow()}
        disabled={!isTimeWindowValid}
        variant=primary><Fa icon={faSave} />
      </sl-button>
    </div>
  </div>
  <vaadin-date-time-picker bind:this={datePicker} on:change={() => {start = new Date(datePicker.value)}}></vaadin-date-time-picker>
  <div style="margin-bottom: 16px">
    <sl-input
    label=Duration
    value={duration}
    on:input={e=>setLen(parseInt(e.target.value))}
  ></sl-input>
  <div style="margin-bottom: 16px">
    <span>Tags:</span >
    <MultiSelect 
      bind:selected={tags} 
      options={[]} 
      allowUserOptions={true}
      />
  </div>

  </div>
            


</div>
