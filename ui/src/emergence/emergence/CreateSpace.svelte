<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, ActionHash, DnaHash } from '@holochain/client';
import { clientContext, storeContext } from '../../contexts';
import type { Space } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();


let name: string = '';
let description: string = '';

let errorSnackbar: Snackbar;

$: name, description;
$: isSpaceValid = true && name !== '' && description !== '';

onMount(() => {
});

async function createSpace() {  
  const spaceEntry: Space = { 
    name: name!,
    description: description!,
  };
  
  try {
    const record: Record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'create_space',
      payload: spaceEntry,
    });
    name = ""
    description = ""
    store.fetchSpaces()
    dispatch('space-created', { spaceHash: record.signed_action.hashed.hash });
  } catch (e) {
    errorSnackbar.labelText = `Error creating the space: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Create Space</span>
  

  <div style="margin-bottom: 16px">
    <sl-input
    label=Name
    value={name}
    on:input={e => { name = e.target.value; } }
  ></sl-input>
  </div>
            
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Description 
      value={ description } on:input={e => { description = e.target.value;} }
    ></sl-textarea>

  </div>
            

  <sl-button 
  on:click={() => createSpace()}
  disabled={!isSpaceValid}
  variant=primary>Create Space</sl-button>

</div>
