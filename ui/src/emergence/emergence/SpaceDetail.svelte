<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { decode } from '@msgpack/msgpack';
import type { Record, ActionHash, AppAgentClient, EntryHash, AgentPubKey, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import type { Space } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Fa from 'svelte-fa'
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import EditSpace from './EditSpace.svelte'; 
  import type { EmergenceStore } from '../../emergence-store';

const dispatch = createEventDispatcher();

export let spaceHash: ActionHash;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let loading = true;
let error: any = undefined;

let record: Record | undefined;
let space: Space | undefined;

let editing = false;

let errorSnackbar: Snackbar;
  
$: editing,  error, loading, record, space;

onMount(async () => {
  if (spaceHash === undefined) {
    throw new Error(`The spaceHash input is required for the SpaceDetail element`);
  }
  await fetchSpace();
});

async function fetchSpace() {
  loading = true;
  error = undefined;
  record = undefined;
  space = undefined;
  
  try {
    record = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'get_space',
      payload: spaceHash,
    });
    if (record) {
      space = decode((record.entry as any).Present.entry) as Space;
    }
  } catch (e) {
    error = e;
  }

  loading = false;
}

async function deleteSpace() {
  try {
    await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'delete_space',
      payload: spaceHash,
    });
    dispatch('space-deleted', { spaceHash: spaceHash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the space: ${e.data.data}`;
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
<span>Error fetching the space: {error.data.data}</span>
{:else if editing}
<EditSpace
  originalSpaceHash={ spaceHash}
  currentRecord={record}
  on:space-updated={async () => {
    editing = false;
    await fetchSpace()
  } }
  on:edit-canceled={() => { editing = false; } }
></EditSpace>
{:else}

<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row">
    <span style="flex: 1"></span>
    <sl-button style="margin-left: 8px; " size=small on:click={() => { editing = true; } } circle>
      <Fa icon={faEdit} />
    </sl-button>
    <sl-button style="margin-left: 8px;" size=small on:click={() => deleteSpace()} circle>
      <Fa icon={faTrash} />
    </sl-button>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Name:</strong></span>
    <span style="white-space: pre-line">{ space.name }</span>
  </div>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Description:</strong></span>
    <span style="white-space: pre-line">{ space.description }</span>
  </div>

</div>
{/if}

