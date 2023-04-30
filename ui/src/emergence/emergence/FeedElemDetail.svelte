<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { getTypeName, type FeedElem, FeedType, sessionInterestToString, timeWindowDurationToStr, timeWindowStartToStr } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import Avatar from './Avatar.svelte';
import type { ActionHash } from '@holochain/client';
import NoteDetail from './NoteDetail.svelte';
import TimeWindowSummary from './TimeWindowSummary.svelte';
  import { detach } from 'svelte/internal';

export let feedElem: FeedElem;
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

$: profiles = store.profilesStore

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
  <!-- {JSON.stringify(profiles.profiles.get(feedElem.author))} -->
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
    set interest in {sessionTitle(feedElem.about)} to {sessionInterestToString(feedElem.detail)}
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
    scheduled {sessionTitle(feedElem.about)} into {feedElem.detail.space} for <TimeWindowSummary timeWindow={feedElem.detail.window}></TimeWindowSummary> 
  {/if}
  {#if feedElem.type === FeedType.NoteNew}
  created note:
    <NoteDetail noteHash={feedElem.about} showAvatar={false}></NoteDetail>
  {/if}
  {#if feedElem.type === FeedType.TimeWindowNew}
  created slot:
    <TimeWindowSummary timeWindow={feedElem.detail}></TimeWindowSummary>
  {/if}
  {#if feedElem.type === FeedType.SiteMapNew}
    created sitemap: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SiteMapUpdate}
    updated sitemap changes: {feedElem.detail.changes.join("; ")}
  {/if}
  {#if feedElem.type === FeedType.SiteMapDelete}
    deleted sitemap {feedElem.detail}
  {/if}
</div>
