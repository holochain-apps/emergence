<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { type EntryHash, type Record, type AgentPubKey, type ActionHash, type AppAgentClient, type NewEntryAction, encodeHashToBase64, type ActionHashB64 } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import {type Space, type TimeWindow, type Info, timeWindowDurationToStr, type Session } from './types';
  import CreateTimeWindow from './CreateTimeWindow.svelte';
  import Fa from 'svelte-fa';
  import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import SessionSummary from './SessionSummary.svelte';
  import { HoloHashMap } from '@holochain-open-dev/utils';
  import SpaceCrud from './SpaceCrud.svelte';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;
  let creatingTimeWindow = false

  $: loading, error, creatingTimeWindow;
  $: spaces = store.spaces
  $: windows = store.timeWindows
  $: days = calcDays($windows) 
  $: sessions = store.sessions

  let selectedSessions:HoloHashMap<ActionHash,boolean> = new HoloHashMap()
  // let selectedSpace: ActionHashB64|undefined = undefined
  let selectedSpaceIdx: number|undefined = undefined
  let selectedWindow: TimeWindow|undefined = undefined

  $: selectedSessions, selectedSpaceIdx, selectedSessions, selectedWindow

  const calcDays = (windows): Array<Date> => {
    const days = []
    const dayStrings = {}
    
    windows.forEach(w=>dayStrings[new Date(w.start).toDateString()] = new Date(w.start))
    Object.values(dayStrings).forEach((d:Date)=>days.push(d))
    days.sort((a,b)=> a-b)
    return days
  }

  onMount(async () => {
    loading = false
  });
  const sessionsInSpace = (window: TimeWindow, space: Info<Space>) : Array<Info<Session>> | undefined => {
    const jsonWindow = JSON.stringify(window)
    const rel = space.relations.find(r=>r.content.data === jsonWindow)
    if (rel) {
      const session = store.getSession(rel.dst)
      if (session) {
        return [session]
      }
    }
    return []
  }
  // @ts-ignore
  const sortWindows = (a,b) : number => {return new Date(a.start) - new Date(b.start)}

  const selectSpace = (idx, space) => {
    selectedSessions = new HoloHashMap()
    selectedWindow = undefined

    if (selectedSpaceIdx !== idx) {
      // selectedSpace = encodeHashToBase64(space.record.actionHash)
      $windows.forEach(window=>{
        selectSessions(window,space)
      })
      selectedSpaceIdx = idx
    } else {
      // selectedSpace = undefined
      selectedSpaceIdx = undefined
    }
  }

  const selectWindow = (window) => {
    selectedSessions = new HoloHashMap()
    selectedSpaceIdx = undefined

    if (JSON.stringify(window) !== JSON.stringify(selectedWindow)) {
      $spaces.forEach(space=>{
        selectSessions(window, space)
      })
      selectedWindow = window
    } else {
      selectedWindow = undefined
    }

  }

  const selectSlot = (window: TimeWindow, space: Info<Space>) => {
    selectedSessions = new HoloHashMap()
    selectedWindow = undefined
    selectedSpaceIdx = undefined
    selectSessions(window, space)
  }


  const selectSessions = (window: TimeWindow, space: Info<Space>) => {
    const sessions = sessionsInSpace(window, space)
    sessions.forEach(s=>{
      if (selectedSessions.get(s.record.actionHash)) {
        selectedSessions.delete(s.record.actionHash)
      } else {
        selectedSessions.set(s.record.actionHash, true)
      }
      selectedSessions = selectedSessions

    })
  }
</script>
{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the wall: {error.data.data}.</span>
{:else}
  <div class="pane-content">
    <div class="pane-header">
      <h3>Schedule</h3>
      <sl-button on:click={() => {creatingTimeWindow = true; } } circle>
        <Fa icon={faCalendarPlus} />
      </sl-button>
      </div>

    {#if creatingTimeWindow}
    <div class="modal">
      <CreateTimeWindow on:timeWindow-created={()=>creatingTimeWindow=false}></CreateTimeWindow>
    </div>
    {/if}

    <div class="sections">

      <div class="orphans">
        <div><strong>Orphan Sessions</strong></div>
        {#each $sessions.filter((s)=>!store.getSessionSlot(s)) as session}
          <div style="margin-bottom: 8px;">
            <SessionSummary 
              showAmenities={true}
              session={session}>
            </SessionSummary>
          </div>
        {/each}

      </div>

      <div class="schedule-grid">
        <div style="display:grid; grid-template-columns:repeat({$spaces.length+1},1fr); ">
          <div class="empty"></div>
          {#each $spaces as space, idx}
            <div class="space-title {selectedSpaceIdx ==  idx ? 'selected' : ''}" on:click={(e)=>{selectSpace(idx, space); e.stopPropagation()}}>
                {space.record.entry.name}
                {#if space.record.entry.pic}
                  <div class="space-pic">
                    <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
                  </div>
                {/if}
                </div>
          {/each}
          {#each days as day}
            <div style="grid-column-start:0; grid-column-end: span {$spaces.length+1}">{day.toDateString()}</div>

            {#each $windows.filter(w=>{
                // @ts-ignore
                return new Date(w.start).toDateString()  == day.toDateString()
              }).sort(sortWindows) as window}
              <div class="time-title {JSON.stringify(selectedWindow) ==  JSON.stringify(window) ? 'selected' : ''}" 
                title={timeWindowDurationToStr(window)}
                on:click={(e)=>{selectWindow(window); e.stopPropagation()}}
              >{new Date(window.start).toTimeString().slice(0,5)}
               
              </div>
              {#each $spaces as space, idx}
                <div class="scheduled-items  {selectedSpaceIdx ==  idx  || JSON.stringify(selectedWindow) ==  JSON.stringify(window) || sessionsInSpace(window, space).find(s=>selectedSessions.get(s.record.actionHash)) ? 'selected' : ''}"
                on:click={(e)=>{selectSlot(window, space); e.stopPropagation()}}
                >
                  {#each sessionsInSpace(window, space) as session}
                    {session.record.entry.title}
                  {/each}
                </div>
              {/each}
            {/each}
          {/each}
        </div>
      </div>

      <div class="selected-sessions">
        <div><strong>Selected</strong></div>
        {#each $sessions.filter((s)=>selectedSessions.get(s.record.actionHash)) as session}
          <div style="margin-bottom: 8px;">
            <SessionSummary 
              showAmenities={true}
              showSlot={true}
              session={session}>
            </SessionSummary>
          </div>
        {/each}

      </div>

    </div>


  </div>
  {/if}
<style>
 .sections {
  display:flex;
  flex-direction: row;
  }
 .orphans, .selected-sessions {
  display:flex;
  flex-direction: column;
  align-items: self-start;
  flex: 0;
  margin: 5px;  
 }
 .schedule-grid {
  flex: 2;
  margin: 5px;
 }
 .space-title {
  outline: solid 1px;
  cursor: pointer;
  width: 100%;
 }
 .time-title {
  outline: solid 1px;
  cursor: pointer;
 }
 .scheduled-items {
  outline: solid 1px;
  cursor: pointer;
 }
 .selected {
  background-color: lightblue;
 }
</style>
