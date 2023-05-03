<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import SessionSummary from './SessionSummary.svelte';
import type { EmergenceStore } from '../../emergence-store';

const dispatch = createEventDispatcher();

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

<div class="pane-header">
  <h3>Sessions List</h3>
</div>
<div class="pane-content">
  {#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
      <sl-spinner></sl-spinner>

    </div>
  {:else if error}
    <span>Error fetching the sessions: {error.data.data}.</span>
  {:else if $sessions.length === 0}
    <span>No sessions found.</span>
  {:else}
      {#each $sessions as session}
        <div class="session">
          <SessionSummary 
            showTags={true}
            showSlot={true}
            allowSetIntention={true} 
            on:session-selected={(event)=>{dispatch('session-selected', event.detail)}} 
            session={session}>
          </SessionSummary>
        </div>
      {/each}
  {/if}
</div>

