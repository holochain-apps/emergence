<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { getTypeName, type FeedElem, FeedType, timeWindowStartToStr, timeWindowDurationToStr } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import "@holochain-open-dev/profiles/elements/agent-avatar.js";
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import { encodeHashToBase64 } from '@holochain/client';

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

    by <div style="margin:0 10px 0 10px; border:solid 1px; border-radius:50%; width:40px; height:40px;     display: flex;
    justify-content: center;
    flex-direction: column;
    ">{encodeHashToBase64(feedElem.author).slice(-5)}</div>
</div>
