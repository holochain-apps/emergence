<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { timeWindowDurationToStr, timeWindowStartToStr, type Space, type TimeWindow, type Info } from './types';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;
  let days: Array<Date> = []

  $: loading, error, days;
  $: spaces = store.spaces
  $: windows = store.timeWindows
  onMount(async () => {
    const dayStrings = {}
    
    $windows.forEach(w=>dayStrings[new Date(w.start).toDateString()] = new Date(w.start))
    Object.values(dayStrings).forEach((d:Date)=>days.push(d))
    days.sort()
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
  {#each days.sort() as day}
    {day.toDateString()}
    <div style="display:grid; grid-template-columns:repeat({$spaces.length+1},1fr); ">
      <div class="space-title"></div>
      {#each $spaces as space}
        <div class="space-title">
        {space.record.entry.name}
        </div>
      {/each}
      {#each $windows.filter(w=>{
        // @ts-ignore
        return new Date(w.start).toDateString()  == day.toDateString()
      }).sort(sortWindows) as window}
        <div class="time-title">{timeWindowStartToStr(window)} for {timeWindowDurationToStr(window)}</div>
        {#each $spaces as space}
          <div class="scheduled-items">
            {sessionsInSpace(window, space)}
          </div>
        {/each}
      {/each}
    </div>
  {/each}
{/if}
<style>
 .space-title {
  border: solid 1px
 }
 .time-title {
  border: solid 1px
 }
</style>
