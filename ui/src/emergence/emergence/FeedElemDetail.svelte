<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { getTypeName, type FeedElem, FeedType, timeWindowStartToStr, timeWindowDurationToStr, sessionInterestToString } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
  import Avatar from './Avatar.svelte';
  import type { ActionHash } from '@holochain/client';

export let feedElem: FeedElem;
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const slotSummary = (detail: any) => {
  return `into ${detail.space} for ${timeWindowStartToStr(feedElem.detail.window)} @ ${timeWindowDurationToStr(feedElem.detail.window)} `
}

const sessionTitle = (sessionHash: ActionHash) => {
  const session = store.getSession(sessionHash)
  if (session) {
    return session.record.entry.title
  }
  return "<deleted session>"
}
</script>

<div style="display: flex; flex-direction: row; align-items :center">
  <Avatar agentPubKey={feedElem.author} size={25}></Avatar> 
  {#if feedElem.type === FeedType.SessionNew}
    created session: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SessionUpdate}
    Updated session: {feedElem.detail.title}  changes: {feedElem.detail.changes.join("; ")}
  {/if}
  {#if feedElem.type === FeedType.SessionDelete}
    Deleted session: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SessionSetInterest}
    is going {sessionInterestToString(feedElem.detail)} to {sessionTitle(feedElem.about)}
  {/if}
  {#if feedElem.type === FeedType.SpaceNew}
    created space: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SpaceUpdate}
    updated space {feedElem.detail.name}  changes: {feedElem.detail.changes.join("; ")}
  {/if}
  {#if feedElem.type === FeedType.SpaceDelete}
    deleted space {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SlotSession}
    scheduled {slotSummary(feedElem.detail)}
  {/if}
</div>
