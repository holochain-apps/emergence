<script lang="ts">
import { getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { type FeedElem, FeedType, sessionInterestToString, timestampToStr } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import Avatar from './Avatar.svelte';
import type { ActionHash } from '@holochain/client';
import NoteDetail from './NoteDetail.svelte';
import NoteSummary from './NoteSummary.svelte';
import TimeWindowSummary from './TimeWindowSummary.svelte';
import SessionLink from './SessionLink.svelte';
import SpaceLink from './SpaceLink.svelte';

export let feedElem: FeedElem;
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

</script>

<div class="feed-elem">
  {#if feedElem.type !== FeedType.NoteNew}
  <div class="elem-head">
    <Avatar agentPubKey={feedElem.author} size={30}></Avatar>
    <span style="margin-left:5px">{timestampToStr(feedElem.timestamp)}</span>
  </div>
  {/if}
  <div class="elem-body">
    {#if feedElem.type === FeedType.SessionNew}
      created session: <SessionLink sessionHash={feedElem.about}></SessionLink>
    {/if}
    {#if feedElem.type === FeedType.SessionUpdate}
    Updated session: <SessionLink sessionHash={feedElem.about} linkText={feedElem.detail.title}></SessionLink>  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SessionDelete}
    Deleted session: {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SessionSetInterest}
    set interest in <SessionLink sessionHash={feedElem.about}></SessionLink> to {sessionInterestToString(feedElem.detail)}
    {/if}
    {#if feedElem.type === FeedType.SpaceNew}
    created space: <SpaceLink spaceHash={feedElem.about}></SpaceLink>
    {/if}
    {#if feedElem.type === FeedType.SpaceUpdate}
    updated space <SpaceLink spaceHash={feedElem.about}></SpaceLink>  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SpaceDelete}
    deleted space {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SlotSession}
    scheduled <SessionLink sessionHash={feedElem.about}></SessionLink> into {feedElem.detail.space} for <TimeWindowSummary timeWindow={feedElem.detail.window}></TimeWindowSummary> 
    {/if}
    {#if feedElem.type === FeedType.NoteNew}
      <NoteDetail noteHash={feedElem.about}></NoteDetail>
    {/if}
    {#if feedElem.type === FeedType.NoteUpdate}
      updated note: <NoteSummary showAvatar={false} showTimestamp={false} noteHash={feedElem.about}></NoteSummary>
    {/if}
    {#if feedElem.type === FeedType.NoteDelete}
    deleted note: <NoteSummary noteHash={feedElem.about} showAvatar={false} showTimestamp={false}></NoteSummary>
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
    {#if feedElem.type === FeedType.Sense}
      sense added: {sessionInterestToString(JSON.parse(feedElem.detail))} for <SessionLink sessionHash={feedElem.about}></SessionLink>
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