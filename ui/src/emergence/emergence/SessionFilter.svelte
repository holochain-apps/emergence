<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
  import { faClose } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import type { SessionsFilter } from './types';

const dispatch = createEventDispatcher();

export let filter: SessionsFilter

onMount(() => {
});


</script>
<div style="display: flex; flex-direction: column">

<sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('close-filter') } } circle>
  <Fa icon={faClose} />
</sl-button>

  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Time</strong></span>
    <sl-checkbox checked={filter.timeNow} on:sl-change={e => { filter.timeNow = e.target.checked ; dispatch('update-filter', filter)} }>Now</sl-checkbox>
    <sl-checkbox checked={filter.timeNext} on:sl-change={e => { filter.timeNext = e.target.checked; dispatch('update-filter', filter)} }>Next</sl-checkbox>
    <sl-checkbox checked={filter.timePast} on:sl-change={e => { filter.timePast = e.target.checked; dispatch('update-filter', filter)} }>Past</sl-checkbox>
    <sl-checkbox checked={filter.timeFuture} on:sl-change={e => { filter.timeFuture = e.target.checked; dispatch('update-filter', filter)} }>Future</sl-checkbox>
    <sl-checkbox checked={filter.timeUnscheduled} on:sl-change={e => { filter.timeUnscheduled = e.target.checked; dispatch('update-filter', filter)} }>Unscheduled</sl-checkbox>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Your Involvement</strong></span>
    <sl-checkbox checked={filter.involvementLeading} on:sl-change={e => { filter.involvementLeading = e.target.checked; dispatch('update-filter', filter)} }>Leading</sl-checkbox>
    <sl-checkbox checked={filter.involvementGoing} on:sl-change={e => { filter.involvementGoing = e.target.checked; dispatch('update-filter', filter)} }>Going</sl-checkbox>
    <sl-checkbox checked={filter.involvementInterested} on:sl-change={e => { filter.involvementInterested = e.target.checked; dispatch('update-filter', filter)} }>Interested</sl-checkbox>
    <sl-checkbox checked={filter.involvementNoOpinion} on:sl-change={e => { filter.involvementNoOpinion = e.target.checked; dispatch('update-filter', filter)} }>No Opinion</sl-checkbox>
  </div>
  <div style="display: flex; flex-direction: row; margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Contains:</strong></span>
    <sl-input
    value={filter.keyword}
    on:input={e => { filter.keyword = e.target.value; ; dispatch('update-filter', filter)} }
  ></sl-input>
  </div>
</div>
<style>
    :global(.modal) {
    background-color: white;
    padding: 10px;
    position: absolute;
    top: 5px;

    border: solid 1px;
    display: flex; flex-direction: column;
    max-height: 100%;
    overflow: auto;
    z-index: 1000;
  }
</style>