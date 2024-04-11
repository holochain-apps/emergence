<script lang="ts">
  import { onMount, getContext, createEventDispatcher } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import {  type Record, type ActionHash, encodeHashToBase64, decodeHashFromBase64} from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import {type Space, type TimeWindow, type Info, timeWindowDurationToStr, type Session, amenitiesList, Amenities, DetailsType, SpaceSortOrder, type InfoSession } from './types';
  import { calcDays, dayToStr, sortSlot, sortWindows, windowsInDay} from './utils'
  import CreateTimeWindow from './CreateTimeWindow.svelte';
  import Fa from 'svelte-fa';
  import { faCalendarPlus, faTrash, faCircleArrowLeft, faArrowsUpDownLeftRight } from '@fortawesome/free-solid-svg-icons';
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import SessionSummary from './SessionSummary.svelte';
  import { HoloHashMap } from '@holochain-open-dev/utils';
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import SessionFilterCtrls from './SessionFilterCtrls.svelte';
  import SessionFilter from './SessionFilter.svelte';
  import SpaceLink from './SpaceLink.svelte';
  import Confirm from './Confirm.svelte';

  const dispatch = createEventDispatcher();

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;
  let creatingTimeWindow = false
  let slotType: string 
  $: slotType
  $: uiProps = store.uiProps

  $: loading, error, creatingTimeWindow;
  $: allSpaces = store.spaces
  $: filteredSpaces = filterSpaces($allSpaces, slotType)
  $: allWindows = store.timeWindows
  $: filteredWindows = filterWindows($allWindows, slotType)

  $: days = calcDays(filteredWindows, slotType, $uiProps.sessionsFilter) 
  $: sessions = store.sessions
  $: projection = store.sessionInterestProjection($sessions)

  let selectedSessions:HoloHashMap<ActionHash,boolean> = new HoloHashMap()
  let selectedSpaceIdx: number|undefined = undefined
  let selectedWindow: TimeWindow|undefined = undefined

  $: selectedSessions, selectedSpaceIdx, selectedWindow

  const filterSpaces = (spaces: Array<Info<Space>>, type: string) => {
    if (type) { 
      return spaces.filter(s=>s.record.entry.tags.includes(type))
    }
    return spaces
  }

  const filterWindows = (windows: Array<TimeWindow>, type: string) => {
    if (type) { 
      return windows.filter(w=>w.tags.includes(type))
    }
    return windows
  }


  onMount(async () => {
    const currentMap = store.getCurrentSiteMap()
    if (currentMap && slotTypeFilterSelect) {
      slotTypeFilterSelect.value = currentMap.record.entry.tags[0]
    }
    loading = false
  });

  const sortSpaceKey= (a,b)=> {
        if (b.record.entry.key > a.record.entry.key) {
            return -1;
        }
        if (a.record.entry.key > b.record.entry.key) {
            return 1;
        }
        return 0;
      }
  const sortSpaceCapacity = (a,b) => {
    return b.record.entry.capacity - a.record.entry.capacity
  }

  const selectSpace = (idx, space) => {
    selectedSessions = new HoloHashMap()
    selectedWindow = undefined

    if (selectedSpaceIdx !== idx) {
      filteredWindows.forEach(window=>{
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
      filteredSpaces.forEach(space=>{
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
    const sessions = store.sessionsInSpace(window, space)
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
  let draggedSession : InfoSession | undefined
  $: draggedAmenitiesCount =  draggedItemId ? amenitiesList(draggedSession.record.entry.amenities).length : 0
  $: draggedSession, draggedItemId
  $: overlappingAmenities = (space: Info<Space>) => {
    if (!draggedItemId) return undefined
    const overlapping =  draggedItemId && draggedSession.record.entry.amenities & space.record.entry.amenities
    return amenitiesList(overlapping)
  }
  let dragOn = true
  let dragTarget = ""
  let mergeTarget = ""

  function handleDragStart(e) {
    draggingHandled = false
    // console.log("handleDragStart", e)
    draggedItemId = e.target.getAttribute('id')
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer
      .setData("text", e.target.getAttribute('id'));
      draggedSession = store.getSession(decodeHashFromBase64(draggedItemId))
  }

  function handleDragEnd(e) {
    // console.log("handleDragEnd", e)
    clearDrag()
  }
  let orphanCount = 0
  function handleDragEnterOrphan(e) {
    if (!draggedItemId) return

    orphanCount+=1
    dragTarget="orphan"
  }
  function handleDragLeaveOrphan(e) {
    if (!draggedItemId) return

    orphanCount-=1
    if (orphanCount == 0)
      dragTarget=""
  }

  async function handleDragDropOrphan(e:DragEvent) {
    e.preventDefault();
    if (draggedItemId) {
      const sessionHash = decodeHashFromBase64(draggedItemId)
      await store.unslot(sessionHash)
    }
    clearDrag()

  }

  function handleDragEnter(e) {
    if (!draggedItemId) return
    const target = e.target as HTMLElement
    const elem = findDropSlotParentElement(target)
    if (!elem.classList.contains("excluded")) {
      dragTarget = elem ? elem.id : ""
      if (target.id.startsWith("uhCk") && target.id != draggedItemId) {
        mergeTarget = target.id
      }
    }
  }

  function handleDragLeave(e) {
    const target = e.target as HTMLElement
    if (target.id == dragTarget) {
      dragTarget = ""
    }
    if (target.id == mergeTarget) {
      mergeTarget = ""
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
    if (!draggedItemId) {
      clearDrag()
      return
    }
    const target = e.target as HTMLElement
    const elem = findDropSlotParentElement(target)
    if (elem.classList.contains("excluded")) {
      clearDrag()
      return
    }

    if (target.id == mergeTarget) {
      mergeA = decodeHashFromBase64(mergeTarget)
      mergeB = decodeHashFromBase64(draggedItemId)
      confirmDialog.open()
      clearDrag()
      return
    }

    var srcId = e.dataTransfer.getData("text");

    const [windowJSON,idx] = elem.id.split("-")
    const space = filteredSpaces[parseInt(idx)]
    const slot = {window:JSON.parse(windowJSON), space:space.original_hash}
    const sessionHash = decodeHashFromBase64(srcId)

    const session = store.getSession(sessionHash)
    const sessionSlot = store.getSessionSlot(session)



    if (elem.id && (!sessionSlot || JSON.stringify(sessionSlot.window) != windowJSON) || encodeHashToBase64(slot.space) != encodeHashToBase64(sessionSlot.space)) {
      await store.slot(sessionHash, slot)
      allSpaces = store.spaces
    }
    if (selectedSpaceIdx) {
      const idx = selectedSpaceIdx
      selectedSpaceIdx = undefined
      selectSpace(idx, filteredSpaces[idx])
    }
    if (selectedWindow) {
      const window = selectedWindow
      selectedWindow = undefined
      selectWindow(window)
    }
    clearDrag()
  }
  const clearDrag = () => {
    draggingHandled = true
    draggedItemId = ""
    draggedSession = undefined
    dragTarget = ""
    mergeTarget = ""
    orphanCount = 0
  }
  let dragDuration = 300

  let bySpace = false

  
  const windowToolTip = (window) => {
    return `${timeWindowDurationToStr(window)} ${window.tags.length > 0 ? `slot types: ${window.tags.join(",")}`:""}`
  }
  const spaceToolTip = (space) => {
    return `${space.record.entry.tags.length > 0 ? `slot types: ${space.record.entry.tags.join(",")}`:""}`
  }
  const isExcluded = (window, space) : boolean => {
    if (window.tags.length === 0 && space.record.entry.tags.length > 0) return true
    if (window.tags.length > 0 && space.record.entry.tags.length === 0) return true
    if (window.tags.length > 0) {
      for (const wt of window.tags) {
        if (space.record.entry.tags.findIndex(st => st==wt)>=0) return false
      }
      return true
    }
    return false
  }

  const deleteWindow = async (window: TimeWindow) => {

    for (const s of $sessions.filter(s=>!s.record.entry.trashed)) {
      const slot = store.getSessionSlot(s)
      if ( slot && JSON.stringify(slot.window) == JSON.stringify(window)) {
        alert("Time window has scheduled sessions, can't delete! Please move the sessions first.")
        return
      }
    }
    await store.deleteTimeWindow(window)
    store.fetchTimeWindows()
  }
  let showFilter = false
  let confirmDialog
  let mergeA: ActionHash
  let mergeB: ActionHash

  const mergeSession = async () => {
    await store.mergeSessions(mergeA, mergeB )
  }
  let slotTypeFilterSelect
  let createTimeWindowDialog
</script>

<Confirm 
  bind:this={confirmDialog}
  message="Please confirm merge." 
  on:confirm-confirmed={mergeSession}></Confirm>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the wall: {error}.</span>
{:else}

{#if showFilter}
<SessionFilter
on:close-filter={()=>showFilter = false}
on:update-filter={(e)=>{store.setUIprops({sessionsFilter: e.detail})}}
filter={$uiProps.sessionsFilter}></SessionFilter>
{/if}

<div class="pane-header">
  <div >
    <sl-button style="margin-left: 8px; " on:click={() => { dispatch('slotting-close') } } circle>
      <Fa icon={faCircleArrowLeft} />
    </sl-button>
  </div>
  <div style="display:flex">
    <SessionFilterCtrls
      showKeywordCancel={true}
      on:toggle-filter={()=>{showFilter = !showFilter;}}
    ></SessionFilterCtrls>

    <sl-select style="margin-right: 5px;width: 200px;"
    bind:this={slotTypeFilterSelect}

    placeholder="Filter by Slot Type"
    on:sl-change={(e) => {slotType = e.target.value 

    }}
    pill
    clearable
    >
      <sl-option value={undefined}> None</sl-option>

      {#each store.getSlotTypeTags() as type}
        <sl-option value={type}> {type}</sl-option>
      {/each}
    </sl-select>
    <sl-select style="margin-right: 5px;width: 200px;"
    placeholder="Sort Spaces By"
    value={$uiProps.spaceSort}
    on:sl-change={(e) => {
      store.setUIprops({spaceSort:  e.target.value  })
    } }
    pill
    >
      <sl-option value={SpaceSortOrder.Key}>Key</sl-option>
      <sl-option value={SpaceSortOrder.Capacity}>Capacity</sl-option>
    </sl-select>
    {#if $uiProps.amSteward}
      <sl-button title="Create Time Slot" on:click={() => {creatingTimeWindow = true; createTimeWindowDialog.open() } } circle>
        <Fa icon={faCalendarPlus} color={$allWindows.length == 0 ? "red" :"black"}/>
      </sl-button>
    {/if}
    <sl-button title="Flip Display Axis" on:click={() => {bySpace = !bySpace } } circle>
      <Fa icon={faArrowsUpDownLeftRight} />
    </sl-button>
  </div>
</div>
  <div class="pane-content pane-desktop">


      <CreateTimeWindow 
        bind:this={createTimeWindowDialog}
        on:timeWindow-created={()=>creatingTimeWindow=false}
        on:close-create-timeWindow={()=>creatingTimeWindow=false}>
      </CreateTimeWindow>

    <div class="sections">

      <div class="orphans"
        class:glowing={dragTarget == "orphan"}
        on:dragenter={handleDragEnterOrphan} 
        on:dragleave={handleDragLeaveOrphan}  
        on:drop={handleDragDropOrphan}  
        on:dragover={handleDragOver}          

      >
        <div><strong>Orphan Sessions</strong></div>
        {#each projection.interestData.filter((d)=>!store.getSessionSlot(d.session)) as d}
          <div
            id={encodeHashToBase64(d.session.original_hash)}
            class="orphaned-session"
            class:tilted={draggedItemId == encodeHashToBase64(d.session.original_hash)}
            draggable={dragOn}
            on:dragstart={handleDragStart}
            on:dragend={handleDragEnd}              
          > 
            <div 
            on:dragenter={handleDragEnterOrphan} 
            on:dragleave={handleDragLeaveOrphan}  >
            <SessionSummary 
              showAmenities={true}
              session={d.session}
              extra={`Est. Att.: ${d.estimatedAttendance.toFixed(0)}`}
              >
            </SessionSummary>
            </div>
          </div>
        {/each}

      </div>

      <div class="schedule-grid">
        {#if bySpace}
        <table style="">
          <th class="empty"></th>
          {#each filteredSpaces.sort($uiProps.spaceSort == SpaceSortOrder.Key ? sortSpaceKey : sortSpaceCapacity) as space, idx}
            <th class="space-title"
              class:selected={selectedSpaceIdx ==  idx}
              class:tagged={space.record.entry.tags.length > 0}
              class:amo-bad={draggedAmenitiesCount > 0 && overlappingAmenities(space).length == 0}
              class:amo-ok={draggedAmenitiesCount > 0 && overlappingAmenities(space).length == draggedAmenitiesCount}
              class:amo-warn={draggedAmenitiesCount > 0 && overlappingAmenities(space).length < draggedAmenitiesCount }
              title={spaceToolTip(space)}
              on:click={(e)=>{selectSpace(idx, space); e.stopPropagation()}}>
                <SpaceLink spaceHash={space.original_hash}></SpaceLink>
                {#if space.record.entry.pic}
                 <div class="space-pic">
                    <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
                  </div>
                {/if}
                {#if overlappingAmenities(space)&&false}
                  {overlappingAmenities(space).join(", ")}
                {/if}
            </th>
          {/each}
          {#each days as day}
            <tr>
              <td class="day" colspan="{filteredSpaces.length+1}" >{day.toDateString()}</td>
            </tr>
            {#each windowsInDay(filteredWindows, day, slotType).sort(sortWindows) as window}
            <tr>
              <td class="time-title"
                class:tagged={window.tags.length > 0}
                class:selected={JSON.stringify(selectedWindow) ==  JSON.stringify(window)}
                title={windowToolTip(window)}
                on:click={(e)=>{selectWindow(window); e.stopPropagation()}}
              >
                
                  {new Date(window.start).toTimeString().slice(0,5)}
                  {#if $uiProps.amSteward}
                    <sl-button class="trash" style="margin-left: 4px;" on:click={(e)=>{deleteWindow(window);e.stopPropagation()}} circle>
                      <Fa icon={faTrash} />
                    </sl-button>
                  {/if}
              </td>
              {#each filteredSpaces.sort($uiProps.spaceSort == SpaceSortOrder.Key ? sortSpaceKey : sortSpaceCapacity) as space, idx}
                <td 
                  id={`${JSON.stringify(window)}-${idx}}`}
                  class="schedule-slot"
                  class:glowing={dragTarget == `${JSON.stringify(window)}-${idx}}`}
                  class:selected={selectedSpaceIdx ==  idx  || JSON.stringify(selectedWindow) ==  JSON.stringify(window) || store.sessionsInSpace(window, space).find(s=>selectedSessions.get(s.record.actionHash))}

                  on:dragenter={handleDragEnter} 
                  on:dragleave={handleDragLeave}  
                  on:drop={handleDragDropSession}
                  on:dragover={handleDragOver}          
                >
                  {#each store.sessionsInSpace(window, space) as session}
                    <div class="slotted-session"
                    id={encodeHashToBase64(session.original_hash)}
                    class:tilted={draggedItemId == encodeHashToBase64(session.original_hash)}
                    class:mergable={mergeTarget == encodeHashToBase64(session.original_hash)}
                    on:dblclick={(e)=>{e.stopPropagation();store.openDetails(DetailsType.Session, session.original_hash)}}
                    draggable={dragOn}
                    on:dragstart={handleDragStart}
                    on:dragend={handleDragEnd}
                    on:dragenter={handleDragEnter} 
                    on:dragleave={handleDragLeave}  
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
        {:else}
        <table>
          <tr>
            <th class="empty"></th>
            {#each days as day}
            <th style="text-align:left" colspan="{windowsInDay(filteredWindows, day, slotType).length+1}">{dayToStr(day)}</th>

            {/each}
          </tr>
          <tr>
          <th class="empty"></th>

          {#each days as day}
            <th style=""></th>
            {#each windowsInDay(filteredWindows, day, slotType).sort(sortWindows) as window}
              <th class="time-title"
                class:selected={JSON.stringify(selectedWindow) ==  JSON.stringify(window)}
                class:tagged={window.tags.length > 0}
                title={windowToolTip(window)}
                on:click={(e)=>{selectWindow(window); e.stopPropagation()}}
              >
    
                {new Date(window.start).toTimeString().slice(0,5)}
                {#if $uiProps.amSteward}
                  <sl-button class="trash" style="margin-left: 4px;" on:click={(e)=>{deleteWindow(window);e.stopPropagation()}} circle>
                    <Fa icon={faTrash} />
                  </sl-button>
                {/if}

              </th>
            
            {/each}
          {/each}
          </tr>
          {#each filteredSpaces.sort($uiProps.spaceSort == SpaceSortOrder.Key ? sortSpaceKey : sortSpaceCapacity) as space, idx}
          <tr>
            <td class="space-title"
              class:selected={selectedSpaceIdx ==  idx}
              class:tagged={space.record.entry.tags.length > 0}
              class:amo-bad={draggedAmenitiesCount > 0 && overlappingAmenities(space).length == 0}
              class:amo-ok={draggedAmenitiesCount > 0 && overlappingAmenities(space).length == draggedAmenitiesCount}
              class:amo-warn={draggedAmenitiesCount > 0 && overlappingAmenities(space).length < draggedAmenitiesCount }
              title={spaceToolTip(space)}
              on:click={(e)=>{selectSpace(idx, space); e.stopPropagation()}}>
                <SpaceLink spaceHash={space.original_hash}></SpaceLink>
    
                {#if space.record.entry.pic}
                  <div class="space-pic">
                    <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
                  </div>
                {/if}
                {#if overlappingAmenities(space) && false}
                  {overlappingAmenities(space).join(", ")}
                {/if}
            </td>

            {#each days as day}
              <td class="empty"></td>

              {#each filteredWindows.filter(w=>{
                  // @ts-ignore
                  return new Date(w.start).toDateString()  == day.toDateString()
                }).sort(sortWindows) as window}
                <td 
                  id={`${JSON.stringify(window)}-${idx}}`}
                  class="schedule-slot"
                  class:glowing={dragTarget == `${JSON.stringify(window)}-${idx}}`}
                  class:excluded={isExcluded(window, space)}
                  class:selected={selectedSpaceIdx ==  idx  || JSON.stringify(selectedWindow) ==  JSON.stringify(window) || store.sessionsInSpace(window, space).find(s=>selectedSessions.get(s.record.actionHash))}

                  on:dragenter={handleDragEnter} 
                  on:dragleave={handleDragLeave}  
                  on:drop={handleDragDropSession}
                  on:dragover={handleDragOver}          
                >
                  {#each store.sessionsInSpace(window, space) as session}
                    <div class="slotted-session"
                    id={encodeHashToBase64(session.original_hash)}
                    class:tilted={draggedItemId == encodeHashToBase64(session.original_hash)}
                    class:mergable={mergeTarget == encodeHashToBase64(session.original_hash)}
                    on:dblclick={(e)=>{e.stopPropagation();store.openDetails(DetailsType.Session, session.original_hash)}}
                    draggable={dragOn}
                    on:dragstart={handleDragStart}
                    on:dragend={handleDragEnd}
                    on:dragenter={handleDragEnter} 
                    on:dragleave={handleDragLeave}  
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
      </div>

      <div class="selected-sessions">
        <div><strong>Selected</strong></div>
        {#each $sessions.filter((s)=>!s.record.entry.trashed && selectedSessions.get(s.record.actionHash))
          .sort((a,b)=> {return sortSlot(store.getSessionSlot(a), store.getSessionSlot(b))}) as session}
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
  padding: 10px;
 }
 .orphaned-session {
  margin-bottom: 8px;
 }
 .schedule-grid {
  flex: 2;
  margin: 5px;
 }
 .space-title {
  padding: 10px;
  line-height: 18px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0,0,0,.3);
 }
 .time-title {
  cursor: pointer;
 }

 .day {
  font-size: 18px;
 }

 .time-title .trash {
  display: none;
 }

 .time-title:hover .trash {
  display: block;
 }

 .schedule-slot {
  border-left: 1px dashed rgba(0,0,0,.2);
  border-bottom: 1px solid rgba(0,0,0,.3);
  border-right:none;
  outline: none;
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
 .tagged {
  background-color: white;
 }
 .excluded {
  background: repeating-linear-gradient(
    45deg,
  rgba(0, 0, 0, 0.05),
  rgba(0, 0, 0, 0.05) 10px,
  rgba(0, 0, 0, 0.1) 10px,
  rgba(0, 0, 0, 0.1) 20px
    );
 }
 .tilted {
    transform: rotate(3deg);
    box-shadow: 6px 6px 10px rgba(0, 0, 0, 0.5) !important;
  }
.glowing {
  outline: none;
  border-color: #9ecaed;
  box-shadow: 0 0 10px #9ecaed !important;
  background-color: green;
}

.modal.create-slot {
  width: 300px;
  z-index: 100;
}

.mergable {
  background-color: aqua;
}
.amo-warn {
  background-color: lightgoldenrodyellow;
}
.amo-ok {
  background-color: lightgreen;
}
.amo-bad {
  background-color: lightcoral;
}
</style>
