<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { faArrowRotateBack, faClose } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { defaultSessionsFilter, type SessionsFilter } from './types';
import { fly } from 'svelte/transition';
import type { EmergenceStore } from '../../emergence-store';
import { storeContext } from '../../contexts';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

export let filter: SessionsFilter
$: spaces = store.spaces

onMount(() => {
});

</script>
<div transition:fly={{ x: 300, duration: 500 }} class="filter-modal" style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row; margin-bottom: 16px;     justify-content: space-between;border-bottom: 1px solid;">
    <h3>Filters</h3>
    <div style="display: flex; flex-direction: row; margin-bottom: 16px; ">
      <sl-button style="align-self:flex-end; margin-left: 8px; " size=small on:click={() => { filter = defaultSessionsFilter(); dispatch('update-filter', filter) } } circle>
        <Fa icon={faArrowRotateBack} />
      </sl-button>
      <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('close-filter') } } circle>
        <Fa icon={faClose} />
      </sl-button>
    </div>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 10px"><strong>Time:</strong></span>
    <sl-checkbox checked={filter.timeNow} on:sl-change={e => { filter.timeNow = e.target.checked ; dispatch('update-filter', filter)} }>Now</sl-checkbox>
    <sl-checkbox checked={filter.timeNext} on:sl-change={e => { filter.timeNext = e.target.checked; dispatch('update-filter', filter)} }>Next</sl-checkbox>
    <sl-checkbox checked={filter.timePast} on:sl-change={e => { filter.timePast = e.target.checked; dispatch('update-filter', filter)} }>Past</sl-checkbox>
    <sl-checkbox checked={filter.timeFuture} on:sl-change={e => { filter.timeFuture = e.target.checked; dispatch('update-filter', filter)} }>Future</sl-checkbox>
    <sl-checkbox checked={filter.timeUnscheduled} on:sl-change={e => { filter.timeUnscheduled = e.target.checked; dispatch('update-filter', filter)} }>Unscheduled</sl-checkbox>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 10px"><strong>Your Involvement:</strong></span>
    <sl-checkbox checked={filter.involvementLeading} on:sl-change={e => { filter.involvementLeading = e.target.checked; dispatch('update-filter', filter)} }>Leading</sl-checkbox>
    <sl-checkbox checked={filter.involvementGoing} on:sl-change={e => { filter.involvementGoing = e.target.checked; dispatch('update-filter', filter)} }>Going</sl-checkbox>
    <sl-checkbox checked={filter.involvementInterested} on:sl-change={e => { filter.involvementInterested = e.target.checked; dispatch('update-filter', filter)} }>Interested</sl-checkbox>
    <sl-checkbox checked={filter.involvementNoOpinion} on:sl-change={e => { filter.involvementNoOpinion = e.target.checked; dispatch('update-filter', filter)} }>No Opinion</sl-checkbox>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 10px"><strong>Tags:</strong></span>
    <sl-input
      value={filter.tags.join(", ")}
      on:input={e => { filter.tags = e.target.value.split(/,\W*/); ; dispatch('update-filter', filter)} }
    ></sl-input>
  </div> 
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Contains:</strong></span>
      <sl-input
      value={filter.keyword}
      on:input={e => { filter.keyword = e.target.value; ; dispatch('update-filter', filter)} }
    ></sl-input>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 10px"><strong>Space:</strong></span>
    <sl-select style="min-width:100px" multiple clearable
      value={filter.space.map(h=>encodeHashToBase64(h))}
      placeholder="filter by spaces"
      on:sl-change={(e)=>{console.log("FISH", e.target.value) ;filter.space = e.target.value.map(h => decodeHashFromBase64(h)); dispatch('update-filter', filter)}}
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
  .filter-modal {
    max-width: 90%;
    background-color: white;
    padding: 10px;
    position: absolute;
    top: 5px;
    right: 5px;

    border: solid 1px;
    display: flex; flex-direction: column;
    max-height: 100%;
    z-index: 1000;
  }
</style>