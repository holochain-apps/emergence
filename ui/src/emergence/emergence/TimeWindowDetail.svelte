<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { decode } from '@msgpack/msgpack';
import type { Record, ActionHash, AppAgentClient, EntryHash, AgentPubKey, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import type { TimeWindow } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash } from '@fortawesome/free-solid-svg-icons';
let errorSnackbar: Snackbar;


const dispatch = createEventDispatcher();

export let timeWindow: TimeWindow;

let start: Date| undefined = undefined

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
onMount(async () => {
  start = new Date(timeWindow.start)
});

async function deleteTimeWindow() {
  try {
    await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'delete_timeWindow',
      payload: timeWindow,
    });
    dispatch('timeWindow-deleted', {});
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the timeWindow: ${e.data.data}`;
    errorSnackbar.show();
  }
}
</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>


<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row">
    <sl-button style="margin-left: 8px;" size=small on:click={() => deleteTimeWindow()} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Start:</strong></span>
    <span style="white-space: pre-line">{ start ? `${start.toDateString()} @ ${start.toTimeString().slice(0,5)}` : "" }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Length:</strong></span>
    <span style="white-space: pre-line">{ timeWindow.length >=60 ? `${timeWindow.length/60} hour${timeWindow.length>60?'s':''}` : `${timeWindow.length} minutes` } </span>
  </div>

</div>

