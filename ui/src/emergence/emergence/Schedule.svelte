<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import {type Space, type TimeWindow, type Info, timeWindowDurationToStr } from './types';
  import CreateTimeWindow from './CreateTimeWindow.svelte';
  import Fa from 'svelte-fa';
  import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons';
  import TimeWindowSummary from './TimeWindowSummary.svelte';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;
  let creatingTimeWindow = false

  $: loading, error, creatingTimeWindow;
  $: spaces = store.spaces
  $: windows = store.timeWindows
  $: days = calcDays($windows) 

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
  const sessionsInSpace = (window: TimeWindow, space: Info<Space>) => {
    const jsonWindow = JSON.stringify(window)
    const rel = space.relations.find(r=>r.content.data === jsonWindow)
    if (rel) {
      const session = store.getSession(rel.dst)
      if (session) {
        return session.record.entry.title
      }
    }
    return ""
  }
  // @ts-ignore
  const sortWindows = (a,b) : number => {return new Date(a.start) - new Date(b.start)}
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
    <div style="display:grid; grid-template-columns:repeat({$spaces.length+1},1fr); ">
      <div class="empty"></div>
      {#each $spaces as space}
        <div class="space-title">
        {space.record.entry.name}
        </div>
      {/each}
      {#each days as day}
      <div style="grid-column-start:0; grid-column-end: span {$spaces.length+1}">{day.toDateString()}</div>


          {#each $windows.filter(w=>{
            // @ts-ignore
            return new Date(w.start).toDateString()  == day.toDateString()
          }).sort(sortWindows) as window}
            <div class="time-title" title={timeWindowDurationToStr(window)}>{new Date(window.start).toTimeString().slice(0,5)}</div>
            {#each $spaces as space}
              <div class="scheduled-items">
                {sessionsInSpace(window, space)}
              </div>
            {/each}
          {/each}
      {/each}
  </div>
  </div>
  {/if}
<style>
 .space-title {
  outline: solid 1px
 }
 .time-title {
  outline: solid 1px;
  cursor: pointer;
 }
 .scheduled-items {
  outline: solid 1px;
 }
</style>
