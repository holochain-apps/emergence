<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import { encodeHashToBase64, type Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import SessionSummary from './SessionSummary.svelte';
import SessionCrud from './SessionCrud.svelte';
import type { EmergenceStore } from '../../emergence-store';
import SessionFilter from './SessionFilter.svelte';
import { faClose, faFilter, faList, faTable, faTag, faMagnifyingGlass, faClock, faCheck, faMap, faArrowsUpDownLeftRight, faArrowUpShortWide, faArrowDownWideShort } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { calcDays, dayToStr, sortWindows, windowDay, windowDayAsTimestamp, windowsInDay } from './utils';
import { DetailsType, SessionSortOrder, type Info, type Session, type TimeWindow } from './types';
import SessionFilterCtrls from './SessionFilterCtrls.svelte';
import SpaceLink from './SpaceLink.svelte';
import Sense from './Sense.svelte';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;
let showDeletedSessions = false

$: settings = store.settings
$: sessions = store.sessions
$: spaces = store.sitemapFilteredSpaces()
$: windows = store.sitemapFilteredWindows()
$: error;
$: uiProps = store.uiProps
let slotType: string 
$: slotType  

$: _days = calcDays($windows, slotType, $uiProps.sessionsFilter) 
$: days = $uiProps.sessionSort == SessionSortOrder.Ascending ? _days : _days.reverse()
const windowsInDaySorted = (w: Array<TimeWindow>, day: Date, type): Array<TimeWindow> => {
  let  wid: Array<TimeWindow> = windowsInDay(w, day, type).sort(sortWindows)
  return $uiProps.sessionSort == SessionSortOrder.Ascending ? wid : wid.reverse()
}
let showFilter = false

let createSessionDialog: SessionCrud
let bySpace = false

onMount(async () => {
});
const sortSessions =(a:Info<Session>,b:Info<Session>) : number => {
  const slota = store.getSessionSlot(a)
  const slotb = store.getSessionSlot(b)
  let vala =  Number. MAX_SAFE_INTEGER
  let valb =  Number. MAX_SAFE_INTEGER
  if (slota) vala = slota.window.start
  if (slotb) valb = slotb.window.start
  return $uiProps.sessionSort == SessionSortOrder.Ascending ? vala - valb : valb - vala
}
</script>
<SessionCrud
bind:this={createSessionDialog}
on:session-created={() => {} }
></SessionCrud>
<div class="pane-header">
  <div class="header-content">
    <h3>Sessions</h3>
    {#if $uiProps.amSteward || (store.getCurrentSiteMap() && store.getCurrentSiteMap().record.entry.tags.includes("emergent"))}
    <div class="pill-button"  on:click={() => {createSessionDialog.open(undefined)} } ><span>+</span> Create</div>
    {/if}
      <div class="section-controls">
        
        <SessionFilterCtrls
          on:toggle-filter={()=>{showFilter = !showFilter;}}
        ></SessionFilterCtrls>

        <sl-button title="Toggle Sort Order" style="margin-left: 8px; " on:click={() => { 
            store.setUIprops({sessionSort: $uiProps.sessionSort == SessionSortOrder.Ascending?SessionSortOrder.Descending : SessionSortOrder.Ascending  }) }} circle>
          <Fa icon={$uiProps.sessionSort == SessionSortOrder.Ascending ? faArrowUpShortWide : faArrowDownWideShort} />
        </sl-button>

        <sl-button title={$uiProps.sessionListMode ? "Switch to Grid View" : "Switch to List View"} style="margin-left: 8px; " on:click={() => { store.setUIprops({sessionListMode:!$uiProps.sessionListMode }) }} circle>
          <Fa icon={$uiProps.sessionListMode ? faTable : faList} />
        </sl-button>


        {#if !$uiProps.sessionListMode}
          <sl-button title="Toggle Axes"  style="margin-left: 8px; " on:click={() => { bySpace = !bySpace }} circle>
            <Fa icon={faArrowsUpDownLeftRight} />
          </sl-button>
        {/if}


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
        {#if $settings.game_active}
            <Sense></Sense>
        {/if}
    {#if $uiProps.sessionListMode}
      {#each $sessions.filter(s=> (!s.record.entry.trashed || showDeletedSessions) && store.filterSession(s, $uiProps.sessionsFilter)).sort(sortSessions) as session}
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
      {#if bySpace}
      <div class="fix-table-head">
      <table style="max-width:100%">
        <th class="empty top-sticky"></th>
        {#each $spaces as space, idx}
          <th class="space-title top-sticky"
            >
              <SpaceLink spaceHash={space.original_hash}></SpaceLink>

              {#if space.record.entry.pic}
                <div class="space-pic">
                  <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
                </div>
              {/if}
          </th>
        {/each}
        {#each days as day}
          <tr>
            <th class="left-sticky day-row" colspan={4} >{day.toDateString()}</th>
          </tr>
          {#each windowsInDaySorted($windows, day, slotType) as window}
          <tr>
            <th class="time-title left-sticky"
            >
              
                {new Date(window.start).toTimeString().slice(0,5)}
            </th>
            {#each $spaces as space, idx}
              <td 
                id={`${JSON.stringify(window)}-${idx}}`}
                class="schedule-slot"
              >
                {#each store.sessionsInSpace(window, space) as session}
                  <div class="slotted-session"
                  on:click={()=>store.openDetails(DetailsType.Session, session.original_hash)}
                  id={encodeHashToBase64(session.original_hash)}
                  >
                    {session.record.entry.title}
                  </div>
                {/each}
              </td>
            {/each}
          </tr>
          {/each}
        {/each}
      </table>
    </div>
      {:else}
      <div class="fix-table-head">
      <table >
        <tr>
          <th class="top-sticky"></th>
          {#each days as day}
          <th class="top-sticky"></th>
          <th class=" top-sticky" style="text-align:left" colspan="{windowsInDay($windows, day, slotType).length}">{dayToStr(day)}</th>

          {/each}
        </tr>
        <tr>
        <th class="top-sticky empty"></th>
        {#each days as day}
          <th class="day-col top-sticky">
          </th>
          {#each windowsInDaySorted($windows, day, slotType) as window}
            <th class="time-title top-sticky"
            >
              {new Date(window.start).toTimeString().slice(0,5)}

            </th>
          
          {/each}
        {/each}
        </tr>
        {#each $spaces as space, idx}
        <tr>
          <th class="space-title left-sticky"
  >
              <SpaceLink spaceHash={space.original_hash}></SpaceLink>
              
              {#if space.record.entry.pic}
                <div class="space-pic">
                  <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
                </div>
              {/if}
          </th>

          {#each days as day}
            <td class="day-col "></td>

            {#each $windows.filter(w=>{
                 return windowDayAsTimestamp(w) === day.getTime()
              }).sort(sortWindows) as window}
              <td 
                id={`${JSON.stringify(window)}-${idx}}`}
                class="schedule-slot"
              >
                {#each store.sessionsInSpace(window, space).filter(s=>store.filterSession(s, $uiProps.sessionsFilter)) as session}
                  <div class="slotted-session"
                    on:click={()=>store.openDetails(DetailsType.Session, session.original_hash)}
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
    </div>
    {/if}
{/if}
  {/if}
</div>

<style>
.empty {
  background-color: white;
  outline: solid 1px lightgray;
}
:global(.notice) {
  display: block;
  text-align: center;
  padding: 25px;
}

  .fix-table-head {
    overflow: auto;
    height: 100%;
    width: 100%;
    margin: 20px;
    padding: 1px;
    }
  table {
    border-collapse: collapse;        
    width: 100%;
  }
 .space-title {
  background-color: white;
  outline: solid 1px lightgray;
 }
 .time-title {
  background-color: white;
  outline: solid 1px lightgray;
 }

 .day-row {
  text-align: left;
 }
 .day-col {
  background-color: lightgray;
  width: 4px;
  outline: solid 1px lightgray;
 }
 .left-sticky {
  position: sticky;
  left: 0;
 }
 .top-sticky {
  position: sticky;
  top: 0;
 }

 .schedule-slot {
  outline: solid 1px lightgray;
  background-color: white;
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