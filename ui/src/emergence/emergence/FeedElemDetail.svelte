<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { getTypeName, type FeedElem, FeedType, timeWindowStartToStr, timeWindowDurationToStr } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
  import Avatar from './Avatar.svelte';

export let feedElem: FeedElem;
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const slotSummary = (detail: any) => {
  return `into ${detail.space} for ${timeWindowStartToStr(feedElem.detail.window)} @ ${timeWindowDurationToStr(feedElem.detail.window)} `
}
</script>

<div style="display: flex; flex-direction: row; align-items :center">
  {getTypeName(feedElem.type)}
 
  
    {#if feedElem.type === FeedType.SessionNew}
      {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SessionUpdate}
      {feedElem.detail.title}  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SessionDelete}
      {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SpaceNew}
      {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SpaceUpdate}
    {feedElem.detail.name}  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SpaceDelete}
      {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SlotSession}
      {slotSummary(feedElem.detail)}
    {/if}

    by <Avatar agentPubKey={feedElem.author} size={25}></Avatar>
</div>
