<script lang="ts">
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';

import { onMount, getContext, createEventDispatcher } from 'svelte';
import { encodeHashToBase64, type Record } from '@holochain/client15';
import { storeContext } from '../../contexts';
import SessionSummary from './SessionSummary.svelte';
import SessionCrud from './SessionCrud.svelte';
import type { EmergenceStore } from '../../emergence-store';
import SessionFilter from './SessionFilter.svelte';
import { faArrowUpShortWide, faArrowDownWideShort, faSearch } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { calcDays, dayToStr, sortWindows, windowDay, windowDayAsTimestamp, windowsInDay } from './utils';
import { DetailsType, SessionSortOrder, type Info, type Session, type TimeWindow, SessionListMode } from './types';
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
let listModeSelect: SlSelect;


$: _days = calcDays($windows, slotType, $uiProps.sessionsFilter) 
$: days = $uiProps.sessionSort == SessionSortOrder.Ascending ? _days : _days.reverse()
const windowsInDaySorted = (w: Array<TimeWindow>, day: Date, type): Array<TimeWindow> => {
  let  wid: Array<TimeWindow> = windowsInDay(w, day, type).sort(sortWindows)
  return $uiProps.sessionSort == SessionSortOrder.Ascending ? wid : wid.reverse()
}
let showFilter = false

let createSessionDialog: SessionCrud

onMount(async () => {
  listModeSelect.value = $uiProps.sessionListMode
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

{#if $settings.game_active}
<div class="background">
  <div class="sensemaking-game">
    <Sense></Sense>
  </div>
</div>
{:else}
 <div class="spacer"></div>
{/if}

<div class="pane-header">
  <div class="header-content">
    <div id="create-button" class="pill-button"  on:click={() => {createSessionDialog.open(undefined)} } ><span>+</span> Create</div>
      <div class="section-controls">
        <div class="center-row search-bar">
          <sl-button class="search-icon"  
            on:click={() => {
              if ($uiProps.searchVisible) {
                const filter = $uiProps.sessionsFilter;
                filter.keyword = ""
                store.setUIprops({sessionsFilter: filter})
              }
              store.setUIprops({searchVisible: ! $uiProps.searchVisible})
              // focus on the search
              // document.getElementById("input").focus()
              }} circle>
            <Fa icon={faSearch} />
          </sl-button>
          <div class="search-input"
          class:show-search={$uiProps.searchVisible}>
            <sl-input
              
              value={$uiProps.sessionsFilter.keyword}
              placeholder="Search title, description & hosts"
              on:input={e => { 
                const filter = $uiProps.sessionsFilter;
                filter.keyword = e.target.value
                store.setUIprops({sessionsFilter: filter})}}
            ></sl-input>
          </div>
        </div> 
        <SessionFilterCtrls
          on:toggle-filter={()=>{showFilter = !showFilter;}}
        ></SessionFilterCtrls>

        <sl-button title="Toggle Sort Order" style="margin-left: 8px; " on:click={() => { 
            store.setUIprops({sessionSort: $uiProps.sessionSort == SessionSortOrder.Ascending?SessionSortOrder.Descending : SessionSortOrder.Ascending  }) }} circle>
          <Fa icon={$uiProps.sessionSort == SessionSortOrder.Ascending ? faArrowUpShortWide : faArrowDownWideShort} />
        </sl-button>

        <sl-select style="margin-left:10px;" bind:this={listModeSelect}
          pill
          on:sl-change={(e) => {
            store.setUIprops({sessionListMode: e.target.value})
          }}
        >
        <sl-option value="">List</sl-option>
        <sl-option value="detail">List: Detail</sl-option>
        <sl-option value="grid-time">Grid: Time</sl-option>
        <sl-option value="grid-space">Grid: Space</sl-option>

        </sl-select>
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
    <span class="notice">Error fetching the sessions: {error}.</span>
  {:else if $sessions.length === 0}
    <span class="notice">No sessions found.</span>
  {:else}
    {#if $uiProps.sessionListMode == SessionListMode.List || $uiProps.sessionListMode == SessionListMode.ListDetail}
      {#each $sessions.filter(s=> (!s.record.entry.trashed || showDeletedSessions) && store.filterSession(s, $uiProps.sessionsFilter)).sort(sortSessions) as session}
        <div class="session">
          <SessionSummary 
            showTags={true}
            showSlot={true}
            showLeaderAvatar={$uiProps.sessionListMode == "detail"}
            showDescription={$uiProps.sessionListMode == "detail"}
            allowSetIntention={$settings.session_types[session.record.entry.session_type].can_rsvp} 
            session={session}>
          </SessionSummary>
        </div>
      {/each}
    {:else}
      {#if $uiProps.sessionListMode==SessionListMode.GridTime}
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

  .pane-content {
    padding-top: 0;
  }

  .background {
    width: 100%;
    transition: all .25s ease;
    padding: 0;
  }

  .sensemaking-game {
    max-width: 720px;
    margin: 0 auto;
    background-color: white;
    border-radius: 0;
    margin-bottom: 10px;
    width: 100%;
    margin-top: 0;
  }

.empty {
  background-color: white;
  outline: solid 1px lightgray;
}
:global(.notice) {
  display: block;
  text-align: center;
  padding: 25px;
}

.spacer {
  height: 0px;
  margin-bottom: 30px;
  width: 100%;
  display: none;
  transition: all .25s ease;
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
  padding: 5px;
  line-height: 18px;
  outline: solid 1px lightgray;
  background-color: white;
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
 td  {
  width: 200px;
 }
 .left-sticky {
  width:200px;
  position: sticky;
  left: 0;
 }
 .top-sticky {
  position: sticky;
  top: 0;
 }

 .schedule-slot {
  border-left: 1px dashed rgba(0,0,0,.2);
  border-bottom: 1px solid rgba(0,0,0,.3);
  border-right:none;
  outline: none;
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

 sl-select {
  max-width: 70px;
 }

 .search-bar {
    max-width: 720px;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 0;
  }

  .search-bar .search-input {
    position:absolute;
    bottom: -60px;
    left: -10px;
    padding: 10px;
    background-color: white;
    border-radius: 0 0 5px 5px;
    box-shadow: 0px 10px 15px rgba(0, 0, 0, .15);
    z-index: 10;
  }

  .search-input {
    display: none;
  }

  .show-search {
    display: block;
  }

  .search-icon {
    margin-right: 0;
    border: 1px solid rgba(212, 212, 217, 1.0);
    background-color: white;
    height: 35px;
    width: 35px;
    display: flex;
    align-items: center;
    justify-content: center;;
    border-radius: 40px;
    z-index: 5;
  }

  .search-icon.selected {
    background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
  }

  .pill-button {
    background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
    min-height: 30px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 10px 15px rgba(0,0,0,.35);
    border-radius: 5px;
    padding: 0 10px;
    margin-right: 10px;
    cursor: pointer;
    font-size: 14px;
  }

  .pane-header {
    padding-top: 10px;
    position: sticky;
    margin-bottom: 10px;
    top: 0;
  }

  .pill-button span {
    color: white;
  }

  @media (min-width: 360px) {

    sl-select {
      max-width: 120px;
    }
  }


  @media (min-width: 560px) {
   .search-bar {
    flex-direction: row;
   }
   .search-bar .search-input {
      position: relative;
      top: 0;
      bottom: 0;
      bottom: 0;
      right: 0;
      box-shadow: none;
      left: 0;
      padding: 0;
    }
    .search-input sl-input::part(base),  .search-input sl-input::part(form-control),  .search-input sl-input::part(form-control-input) {
      border-radius: 30px;
      overflow: hidden;
    }
  }


@media (min-width: 720px) {
  .spacer {
    height: 50px;
    display: block;
  }
  .background {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(86, 94, 109, 0.05) 0%, rgba(86, 94, 109, 0.26) 100%);
    padding: 100px;
  }

  .search-bar .search-input {
    border-radius: 30px;
    box-shadow: 0px 10px 15px rgba(0, 0, 0, .15);
  }

  .section-controls sl-select {
    box-shadow: 0 10px 15px rgba(0,0,0,.15);
    border-radius: 100%;
    min-width: 130px;
  }
  .pill-button {
    position: sticky;
    top: 0;
  }

  .pane-content {
    padding-top: 15px;
  }
  
  .sensemaking-game {
    border-radius: 10px;
    margin-bottom: -50px;
    padding: 0;
    box-shadow: 0 10px 15px rgba(0,0,0,.15);
    margin-top: 0;
    border-bottom: 1px solid rgba(86, 94, 109, .6);
  }

  .pane-header {
    margin-top: 0;
    top: 40px;
    max-width: 100%;
    margin-bottom: 0;
  }
}
</style>