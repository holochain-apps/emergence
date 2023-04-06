<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { clientContext } from '../../contexts';
import SessionDetail from './SessionDetail.svelte';
import type { EmergenceSignal } from './types';


let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let hashes: Array<ActionHash> | undefined;
let loading = true;
let error: any = undefined;

$: hashes, loading, error;

onMount(async () => {

  await fetchSessions();
  client.on('signal', signal => {
    if (signal.zome_name !== 'emergence') return;
    const payload = signal.payload as EmergenceSignal;
    if (payload.type !== 'EntryCreated') return;
    if (payload.app_entry.type !== 'Session') return;
    hashes = [...hashes, payload.action.hashed.hash];
  });
});

async function fetchSessions() {
  try {
    const records = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'get_all_sessions',
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
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the sessions: {error.data.data}.</span>
{:else if hashes.length === 0}
<span>No sessions found.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each hashes as hash}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <SessionDetail sessionHash={hash}  on:session-deleted={() => fetchSessions()}></SessionDetail>
    </div>
  {/each}
</div>
{/if}

