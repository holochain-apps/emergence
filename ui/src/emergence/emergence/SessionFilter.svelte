<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { faArrowRotateBack, faCheck, faClock, faClose, faMagnifyingGlass, faMap, faShapes, faTag } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { defaultSessionsFilter, type SessionsFilter } from './types';
import { fly } from 'svelte/transition';
import type { EmergenceStore } from '../../emergence-store';
import { storeContext } from '../../contexts';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client15';
  import { calcDays, dayToStr } from './utils';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
$: windows = store.timeWindows
$: days = calcDays($windows, "", defaultSessionsFilter()) 
$: settings = store.settings

const dispatch = createEventDispatcher();

export let filter: SessionsFilter
$: spaces = store.spaces

onMount(() => {
});
const toggleDayInFilter = (day:Date) => {
  const dayNum = day.getTime()
  const idx = filter.timeDays.indexOf(dayNum)
  if (idx < 0) {  
    filter.timeDays.push(dayNum)
  } else {
    filter.timeDays.splice(idx,1)
  }
  dispatch('update-filter', filter)
}
</script>
<div transition:fly={{ x: 300, duration: 500 }} class="filter-modal" style="display: flex; flex-direction: column">
  <div class="center-row" style="background-color:white;justify-content: space-between;border-bottom: 1px solid;">
    <h3>Filters</h3>
    <div style="display: flex; flex-direction: row; margin-bottom: 16px; ">
      <sl-button style="align-self:flex-end; margin-left: 8px; " on:click={() => { filter = defaultSessionsFilter(); dispatch('update-filter', filter) } } circle>
        <Fa icon={faArrowRotateBack} />
      </sl-button>
      <sl-button style="margin-left: 8px; " on:click={() => { dispatch('close-filter') } } circle>
        <Fa icon={faClose} />
      </sl-button>
    </div>
  </div>
  <div class="center-row" style="background-color:white;">
    <span style="margin-right: 10px"><Fa icon={faShapes} /></span>
    <div style="display: flex; flex-direction: column;">

      <div class="wrap-row" style="background-color:white;">
        {#each $settings.session_types as type, idx}
        <sl-checkbox 
        checked={filter.types & 1<<idx} 
          on:sl-change={e => { filter.types = e.target.checked ? filter.types | 1<<idx : filter.types & ~(1<<idx) ; dispatch('update-filter', filter)} }>{type.name}</sl-checkbox>
        {/each}
      </div>
    </div>
  </div>
  <div class="center-row" style="background-color:white;">
    <span style="margin-right: 10px"><Fa icon={faClock} /></span>
    <div style="display: flex; flex-direction: column;">
      <div class="wrap-row">
        <sl-checkbox checked={filter.timeNow} on:sl-change={e => { filter.timeNow = e.target.checked ; dispatch('update-filter', filter)} }>Now</sl-checkbox>
        <sl-checkbox checked={filter.timeToday} on:sl-change={e => { filter.timeToday = e.target.checked ; dispatch('update-filter', filter)} }>Today</sl-checkbox>
        <sl-checkbox checked={filter.timeNext} on:sl-change={e => { filter.timeNext = e.target.checked; dispatch('update-filter', filter)} }>Next</sl-checkbox>
        <sl-checkbox checked={filter.timePast} on:sl-change={e => { filter.timePast = e.target.checked; dispatch('update-filter', filter)} }>Past</sl-checkbox>
        <sl-checkbox checked={filter.timeFuture} on:sl-change={e => { filter.timeFuture = e.target.checked; dispatch('update-filter', filter)} }>Future</sl-checkbox>
        <sl-checkbox checked={filter.timeUnscheduled} on:sl-change={e => { filter.timeUnscheduled = e.target.checked; dispatch('update-filter', filter)} }>Unscheduled</sl-checkbox>
      </div>
      <div class="wrap-row" style="background-color:white;">
        {#each days as day}
          <sl-checkbox checked={filter.timeDays.includes(day.getTime())} on:sl-change={e => { toggleDayInFilter(day)} }>{dayToStr(day)}</sl-checkbox>
        {/each}
      </div>
    </div>
  </div>
  <div class="center-row" style="background-color:white;">
    <span style="margin-right: 10px"><Fa icon={faCheck} /></span>
    <div class="wrap-row">
      <sl-checkbox checked={filter.involvementLeading} on:sl-change={e => { filter.involvementLeading = e.target.checked; dispatch('update-filter', filter)} }>Leading</sl-checkbox>
      <sl-checkbox checked={filter.involvementGoing} on:sl-change={e => { filter.involvementGoing = e.target.checked; dispatch('update-filter', filter)} }>Going</sl-checkbox>
      <sl-checkbox checked={filter.involvementInterested} on:sl-change={e => { filter.involvementInterested = e.target.checked; dispatch('update-filter', filter)} }>Interested</sl-checkbox>
      <sl-checkbox checked={filter.involvementHidden} on:sl-change={e => { filter.involvementHidden = e.target.checked; dispatch('update-filter', filter)} }>Hidden</sl-checkbox>
      <sl-checkbox checked={filter.involvementNoOpinion} on:sl-change={e => { filter.involvementNoOpinion = e.target.checked; dispatch('update-filter', filter)} }>No Opinion</sl-checkbox>
    </div>
    </div>
  <div class="center-row">
    <span style="margin-right: 10px"><Fa icon={faTag} /></span>
    <sl-input
      placeholder="comma separated tags"
      value={filter.tags.join(", ")}
      on:input={e => { filter.tags = e.target.value.split(/,\W*/).filter((w)=>w); console.log(filter.tags); dispatch('update-filter', filter)} }
    ></sl-input>
  </div> 
  <!-- <div class="center-row">
    <span style="margin-right: 4px"><Fa icon={faMagnifyingGlass} /></span>
      <sl-input
      placeholder="search text"
      value={filter.keyword}
      on:input={e => { filter.keyword = e.target.value; ; dispatch('update-filter', filter)} }
    ></sl-input>
  </div> -->
  <div class="center-row">
    <span style="margin-right: 10px"><Fa icon={faMap} /></span>
    <sl-select style="min-width:100px" multiple clearable
      value={filter.space.map(h=>encodeHashToBase64(h))}
      placeholder="filter by spaces"
      on:sl-change={(e)=>{filter.space = e.target.value.map(h => decodeHashFromBase64(h)); dispatch('update-filter', filter)}}
      >
      {#each $spaces as space}
      <sl-option value={encodeHashToBase64(space.original_hash)}>{space.record.entry.name} ({space.record.entry.key})</sl-option>
      {/each}
    </sl-select>
  </div>
  </div>
<style>
  sl-checkbox {
    margin-right: 10px;
  }
</style>