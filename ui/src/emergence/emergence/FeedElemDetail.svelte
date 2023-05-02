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
  <!-- idk why putting &nbsp; after </Avatar> creates two spaces, 
    but if placed in side of eaach #if it creates a single space-->
  <Avatar agentPubKey={feedElem.author} size={0}></Avatar>
  <!-- {JSON.stringify(profiles.profiles.get(feedElem.author))} -->
  {#if feedElem.type === FeedType.SessionNew}
    &nbsp;created session: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SessionUpdate}
   &nbsp;Updated session: {feedElem.detail.title}  changes: {feedElem.detail.changes.join("; ")}
  {/if}
  {#if feedElem.type === FeedType.SessionDelete}
   &nbsp;Deleted session: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SessionSetInterest}
   &nbsp;set interest in {sessionTitle(feedElem.about)} to {sessionInterestToString(feedElem.detail)}
  {/if}
  {#if feedElem.type === FeedType.SpaceNew}
   &nbsp;created space: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SpaceUpdate}
   &nbsp;updated space {feedElem.detail.name}  changes: {feedElem.detail.changes.join("; ")}
  {/if}
  {#if feedElem.type === FeedType.SpaceDelete}
   &nbsp;deleted space {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SlotSession}
   &nbsp;scheduled {sessionTitle(feedElem.about)} into {feedElem.detail.space} for <TimeWindowSummary timeWindow={feedElem.detail.window}></TimeWindowSummary> 
  {/if}
  {#if feedElem.type === FeedType.NoteNew}
   &nbsp;created note:
    <NoteDetail noteHash={feedElem.about} showAvatar={false}></NoteDetail>
  {/if}
  {#if feedElem.type === FeedType.TimeWindowNew}
  &nbsp;created slot:
    <TimeWindowSummary timeWindow={feedElem.detail}></TimeWindowSummary>
  {/if}
  {#if feedElem.type === FeedType.SiteMapNew}
    &nbsp;created sitemap: {feedElem.detail}
  {/if}
  {#if feedElem.type === FeedType.SiteMapUpdate}
    &nbsp;updated sitemap changes: {feedElem.detail.changes.join("; ")}
  {/if}
  {#if feedElem.type === FeedType.SiteMapDelete}
    &nbsp;deleted sitemap {feedElem.detail}
  {/if}
</div>
