<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { decode } from '@msgpack/msgpack';
import { type Record, type ActionHash, type AppAgentClient, type EntryHash, type AgentPubKey, type DnaHash, encodeHashToBase64 } from '@holochain/client';
import { clientContext, storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import { timeWindowStartToStr, type Session, type SessionPlus, type TimeWindow, timeWindowDurationToStr } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';

import EditSession from './EditSession.svelte'; 

const dispatch = createEventDispatcher();

export let session: SessionPlus;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;
let error: any = undefined;

let editing = false;

let errorSnackbar: Snackbar;
let slot = ""
$: editing,  error, loading, session, slot;
$: spaces = store.spaces

onMount(async () => {
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionDetail element`);
  }
  for (const r of session.relations) {
    if (r.content.path == "session/space") {
      const destB64 = encodeHashToBase64(r.dst)
      const space = $spaces.find((s)=> encodeHashToBase64(s.actionHash) === destB64)
      if (space) {
        const window = JSON.parse(r.content.data) as TimeWindow
        slot = `Scheduled in ${space.entry.name} on ${timeWindowStartToStr(window)} for ${timeWindowDurationToStr(window)}`
      }
    }
  }
});


async function deleteSession() {
  try {
    await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'delete_session',
      payload: session.session.actionHash,
    });
    dispatch('session-deleted', { sessionHash: session.session.actionHash });
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
  session={ session}
  on:session-updated={async () => {
    editing = false;
  //  await fetchSession()
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
    <span style="white-space: pre-line">{ session.session.entry.key }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Title:</strong></span>
    <span style="white-space: pre-line">{ session.session.entry.title }</span>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    {slot}

  </div>

</div>
{/if}

