<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import { timeWindowDurationToStr, timeWindowStartToStr } from './types';
import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let title: string = '';

let errorSnackbar: Snackbar;
let spaceSelect: SlSelect;
let windowSelect: SlSelect;

let selectedSpace: string = ""
let selectedWindow: string = ""

$: title, selectedSpace, selectedWindow;
$: isSessionValid = title !== '' && ((selectedSpace && selectedWindow) || (!selectedSpace && !selectedWindow));
$: spaces = store.spaces
$: windows = store.timeWindows

onMount(() => {
});

async function createSession() {    
  try {
    const record = await store.createSession(title!)
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

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Create Session</span>
  
  <div style="margin-bottom: 16px">
    <sl-input
    label=Title
    value={title}
    on:input={e => { title = e.target.value; } }
  ></sl-input>
  </div>
  <div style="margin-bottom: 16px">
    <sl-select bind:this={spaceSelect}
      label="Space"
      value={selectedSpace}
      on:sl-change={e => {selectedSpace = e.target.value; } }
    >
    <sl-option value="">No Space Selected</sl-option>
    {#each $spaces as space}
    <sl-option value={encodeHashToBase64(space.actionHash)}>{space.entry.name}</sl-option>
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
  <sl-button 
  on:click={() => createSession()}
  disabled={!isSessionValid}
  variant=primary>Create Session</sl-button>

</div>
