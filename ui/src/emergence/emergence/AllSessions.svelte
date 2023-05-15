<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import SessionSummary from './SessionSummary.svelte';
import type { EmergenceStore } from '../../emergence-store';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;
let showDeletedSessions = false

$: sessions = store.sessions
$: error;

onMount(async () => {
   store.fetchSessions();
});

</script>

<div class="pane-header">
  <h3>Sessions List</h3>
</div>
<div class="pane-content">
  {#if error}
    <span class="notice">Error fetching the sessions: {error.data.data}.</span>
  {:else if $sessions.length === 0}
    <span class="notice">No sessions found.</span>
  {:else}
      {#each $sessions.filter(s=>!s.record.entry.trashed || showDeletedSessions) as session}
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

<style>

.notice {
  display: block;
  text-align: center;
  padding: 25px;
}

</style>
