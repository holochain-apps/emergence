<script lang="ts">
import { getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { type FeedElem, FeedType, sessionInterestToString, timestampToStr } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import Avatar from './Avatar.svelte';
import { encodeHashToBase64, type ActionHash } from '@holochain/client';
import NoteDetail from './NoteDetail.svelte';
import TimeWindowSummary from './TimeWindowSummary.svelte';

export let feedElem: FeedElem;
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const sessionTitle = (sessionHash: ActionHash) => {
  const session = store.getSession(sessionHash)
  if (session) {
    return session.record.entry.title
  }
  return "<deleted session>"
}

</script>

<div class="feed-elem">
  <div class="elem-head">
    <Avatar agentPubKey={feedElem.author} size={30}></Avatar>
    <span style="margin-left:5px">{timestampToStr(feedElem.timestamp)}</span>
  </div>
  <div class="elem-body">
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
      <NoteDetail noteHash={feedElem.about} showAvatar={false} showTimestamp={false}></NoteDetail>
    {/if}
    {#if feedElem.type === FeedType.NoteUpdate}
    updated note:
      <NoteDetail noteHash={feedElem.about} showAvatar={false} showTimestamp={false}></NoteDetail>
    {/if}
    {#if feedElem.type === FeedType.NoteDelete}
    deleted note: {encodeHashToBase64(feedElem.about)}
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
</div>
<style>
  .feed-elem {
    display: flex; 
    flex-direction: column; 
    align-items: left;
    margin: 0 5px 0 10px;
    border: solid 1px grey;
    padding: 10px;
    border-radius: 5px;
    background-color: white;
    width: 100%;
  }
  .elem-head {
    display: flex; flex-direction: row;
  }
  .elem-body {
    display: flex; flex-direction: row;
  }
</style>