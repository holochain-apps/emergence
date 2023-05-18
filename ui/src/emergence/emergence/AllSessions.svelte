<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import { encodeHashToBase64, type Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import SessionSummary from './SessionSummary.svelte';
  import SessionCrud from './SessionCrud.svelte';
import type { EmergenceStore } from '../../emergence-store';
import SessionFilter from './SessionFilter.svelte';
import Sync from './Sync.svelte';
import { faFilter, faList, faTable } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { calcDays, dayToStr, sortWindows, windowsInDay } from './utils';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;
let showDeletedSessions = false

$: sessions = store.sessions
$: spaces = store.spaces
$: windows = store.timeWindows
$: error;
$: uiProps = store.uiProps
let slotType: string 
$: slotType  
let filteredDay: number | undefined
$: filteredDay

$: days = calcDays($windows, slotType, filteredDay) 

let showFilter = false

let createSessionDialog: SessionCrud

onMount(async () => {
});

</script>
<SessionCrud
bind:this={createSessionDialog}
on:session-created={() => {} }
></SessionCrud>
<div class="pane-header">
  <div class="header-content">
    <h3>Sessions</h3>
    <div class="create"  on:click={() => {createSessionDialog.open(undefined)} } ><span>+</span> Create</div>

    <div class="section-controls">
      <sl-button style="margin-left: 8px; " size=small on:click={() => { showFilter = !showFilter } } circle>
        <Fa icon={faFilter} />
      </sl-button>
      <sl-button style="margin-left: 8px; " size=small on:click={() => { store.setUIprops({sessionListMode:!$uiProps.sessionListMode }) }} circle>
        <Fa icon={$uiProps.sessionListMode ? faTable : faList} />
      </sl-button>
      <div style="margin-left: 8px;">
        <Sync></Sync>
      </div>
    </div>
  </div>
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
    {#if $uiProps.sessionListMode}
      {#each $sessions.filter(s=> (!s.record.entry.trashed || showDeletedSessions) && store.filterSession(s, $uiProps.sessionsFilter)) as session}
        <div class="session">
          <SessionSummary 
            showTags={true}
            showSlot={true}
            allowSetIntention={true} 
            session={session}>
          </SessionSummary>
        </div>
      {/each}
    {:else}
    <table style="margin:auto">
      <tr>
        <th class="empty"></th>
        {#each days as day}
        <th style="text-align:left" colspan="{windowsInDay($windows, day, slotType).length+1}">{dayToStr(day)}</th>

        {/each}
      </tr>
      <tr>
      <th class="empty"></th>

      {#each days as day}
        <th style=""></th>
        {#each windowsInDay($windows, day, slotType).sort(sortWindows) as window}
          <th class="time-title"
          >

            {new Date(window.start).toTimeString().slice(0,5)}

          </th>
        
        {/each}
      {/each}
      </tr>
      {#each $spaces as space, idx}
      <tr>
        <td class="space-title"
>
            {space.record.entry.name}{#if space.record.entry.key} ({space.record.entry.key}){/if}
            {#if space.record.entry.pic}
              <div class="space-pic">
                <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
              </div>
            {/if}
        </td>

        {#each days as day}
          <td class="empty"></td>

          {#each $windows.filter(w=>{
              // @ts-ignore
              return new Date(w.start).toDateString()  == day.toDateString()
            }).sort(sortWindows) as window}
            <td 
              id={`${JSON.stringify(window)}-${idx}}`}
              class="schedule-slot"
            >
              {#each store.sessionsInSpace(window, space).filter(s=>store.filterSession(s, $uiProps.sessionsFilter)) as session}
                <div class="slotted-session"
                  on:click={()=>store.setUIprops({sessionDetails: session.original_hash})}
                id={encodeHashToBase64(session.original_hash)}
                >
                  {session.record.entry.title}
                </div>
              {/each}
            </td>
          {/each}
        {/each}
      </tr>
      {/each}
    </table>
{/if}
  {/if}
</div>

<style>

.notice {
  display: block;
  text-align: center;
  padding: 25px;
}

 .space-title {
  outline: solid 1px;
 }
 .time-title {
  outline: solid 1px;
 }
 .schedule-slot {
  outline: solid 1px;
 }
 .slotted-session {
  background-color: lightgreen;
  display: inline-block;
  padding: 3px;
  border: dotted 1px blue;
  border-radius: 5px;
  margin: 3px;
  cursor: pointer;
 }
</style>