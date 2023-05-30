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

export let session: Info<Session>;
export let allowSetIntention = false;
export let showTags = false;
export let showAmenities = false;
export let showSlot = false;
export let showLeaders = true;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;

let slot:Slot|undefined = undefined

$: relData = store.sessionReleationDataStore(store.sessionStore(session.original_hash))
$: loading, session, slot;
$: tags = sessionTags(session)
$: slot = store.getSessionSlot(session)
$: going = Array.from($relData.interest).filter(([_,i])=> i & (SessionInterestBit.Going+SessionInterestBit.Interested))

onMount(async () => {
  loading = false
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionSummary element`);
  }
});
$:space = slot? store.getSpace(slot.space) : undefined
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
      <div class="slot-wrapper">
        {#if slot}
        <div class="date">
          {new Date(slot.window.start).toLocaleString('en-US', { weekday: 'long' })}
        </div>
        <div class="time">
          {new Date(slot.window.start).toTimeString().slice(0,5)}
        </div>
        <div class="space clickable" on:click={(e)=>{e.stopPropagation();store.openDetails(DetailsType.Space, space.original_hash)}}>
          {space ? space.record.entry.name : "Unknown"}
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
              {:else}
               <Fa icon={faUserGroup} /> 0
              {/if}
            </span>
        </div>
        {#if showLeaders}
          <div class="leaders">
              <span>Hosted by</span>
              {#each session.record.entry.leaders as leader}
                <AnyAvatar showAvatar={false} agent={leader}></AnyAvatar>
              {/each}
          </div>
        {/if}
      </div>
    </div>
    <div class="bottom-area">
      {#if showTags}
        <div class="tags">
          {#each tags as tag}
          <div class="tag clickable-tag" on:click={(e)=>{e.stopPropagation(); store.filterTag(tag,"sessionsFilter")}}>
            {tag}
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

  .tag {
    border: 1px solid #25bab054;
    color: #25BAB1;
    background-color: transparent;
    margin-bottom: 0;
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
    font-size: 24px;
    margin-top: -3px;
    margin-bottom: -3px;
  }
  .date, .space {
    font-size: 12px;
    line-height: 12px;
    font-weight: normal;
    margin-bottom: 0;
    opacity: .5;
  }
  .slot {
    display: flex;
    align-items: center;
    background: #565E6D;
    width: 105px;
    text-align: center;
    border-radius: 10px 0 0 10px;
    color: white;
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
    background-color: #fff;
    width: 100%;
  }
  .top-area, .bottom-area {
    display: flex;
    justify-content: space-between;
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
    font-size: 12px;
    display: inline-flex;
    margin-bottom: 5px;
  }

  .leaders span {
    display: inline-block;
    opacity: .5;
    padding-right: 4px;
  }

  .attendees {
    opacity: .6;
    font-size: 12px;
  }
  :global(.clickable) {
    cursor: pointer;
  }
</style>
