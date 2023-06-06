<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { faArrowRotateBack, faClose, faMagnifyingGlass, faMap, faTag, faUser } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import { defaultFeedFilter, defaultSessionsFilter, type FeedFilter, type SessionsFilter } from './types';
import { fly } from 'svelte/transition';
import type { EmergenceStore } from '../../emergence-store';
import { storeContext } from '../../contexts';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
  import Avatar from './Avatar.svelte';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

export let filter: FeedFilter

$: filter
$: spaces = store.spaces
$: uiProps = store.uiProps
onMount(() => {
});

</script>
<div transition:fly={{ x: 300, duration: 500 }} class="filter-modal" style="display: flex; flex-direction: column">
  <div class="center-row" style="  justify-content: space-between;border-bottom: 1px solid;">
    <h3>Filters</h3>
    <div class="center-row">
      <sl-button style="align-self:flex-end; margin-left: 8px; " on:click={() => { filter = defaultFeedFilter(); dispatch('update-filter', filter) } } circle>
        <Fa icon={faArrowRotateBack} />
      </sl-button>
      <sl-button style="margin-left: 8px; " on:click={() => { dispatch('close-filter') } } circle>
        <Fa icon={faClose} />
      </sl-button>
    </div>
  </div>
  <div style="display: flex; flex-direction: column; margin-bottom: 16px">
    <div  class="center-row" style="background-color:white;">
      <span style="margin-right: 10px"><Fa icon={faUser} /></span>
      {#if filter.author}
        <Avatar agentPubKey={filter.author}></Avatar>
        <div style="margin-left:5px;" class="micro-button" on:click={()=> {filter.author=undefined}} ><Fa  icon={faClose} /></div>
      {:else}
        <search-agent include-myself={true} clear-on-select={true} on:agent-selected={(e)=>filter.author=e.detail.agentPubKey}></search-agent>
      {/if}
    
    </div>
  </div> 
  <div class="center-row" style="background-color:white;">
    <span style="margin-right: 10px"><Fa icon={faTag} /></span>
    <sl-input
      value={filter.tags.join(", ")}
      autocomplete="off"
      on:input={e => { filter.tags = e.target.value.split(/,\W*/).filter((w)=>w) ; dispatch('update-filter', filter)} }
    ></sl-input>
  </div> 
  <div class="center-row" style="background-color:white;">
    <span style="margin-right: 4px"><Fa icon={faMagnifyingGlass} /></span>
      <sl-input
      value={filter.keyword}
      autocomplete="off"
      on:input={e => { filter.keyword = e.target.value; ; dispatch('update-filter', filter)} }
    ></sl-input>
  </div>
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
</style>