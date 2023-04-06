<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { decode } from '@msgpack/msgpack';
import type { Record, ActionHash, AppAgentClient, EntryHash, AgentPubKey, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import type { Session } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';

import EditSession from './EditSession.svelte'; 

const dispatch = createEventDispatcher();

export let sessionHash: ActionHash;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let loading = true;
let error: any = undefined;

let record: Record | undefined;
let session: Session | undefined;

let editing = false;

let errorSnackbar: Snackbar;
  
$: editing,  error, loading, record, session;

onMount(async () => {
  if (sessionHash === undefined) {
    throw new Error(`The sessionHash input is required for the SessionDetail element`);
  }
  await fetchSession();
});

async function fetchSession() {
  loading = true;
  error = undefined;
  record = undefined;
  session = undefined;
  
  try {
    record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'get_session',
      payload: sessionHash,
    });
    if (record) {
      session = decode((record.entry as any).Present.entry) as Session;
    }
  } catch (e) {
    error = e;
  }

  loading = false;
}

async function deleteSession() {
  try {
    await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'delete_session',
      payload: sessionHash,
    });
    dispatch('session-deleted', { sessionHash: sessionHash });
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
<EditSession
  originalSessionHash={ sessionHash}
  currentRecord={record}
  on:session-updated={async () => {
    editing = false;
    await fetchSession()
  } }
  on:edit-canceled={() => { editing = false; } }
></EditSession>
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
    <span style="white-space: pre-line">{ session.key }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Title:</strong></span>
    <span style="white-space: pre-line">{ session.title }</span>
  </div>

</div>
{/if}

