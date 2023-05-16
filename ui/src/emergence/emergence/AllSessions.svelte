<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import SessionSummary from './SessionSummary.svelte';
import type { EmergenceStore } from '../../emergence-store';
import SessionFilter from './SessionFilter.svelte';
import { defaultSessionsFilter, type SessionsFilter } from './types';
  import { faFilter } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;
let showDeletedSessions = false

$: sessions = store.sessions
$: error;
$: uiProps = store.uiProps

let showFilter = false

onMount(async () => {
   store.fetchSessions();
});

</script>

<div class="pane-header">
  <h3>Sessions List</h3>
  <sl-button style="margin-left: 8px; " size=small on:click={() => { showFilter = !showFilter } } circle>
    <Fa icon={faFilter} />
  </sl-button>
  {#if showFilter}
    <SessionFilter
    on:close-filter={()=>showFilter = false}
    on:update-filter={(e)=>{store.setUIprops({sessionsFilter: e.detail})}}
    filter={$uiProps.sessionsFilter}></SessionFilter>
  {/if}
</div>
<div class="pane-content">
  {#if error}
    <span class="notice">Error fetching the sessions: {error.data.data}.</span>
  {:else if $sessions.length === 0}
    <span class="notice">No sessions found.</span>
  {:else}
    {#each $sessions.filter(s=> (!s.record.entry.trashed || showDeletedSessions) && store.filterSession(s, $uiProps.sessionsFilter)) as session}
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
