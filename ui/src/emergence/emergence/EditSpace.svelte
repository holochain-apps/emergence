<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, DnaHash, ActionHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { clientContext } from '../../contexts';
import type { Space } from './types';
import '@material/mwc-button';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-textfield';
import '@material/mwc-textarea';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

const dispatch = createEventDispatcher();

export let originalSpaceHash!: ActionHash;

export let currentRecord!: Record;
let currentSpace: Space = decode((currentRecord.entry as any).Present.entry) as Space;

let title: string | undefined = currentSpace.title;
let description: string | undefined = currentSpace.description;

let errorSnackbar: Snackbar;

$: title, description;
$: isSpaceValid = true && title !== '' && description !== '';

onMount(() => {
  if (currentRecord === undefined) {
    throw new Error(`The currentRecord input is required for the EditSpace element`);
  }
  if (originalSpaceHash === undefined) {
    throw new Error(`The originalSpaceHash input is required for the EditSpace element`);
  }
});

async function updateSpace() {

  const space: Space = { 
    title: title!,
    description: description!,
  };

  try {
    const updateRecord: Record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'update_space',
      payload: {
        original_space_hash: originalSpaceHash,
        previous_space_hash: currentRecord.signed_action.hashed.hash,
        updated_space: space
      }
    });
  
    dispatch('space-updated', { actionHash: updateRecord.signed_action.hashed.hash });
  } catch (e) {
    errorSnackbar.labelText = `Error updating the space: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Edit Space</span>
  
  <div style="margin-bottom: 16px">
    <mwc-textfield outlined label="Title" value={ title } on:input={e => { title = e.target.value; } } required></mwc-textfield>    
  </div>

  <div style="margin-bottom: 16px">
    <mwc-textarea outlined label="Description" value={ description } on:input={e => { description = e.target.value;} } required></mwc-textarea>    
  </div>


  <div style="display: flex; flex-direction: row">
    <mwc-button
      outlined
      label="Cancel"
      on:click={() => dispatch('edit-canceled')}
      style="flex: 1; margin-right: 16px"
    ></mwc-button>
    <mwc-button 
      raised
      label="Save"
      disabled={!isSpaceValid}
      on:click={() => updateSpace()}
      style="flex: 1;"
    ></mwc-button>
  </div>
</div>
