<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, ActionHash, DnaHash } from '@holochain/client';
import { clientContext, storeContext } from '../../contexts';
import type { Session } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
  import type { EmergenceStore } from '../../emergence-store';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let title: string = '';

let errorSnackbar: Snackbar;

$: title;
$: isSessionValid = title !== '';


const genKey = () => {
  const keyChars = 'ABCDEFGHJKLMNPQRSTVXYZ23456789';
  let key = '';
  for (let x = 0; x < 5; x += 1) {
    key += keyChars[Math.floor(Math.random() * (keyChars.length - 1))];
  }
  return key
}

onMount(() => {
});

async function createSession() {  
  const sessionEntry: Session = { 
    key: genKey(),
    title: title!,
  };
  
  try {
    const record: Record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'create_session',
      payload: sessionEntry,
    });
    title = ""
    store.fetchSessions()
    dispatch('session-created', { sessionHash: record.signed_action.hashed.hash });
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
            
  <sl-button 
  on:click={() => createSession()}
  disabled={!isSessionValid}
  variant=primary>Create Session</sl-button>

</div>
