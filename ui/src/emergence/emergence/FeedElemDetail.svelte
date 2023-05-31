<script lang="ts">
import { getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { type FeedElem, FeedType, sessionInterestToString, timestampToStr } from './types';
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
      <img src="/images/new-session.svg" class="feed-icon">
      <div class="type">
        <Avatar agentPubKey={feedElem.author} size={18}></Avatar> created a session</div>
      <SessionLink sessionHash={feedElem.about}></SessionLink>
    {/if}
    {#if feedElem.type === FeedType.SessionUpdate}
      <img src="/images/scheduling.svg" class="feed-icon">
      <div class="type">Session Updated</div>
      <SessionLink sessionHash={feedElem.about} linkText={feedElem.detail.title}></SessionLink>  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SessionDelete}
      <img src="/images/scheduling.svg" class="feed-icon">
      <div class="type">session Deleted</div> 
      {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SessionSetInterest}
      <img src="/images/interest.svg" class="feed-icon">
      <Avatar agentPubKey={feedElem.author} size={18}></Avatar> is
      {sessionInterestToString(feedElem.detail)} to
      <SessionLink sessionHash={feedElem.about}></SessionLink>
    {/if}
    {#if feedElem.type === FeedType.SpaceNew}
      <img src="/images/location.svg" class="feed-icon">
      <div class="type">New space</div>
      <SpaceLink spaceHash={feedElem.about}></SpaceLink>
    {/if}
    {#if feedElem.type === FeedType.SpaceUpdate}
      <img src="/images/location.svg" class="feed-icon">
      <div class="type">Space updated</div>
      <SpaceLink spaceHash={feedElem.about}></SpaceLink>  changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SpaceDelete}
    <img src="/images/location.svg" class="feed-icon">
    <div class="type">Space deleted</div>{feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SlotSession}
    <img src="/images/scheduling.svg" class="feed-icon">
      {#if feedElem.detail.space}
        <SessionLink sessionHash={feedElem.about}></SessionLink>
        <div>will be hosted in {feedElem.detail.space}</div>
        <TimeWindowSummary timeWindow={feedElem.detail.window}></TimeWindowSummary> 
      {:else}
        unscheduled <SessionLink sessionHash={feedElem.about}></SessionLink>
      {/if}
    {/if}
    {#if feedElem.type === FeedType.NoteNew}
      <img src="/images/note.svg" class="feed-icon">
      <NoteDetail noteHash={feedElem.about}></NoteDetail>
    {/if}
    {#if feedElem.type === FeedType.NoteUpdate}
    <img src="/images/note.svg" class="feed-icon">
      updated note: <NoteSummary showAvatar={false} showTimestamp={false} noteHash={feedElem.about}></NoteSummary>
    {/if}
    {#if feedElem.type === FeedType.NoteDelete}
    <img src="/images/note.svg" class="feed-icon">
    deleted note: <NoteSummary noteHash={feedElem.about} showAvatar={false} showTimestamp={false}></NoteSummary>
    {/if}
    {#if feedElem.type === FeedType.TimeWindowNew}

    <img src="/images/scheduling.svg" class="feed-icon">
    created slot:
      <TimeWindowSummary timeWindow={feedElem.detail}></TimeWindowSummary>
    {/if}
    {#if feedElem.type === FeedType.SiteMapNew}
    <img src="/images/location.svg" class="feed-icon">
      created sitemap: {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.SiteMapUpdate}
    <img src="/images/location.svg" class="feed-icon">
      updated sitemap changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.SiteMapDelete}
    <img src="/images/location.svg" class="feed-icon">
      deleted sitemap {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.Sense}
    <img src="/images/interest.svg" class="feed-icon">
      sense added: {sessionInterestToString(JSON.parse(feedElem.detail))} for <SessionLink sessionHash={feedElem.about}></SessionLink>
    {/if}
    {#if feedElem.type === FeedType.ProxyAgentNew}
    <img src="/images/person.svg" class="feed-icon">
      created proxy agent: {feedElem.detail}
    {/if}
    {#if feedElem.type === FeedType.ProxyAgentUpdate}
    <img src="/images/person.svg" class="feed-icon">
      updated proxy agent changes: {feedElem.detail.changes.join("; ")}
    {/if}
    {#if feedElem.type === FeedType.ProxyAgentDelete}
    <img src="/images/person.svg" class="feed-icon">
      deleted proxy agent {feedElem.detail}
    {/if}
  </div>
</div>
<style>
  .feed-elem {
    display: flex; 
    flex-direction: column; 
    align-items: left;
    margin: 0 5px 0 10px;
    padding: 10px;
    border-radius: 5px;
    position: relative;
    background-color: white;
    width: 100%;
  }
  .elem-head {
    display: flex; flex-direction: row;
    font-size: 12px;
    padding-left: 30px;
    justify-content: space-between;
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
    font-size: 12px;
    opacity: .3;
  }
  
  .elem-body {
  }

  .elem-body div {
    display: inline;
  }
  
</style>