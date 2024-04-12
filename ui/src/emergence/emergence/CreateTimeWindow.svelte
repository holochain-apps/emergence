<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import MultiSelect from 'svelte-multiselect'
import { DateInput } from 'date-picker-svelte'
import { dayToStr, errorText } from './utils';
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let duration: number = 60;
let start: Date|undefined;
let tags: Array<string> = []

let errorSnackbar: Snackbar;

$: duration, start, tags;
$: isTimeWindowValid = duration > 0 && start;

onMount(() => {
});

const reset = () => {
  //start = undefined
  duration = 60
  //tags = []
}

async function createTimeWindow() { 
  try {
    const actionHash = store.createTimeWindow(start, duration!, tags)
    dispatch('timeWindow-created', { timeWindowHash: actionHash });
    dialog.hide()
  } catch (e) {
    errorSnackbar.labelText = `Error creating the timeWindow: ${errorText(e)}`;
    errorSnackbar.show();
  }
}
export const open = ()=>{
  reset()
  dialog.show()
}

const setLen = (l:number) => {
  if (l) {
    duration = l
  }
}
let dialog: SlDialog
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<sl-dialog
bind:this={dialog}
label="Create Time Slot"
>
<div style="display: flex; flex-direction: column; max-width: 500px">
  
  <div style="margin-bottom: 16px">
    <span>Slot Start:</span >
    <DateInput 
      format={"yyyy-MM-dd HH:mm"}
      placeholder="Click to select date"
      closeOnSelection={true} 
      bind:value={start} />
  </div>

  <div style="margin-bottom: 16px">
    <sl-input
    label=Duration
    value={duration}
    on:input={e=>setLen(parseInt(e.target.value))}
  ></sl-input>
  <div style="margin-bottom: 16px">
    <span>Slot type:</span >
    <MultiSelect 
      bind:selected={tags} 
      options={store.getSlotTypeTags()} 
      allowUserOptions={true}
      />
  </div>

  </div>
            
  <div style="display: flex; flex-direction: row; justify-content: flex-end; margin-bottom: 10px;">
    <div>
      <sl-button title="Save"
        on:click={() => createTimeWindow()}
        disabled={!isTimeWindowValid}
        variant=primary>Create
      </sl-button>
      <sl-button style="margin-left: 8px; " on:click={() => { dispatch('close-create-timeWindow') ; dialog.hide() } }>
        Cancel
      </sl-button>
    </div>
  </div>


</div>
</sl-dialog>