<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { storeContext } from '../../contexts';
import SessionDetail from './SessionDetail.svelte';
import type { EmergenceSignal } from './types';
import type { EmergenceStore } from '../../emergence-store';


let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

$: sessions = store.sessions
$: loading, error;

onMount(async () => {
  await store.fetchSessions();
  loading = false;

});

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the sessions: {error.data.data}.</span>
{:else if $sessions.length === 0}
<span>No sessions found.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each $sessions as session}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <SessionDetail sessionHash={session.actionHash}  on:session-deleted={() => store.fetchSessions()}></SessionDetail>
    </div>
  {/each}
</div>
{/if}

