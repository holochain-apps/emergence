<script lang="ts">
  import { storeContext } from '../../contexts';

import { createEventDispatcher, getContext, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
  import type { EmergenceStore } from '../../emergence-store';
  import { faClose, faFilter, faList, faTable, faTag, faMagnifyingGlass, faClock, faCheck, faMap, faArrowsUpDownLeftRight, faArrowUpShortWide, faArrowDownWideShort, faShapes } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

const dispatch = createEventDispatcher();
let store: EmergenceStore = (getContext(storeContext) as any).getStore();
export let showKeywordCancel = false

$: uiProps = store.uiProps

onMount(() => {
});

export const open = ()=>{
}

</script>

{#if $uiProps.sessionsFilter.types}
<div class="pill-button"  on:click={() => {store.resetFilterAttributes(["types"],"sessionsFilter")}} >
  <Fa size="sm" icon={faShapes} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
{/if}
{#if $uiProps.sessionsFilter.timeNow ||$uiProps.sessionsFilter.timeToday || $uiProps.sessionsFilter.timeNext|| $uiProps.sessionsFilter.timePast|| $uiProps.sessionsFilter.timeFuture|| $uiProps.sessionsFilter.timeUnscheduled || $uiProps.sessionsFilter.timeDays.length > 0}
<div class="pill-button"  on:click={() => {store.resetFilterAttributes(["timeNow","timeToday","timeNext","timePast","timeFuture","timeUnscheduled", "timeDays"],"sessionsFilter")}} >
  <Fa size="sm" icon={faClock} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
{/if}
{#if $uiProps.sessionsFilter.involvementLeading || $uiProps.sessionsFilter.involvementGoing|| $uiProps.sessionsFilter.involvementInterested|| $uiProps.sessionsFilter.involvementNoOpinion || $uiProps.sessionsFilter.involvementHidden}
<div class="pill-button"  on:click={() => {store.resetFilterAttributes(["involvementLeading","involvementGoing","involvementInterested","involvementNoOpinion" ,"involvementHidden"],"sessionsFilter")}} >
  <Fa size="sm" icon={faCheck} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
{/if}
{#if showKeywordCancel && $uiProps.sessionsFilter.keyword}
<div class="pill-button"  on:click={() => {store.resetFilterAttributes(["keyword"],"sessionsFilter")}} >
  <Fa size="sm" icon={faMagnifyingGlass} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
{/if}
{#if $uiProps.sessionsFilter.tags.length>0}
<div class="pill-button"  on:click={() => {store.resetFilterAttributes(["tags"],"sessionsFilter")}} >
  <Fa size="sm" icon={faTag} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
{/if}
{#if $uiProps.sessionsFilter.space.length>0}
<div class="pill-button"  on:click={() => {store.resetFilterAttributes(["space"],"sessionsFilter")}} >
  <Fa size="sm" icon={faMap} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
{/if}
<sl-button title="Filter" style="margin-left: 8px; " on:click={() => { dispatch('toggle-filter') } } circle>
  <Fa icon={faFilter} />
</sl-button>