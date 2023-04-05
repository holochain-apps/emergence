<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@material/mwc-circular-progress';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { clientContext } from '../../contexts';
import SpaceDetail from './SpaceDetail.svelte';
import type { EmergenceSignal } from './types';


let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let hashes: Array<ActionHash> | undefined;
let loading = true;
let error: any = undefined;

$: hashes, loading, error;

onMount(async () => {

  await fetchSpaces();
  client.on('signal', signal => {
    if (signal.zome_name !== 'emergence') return;
    const payload = signal.payload as EmergenceSignal;
    if (payload.type !== 'EntryCreated') return;
    if (payload.app_entry.type !== 'Space') return;
    hashes = [...hashes, payload.action.hashed.hash];
  });
});

async function fetchSpaces() {
  try {
    const records = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'get_all_spaces',
      payload: null,
    });
    hashes = records.map(r => r.signed_action.hashed.hash);
  } catch (e) {
    error = e;
  }
  loading = false;
}

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <mwc-circular-progress indeterminate></mwc-circular-progress>
</div>
{:else if error}
<span>Error fetching the spaces: {error.data.data}.</span>
{:else if hashes.length === 0}
<span>No spaces found.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each hashes as hash}
    <div style="margin-bottom: 8px;">
      <SpaceDetail spaceHash={hash}  on:space-deleted={() => fetchSpaces()}></SpaceDetail>
    </div>
  {/each}
</div>
{/if}

