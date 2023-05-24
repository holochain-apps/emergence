<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { AppAgentClient } from '@holochain/client';
import { clientContext } from '../../contexts';
import { timeWindowStartToStr, timeWindowDurationToStr, type TimeWindow } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash } from '@fortawesome/free-solid-svg-icons';
let errorSnackbar: Snackbar;


const dispatch = createEventDispatcher();

export let timeWindow: TimeWindow;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

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
    <sl-button style="margin-left: 8px;" on:click={() => deleteTimeWindow()} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Start:</strong></span>
    <span style="white-space: pre-line">{ timeWindowStartToStr(timeWindow) }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Length:</strong></span>
    <span style="white-space: pre-line">{ timeWindowDurationToStr(timeWindow) } </span>
  </div>

</div>

