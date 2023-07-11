<script lang="ts">
import { getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { type FeedElem, FeedType, sessionInterestToString, timestampToStr, SessionInterestBit } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import Avatar from './Avatar.svelte';
import NoteDetail from './NoteDetail.svelte';
import NoteSummary from './NoteSummary.svelte';
import TimeWindowSummary from './TimeWindowSummary.svelte';
import SessionLink from './SessionLink.svelte';
import SpaceLink from './SpaceLink.svelte';
    import { not_equal } from 'svelte/internal';

export let feedElem: FeedElem;
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

</script>

<div class="feed-elem">
  {#if feedElem.type !== FeedType.NoteNew}
  <div class="elem-head">
    <span class="timestamp">{timestampToStr(feedElem.timestamp)}</span>
  </div>
  {/if}
  <div class="elem-body">
    {#if feedElem.type === FeedType.SessionNew}
      <div class="type">
        <div class="avatar"><Avatar agentPubKey={feedElem.author} size={18}></Avatar></div> created a session</div>
      <SessionLink sessionHash={feedElem.about}></SessionLink>
    {/if}
    {#if feedElem.type === FeedType.SessionUpdate}
      <div class="type">Session Updated</div>
      <SessionLink sessionHash={feedElem.about} linkText={feedElem.detail.title}></SessionLink>  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SessionDelete}
      <div class="type">session Deleted</div> 
      {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SessionSetInterest}

      <div class="avatar"><Avatar agentPubKey={feedElem.author} size={18}></Avatar></div>
      {#if feedElem.detail == SessionInterestBit.Interested}
        is interested in
      {:else if feedElem.detail == SessionInterestBit.Going}
        is going to
      {:else if feedElem.detail == SessionInterestBit.Hidden}
        has hidden 
      {:else}
        has set their interest to {sessionInterestToString(feedElem.detail)} for
      {/if}
      <SessionLink sessionHash={feedElem.about}></SessionLink>
    {/if}
    {#if feedElem.type === FeedType.SpaceNew}
      <div class="type">New space</div>
      <SpaceLink spaceHash={feedElem.about}></SpaceLink>
    {/if}
    {#if feedElem.type === FeedType.SpaceUpdate}
      <div class="type">Space updated</div>
      <SpaceLink spaceHash={feedElem.about}></SpaceLink> changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SpaceDelete}
    <div class="type">Space deleted</div>{feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SlotSession}
      {#if feedElem.detail.space}
        <SessionLink sessionHash={feedElem.about}></SessionLink>
        <div>will be hosted in {feedElem.detail.space}</div>
        <TimeWindowSummary timeWindow={feedElem.detail.window}></TimeWindowSummary> 
      {:else}
        unscheduled <SessionLink sessionHash={feedElem.about}></SessionLink>
      {/if}
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
    {#if feedElem.type === FeedType.ProxyAgentNew}
      created proxy agent: {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.ProxyAgentUpdate}
      updated proxy agent changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.ProxyAgentDelete}
      deleted proxy agent {feedElem.detail}
    {/if}
  </div>
</div>
<style>
  .feed-elem {
    display: flex; 
    flex-direction: column; 
    align-items: left;
    padding: 18px;
    border-radius: 5px;
    position: relative;
    background-color: white;
    width: 100%;
  }
  .elem-head {
    display: flex; flex-direction: row;
    font-size: 10px;
    padding-left: 30px;
    justify-content: right;
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .avatar {
    position: relative;
    top: 5px;
  }

  .type {
    display: block;
  }

  .feed-icon {
    position: absolute;
    top: 0;
    left: 0;
    height: 30px
  }

  .timestamp {
    opacity: .3;
  }
  
  .elem-body {
    width: 100%;
    text-align: left;
  }

  a {
    color: rgba(32, 32, 32, 1.0);
  }

  .elem-body div {
    display: inline;
  }
  
</style>