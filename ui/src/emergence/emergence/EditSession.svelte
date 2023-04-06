<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, DnaHash, ActionHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { clientContext } from '../../contexts';
import type { Session, SessionUpdate } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

const dispatch = createEventDispatcher();

export let originalSessionHash!: ActionHash;

export let currentRecord!: Record;
let currentSession: Session = decode((currentRecord.entry as any).Present.entry) as Session;

let title: string | undefined = currentSession.title;

let errorSnackbar: Snackbar;

$: title;
$: isSessionValid = title !== '';

onMount(() => {
  if (currentRecord === undefined) {
    throw new Error(`The currentRecord input is required for the EditSession element`);
  }
  if (originalSessionHash === undefined) {
    throw new Error(`The originalSessionHash input is required for the EditSession element`);
  }
});

async function updateSession() {

  const session: SessionUpdate = { 
    title: title!,
  };

  try {
    const updateRecord: Record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'update_session',
      payload: {
        original_session_hash: originalSessionHash,
        previous_session_hash: currentRecord.signed_action.hashed.hash,
        updated_title: title!
      }
    });
  
    dispatch('session-updated', { actionHash: updateRecord.signed_action.hashed.hash });
  } catch (e) {
    errorSnackbar.labelText = `Error updating the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Edit Session</span>
  
  Key: {currentSession.key}
  <div style="margin-bottom: 16px">
    <sl-input
    label=Title
    value={title}
    on:input={e => { title = e.target.value; } }
  ></sl-input>
  </div>


  <div style="display: flex; flex-direction: row">
    <sl-button
    label="Cancel"
    on:click={() => dispatch('edit-canceled')}
    style="flex: 1; margin-right: 16px"
    >Cancel</sl-button>
    <sl-button 
    style="flex: 1;"
    on:click={() => updateSession()}
    disabled={!isSessionValid}
    variant=primary>Save</sl-button>

  </div>
</div>
