<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import { storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import { type Slot, type Session, type Info, amenitiesList, sessionTags, DetailsType, SessionInterestBit } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import Avatar from './Avatar.svelte';
import AnyAvatar from './AnyAvatar.svelte';
import InterestSelect from './InterestSelect.svelte';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';

const dispatch = createEventDispatcher();

export let session: InfoSession;
export let allowSetIntention = false;
export let showDescription = false;
export let showTags = false;
export let showAmenities = false;
export let showSlot = false;
export let showLeaders = true;
export let showLeaderAvatar = false;
export let extra = ""

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;

let slot:Slot|undefined = undefined

$: relData = store.sessionReleationDataStore(store.sessionStore(session.original_hash))
$: loading, session, slot;
$: tags = sessionTags(session)
$: slot = store.getSessionSlot(session)
$: going = Array.from($relData.interest).filter(([_,i])=> i & (SessionInterestBit.Going+SessionInterestBit.Interested))
$: settings = store.settings
$: sessionType = $settings.session_types[session.record.entry.session_type]

onMount(async () => {
  loading = false
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionSummary element`);
  }
});
$:space = slot && slot.space ? store.getSpace(slot.space) : undefined
</script>
{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else}

<div class="SessionSummary summary card" on:click={(e)=>{

  // @ts-ignore
    if (e.target.tagName != "SL-SELECT")
      store.openDetails(DetailsType.Session, session.original_hash); 
  }}>
  {#if showSlot}
    <div class="slot">
      <div class="slot-wrapper" style={`background-color: ${sessionType.color}40; height: 100%;`}>
        {#if slot}
        <div class="date">
          {new Date(slot.window.start).toLocaleString('en-US', { weekday: 'long' })}
        </div>
        <div class="time">
          {new Date(slot.window.start).toTimeString().slice(0,5)}
        </div>
        <div class="space clickable" on:click={(e)=>{e.stopPropagation();store.openDetails(DetailsType.Space, space.original_hash)}}>
          {space ? space.record.entry.name : ""}
        </div>
        {:else}
        <div class="date">
          Slot TBA
        </div>
        <div class="time">--:--</div>
        <div class="space">Space TBA</div>
        {/if}
      </div>
    </div>
  {/if}
  <div class="info clickable">
    <div class="top-area">
      <div class="left-side">
        <div class="title">
            <span style="white-space: pre-line"><strong>{ session.record.entry.title }</strong> </span>
            <span class="attendees">
              {#if going.length > 0}
              <sl-tooltip >
                <div slot="content">
                  <div style="display:flex">
                    {#each going as [agent,interest]}
                    <Avatar agentPubKey={agent}></Avatar>: 
                      {#if interest & SessionInterestBit.Going} Going {/if}
                      {#if interest & SessionInterestBit.Interested} Interested {/if}
                    {/each}
                    </div>
                </div>
                <div style="display: inline-flex">
                  <Fa icon={faUserGroup} />
                  {going.length}
                </div>
              </sl-tooltip>
              {#if extra}
                <div>
                  {extra}
                </div>
              {/if}
        
              {:else}
               <Fa icon={faUserGroup} /> 0
              {/if}
            </span>
        </div>
        {#if showLeaders}
          <div class="leaders">
              <span style="padding-top: 2px">Hosted by:</span>
              {#each session.record.entry.leaders as leader}
              <span  style="margin-top: 2px;"><AnyAvatar showAvatar={showLeaderAvatar} size={20} agent={leader}></AnyAvatar></span>
              {/each}
          </div>
        {/if}
      </div>
    </div>
    <div class="bottom-area">
      {#if showDescription}
        <div class="description">
          {session.record.entry.description}
        </div>
      {/if}
      {#if showTags}
        <div class="tags">
          {#if session.record.entry.session_type != 0}
            <div class="session-type" style={`background-color: ${sessionType.color};`}>{sessionType.name}</div>
          {/if}
          {#each tags as tag}
          <div class="tag clickable-tag" on:click={(e)=>{e.stopPropagation(); store.filterTag(tag,"sessionsFilter")}}>
            #{tag}
          </div>
          {/each}
        </div>
      {/if}

      {#if showAmenities}
        <div class="amenities">
          {amenitiesList(session.record.entry.amenities).join(", ")}
        </div>
      {/if}
    </div>
  </div>
  <div class="right-side" on:click={(e)=>{e.stopPropagation()}}>
    {#if allowSetIntention}
      <InterestSelect sessionHash={session.original_hash}></InterestSelect>
    {/if}
  </div>
</div>
{/if}

<style>

  .tags {
    display: block;
    text-align: left;
  }

  .tag {
    border: 1px solid #2F87D830;
    color: #2F87D8;
    background-color: transparent;
    margin-bottom: 0;
    display: inline;
    font-size: 11px;
  }

  .clickable-tag {
    cursor: pointer;
  }
  .clickable-tag:hover {
    border: 1px solid #25bab054;
    color: #25BAB1;
    background-color: rgb(240, 249, 2244);
  }

  .time {
    font-size: 16px;
    color: white;
    margin-top: -3px;
    margin-bottom: -3px;
  }
  .date, .space {
    font-size: 9px;
    line-height: 10px;
    font-weight: normal;
    margin-bottom: 0;
    color: white;
    opacity: .5;
  }
  .space {
    overflow: hidden;
    max-height: 20px;
  }
  .slot {
    display: flex;
    align-items: center;
    background: #565E6D;
    width: 40px;
    text-align: center;
    border-radius: 0;
    color: white;
    min-width: 55px;
    box-shadow: inset -20px 0 30px rgba(0, 0, 0, .5);
  }
  .slot-wrapper {
    flex-direction: column;
    padding: 5px;
    width: 100%;
    height: 75px;
  }
  .info {
    border-left: solid 1px rgba(239, 240, 243, 1.0);
    display: flex;
    flex-direction: column;
    padding: 10px 15px;
    justify-content: center;
    width: 100%;
  }
  .top-area, .bottom-area {
    display: flex;
    justify-content: space-between;
  }
  .bottom-area {
    flex-direction: column
  }
  .left-side {
    display: flex;
    flex-direction: column;
    align-items: self-start;
  }
  .right-side {
    display: flex;
    flex: 0;
    justify-content: center;
    align-items: center;
    padding: 10px;
  }

  .leaders {
    font-size: 10px;
    margin-bottom: 5px;
    text-align: left;
  }

  .leaders span {
    display: inline-block;
    opacity: .8;
    padding-right: 4px;
  }

  .attendees {
    opacity: .6;
    font-size: 12px;
  }
  :global(.clickable) {
    cursor: pointer;
  }

  .session-type {
    margin-bottom: 0;
    display: inline;
    border-radius: 7px;
    padding: 5px;
    margin-right: 2px;
    padding-top: 0px;
    color: white;
    padding-bottom: 0px;
    font-size: 11px;
  }

  @media (min-width: 720px) {

    .leaders {
      font-size: 12px;
    }

    .date, .space {
      font-size: 11px;
    }

    .time {
      font-size: 18px;
    }

  .slot {
    min-width: 70px;
    border-radius: 10px 0 0 10px;
  }
}
</style>
