<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { type EntryHash, type Record, type AgentPubKey, type ActionHash, type AppAgentClient, type NewEntryAction, encodeHashToBase64, type ActionHashB64, decodeHashFromBase64, type Timestamp } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import {type Space, type TimeWindow, type Info, timeWindowDurationToStr, type Session, type Slot, type RelationInfo, slotEqual } from './types';
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
  let selectedSpaceIdx: number|undefined = undefined
  let selectedWindow: TimeWindow|undefined = undefined

  $: selectedSessions, selectedSpaceIdx, selectedSessions, selectedWindow
  $: sessionsInSpace

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
    let rel = space.relations.filter(r=>r.relation.content.path == "space.sessions")
    const sessions: HoloHashMap<ActionHash, Info<Session>> = new HoloHashMap
    rel.forEach(r=> {
      const session = store.getSession(r.relation.dst)
      const slot = store.getSessionSlot(session)
      if (slotEqual({window,space:space.original_hash}, slot)) {
        sessions.set(session.original_hash, session)
      }
    })
    return Array.from(sessions.values())
  }
  // @ts-ignore
  const sortWindows = (a,b) : number => {return new Date(a.start) - new Date(b.start)}

  const selectSpace = (idx, space) => {
    selectedSessions = new HoloHashMap()
    selectedWindow = undefined

    if (selectedSpaceIdx !== idx) {
      $windows.forEach(window=>{
        selectSessions(window,space)
      })
      selectedSpaceIdx = idx
    } else {
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


  let draggingHandled = true
  let draggedItemId = ""
  let dragOn = true
  let dragTarget = ""
  function handleDragStart(e) {
    draggingHandled = false
    //console.log("handleDragStart", e)
    e.dataTransfer.dropEffect = "move";
    draggedItemId = e.target.getAttribute('id')
    e.dataTransfer
      .setData("text", e.target.getAttribute('id'));
  }
  function handleDragEnd(e) {
    clearDrag()
    //console.log("handleDragEnd",e )
  }

  function handleDragEnter(e) {
    const elem = findDropSlotParentElement(e.target as HTMLElement)
    dragTarget = elem ? elem.id : ""
  }

  function handleDragLeave(e) {
    const target = e.target as HTMLElement
    if (target.id == dragTarget) {
      dragTarget = ""
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  const findDropSlotParentElement = (element: HTMLElement):HTMLElement => {
    while (element && !element.classList.contains("schedule-slot")) {
      element = element.parentElement
    }
    return element
  }

  async function handleDragDropSession(e:DragEvent) {
    e.preventDefault();
    const target = findDropSlotParentElement(e.target as HTMLElement)
    var srcId = e.dataTransfer.getData("text");

    const [windowJSON,idx] = target.id.split("-")
    const space = $spaces[parseInt(idx)]
    const slot = {window:JSON.parse(windowJSON), space:space.original_hash}
    const sessionHash = decodeHashFromBase64(srcId)

    const session = store.getSession(sessionHash)
    const sessionSlot = store.getSessionSlot(session)
    if (target.id && (!sessionSlot || JSON.stringify(sessionSlot.window) != windowJSON) || encodeHashToBase64(slot.space) != encodeHashToBase64(sessionSlot.space)) {
      await store.slot(sessionHash, slot)
      spaces = store.spaces
    }
    clearDrag()
  }
  const clearDrag = () => {
    draggingHandled = true
    draggedItemId = ""
    dragTarget = ""
  }
  let dragDuration = 300

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
          <div
            id={encodeHashToBase64(session.original_hash)}
            class="orphaned-session"
            class:tilted={draggedItemId == encodeHashToBase64(session.original_hash)}
            draggable={dragOn}
            on:dragstart={handleDragStart}
            on:dragend={handleDragEnd}              
          >
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
            <div class="space-title"
              class:selected={selectedSpaceIdx ==  idx}
              on:click={(e)=>{selectSpace(idx, space); e.stopPropagation()}}>
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
              <div class="time-title"
                class:selected={JSON.stringify(selectedWindow) ==  JSON.stringify(window)}
                title={timeWindowDurationToStr(window)}
                on:click={(e)=>{selectWindow(window); e.stopPropagation()}}
              >{new Date(window.start).toTimeString().slice(0,5)}
               
              </div>
              {#each $spaces as space, idx}
                <div 
                  id={`${JSON.stringify(window)}-${idx}}`}
                  class="schedule-slot"
                  class:glowing={dragTarget == `${JSON.stringify(window)}-${idx}}`}
                  class:selected={selectedSpaceIdx ==  idx  || JSON.stringify(selectedWindow) ==  JSON.stringify(window) || sessionsInSpace(window, space).find(s=>selectedSessions.get(s.record.actionHash))}

                  on:dragenter={handleDragEnter} 
                  on:dragleave={handleDragLeave}  
                  on:drop={handleDragDropSession}
                  on:dragover={handleDragOver}          
                  on:click={(e)=>{selectSlot(window, space); e.stopPropagation()}}
                >
                  {#each sessionsInSpace(window, space) as session}
                    <div class="slotted-session"
                    id={encodeHashToBase64(session.original_hash)}
                    class:tilted={draggedItemId == encodeHashToBase64(session.original_hash)}
                    draggable={dragOn}
                    on:dragstart={handleDragStart}
                    on:dragend={handleDragEnd}              
                    >
                      {session.record.entry.title}
                    </div>
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
 .orphaned-session {
  margin-bottom: 8px;
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
 .schedule-slot {
  outline: solid 1px;
  cursor: pointer;
 }
 .slotted-session {
  background-color: lightgreen;
  display: inline-block;
  padding: 3px;
  border: dotted 1px blue;
  border-radius: 5px;
  margin: 3px;
 }
 .selected {
  background-color: lightblue;
 }
 .tilted {
    transform: rotate(3deg);
    box-shadow: 6px 6px 10px rgba(0, 0, 0, 0.5) !important;
  }
.glowing {
  outline: none;
  border-color: #9ecaed;
  box-shadow: 0 0 10px #9ecaed !important;
}

</style>
