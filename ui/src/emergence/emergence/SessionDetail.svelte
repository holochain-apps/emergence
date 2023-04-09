<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { AppAgentClient } from '@holochain/client';
import { clientContext, storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import { timeWindowStartToStr, type Slot, timeWindowDurationToStr, Amenities, amenitiesList, type Session, type Info } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';

import SessionCrud from './SessionCrud.svelte';

const dispatch = createEventDispatcher();

export let session: Info<Session>;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;
let error: any = undefined;

let editing = false;

let errorSnackbar: Snackbar;
let slot:Slot|undefined = undefined

$: editing,  error, loading, session, slot;
$: spaces = store.spaces

onMount(async () => {
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionDetail element`);
  }
  slot = store.getSessionSlot(session)
});

async function deleteSession() {
  try {
    await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'delete_session',
      payload: session.record.actionHash,
    });
    dispatch('session-deleted', { sessionHash: session.record.actionHash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}
</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the session: {error.data.data}</span>
{:else if editing}
<SessionCrud
  session={ session}
  on:session-updated={async () => {
    editing = false;
  //  await fetchSession()
  } }
  on:edit-canceled={() => { editing = false; } }
></SessionCrud>
{:else}

<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row">
    <span style="flex: 1"></span>
    <sl-button style="margin-left: 8px; " size=small on:click={() => { editing = true; } } circle>
      <Fa icon={faEdit} />
    </sl-button>
    <sl-button style="margin-left: 8px;" size=small on:click={() => deleteSession()} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Key:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.key }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Title:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.title }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Required Amenities:</strong></span>
    <span style="white-space: pre-line">
      {amenitiesList(session.record.entry.amenities).join(", ")}
    </span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    {#if slot}
    Scheduled in {store.getSpace(slot.space) ? store.getSpace(slot.space).entry.name : "Unknown"} on {timeWindowStartToStr(slot.window)} for {timeWindowDurationToStr(slot.window)}
    {/if}
  </div>

</div>
{/if}

