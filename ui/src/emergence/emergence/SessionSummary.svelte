<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import { type Slot, type Session, type Info, amenitiesList } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Avatar from './Avatar.svelte';
import InterestSelect from './InterestSelect.svelte';
  import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

const dispatch = createEventDispatcher();

export let session: Info<Session>;
export let allowSetIntention = false;
export let showTags = false;
export let showAmenities = false;
export let showSlot = false;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;

let slot:Slot|undefined = undefined

$: relData = store.sessionReleationDataStore(store.sessionStore(session.original_hash))
$: loading, session, slot;
$: tags = sessionTags(session)

const sessionTags = (session: Info<Session>):Array<string> => {
  return session.relations.filter(r=>r.relation.content.path == "session.tag").map(r=> r.relation.content.data)
}

onMount(async () => {
  loading = false
  if (session === undefined) {
    throw new Error(`The session input is required for the SessionSummary element`);
  }
  slot = store.getSessionSlot(session)
});

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else}
<div class="summary" on:click={(e)=>{
  // @ts-ignore
    if (e.target.tagName != "SL-SELECT")
      dispatch('session-selected', session); 
  }}>
  {#if showSlot}
    <div class="slot" >
      {#if slot}
      <div class="date">
        {new Date(slot.window.start).toDateString().slice(0,10)}
      </div>
      <div class="time">
        {new Date(slot.window.start).toTimeString().slice(0,5)}
      </div>
      <div class="space">
        {store.getSpace(slot.space) ? store.getSpace(slot.space).record.entry.name : "Unknown"} 
      </div>
      {:else}
      <div class="date">
        Slot TBA
      </div>
      <div class="time">--:--</div>
      <div class="space">Space TBA</div>
      {/if}
    </div>
  {/if}
  <div class="info">
    <div class="top-area">
      <div class="left-side">
        <div>
            <span style="white-space: pre-line"><strong>{ session.record.entry.title }</strong></span>
        </div>
        <div>
            {#each session.record.entry.leaders as leader}
            <Avatar showAvatar={false} agentPubKey={leader}></Avatar>
            {/each}
        </div>
      </div>
      <div class="right-side">
        {#if allowSetIntention}
          <InterestSelect sessionHash={session.original_hash}></InterestSelect>
        {/if}
        <Fa icon={faUserGroup} /> {$relData.interest.size} 
      </div>
    </div>
    <div class="bottom-area">

      {#if showTags}
        <div class="tags">
          {#each tags as tag}
          <div class="tag">
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

</div>
{/if}

<style>
  .time {
    font-size: 1.7em;
    margin-top: -6px;
    margin-bottom: -11px;
  }
  .date, .space {
    font-size: .7em;
  }
  .summary {
    display: flex; flex-direction: row;
    border: solid 1px;
  }
  .slot {
    border-right: solid 1px;
    height: 75px;
    width: 90px;
    padding: 5px;
  }
  .info {
    display: flex;
    flex-direction: column;
    padding: 5px;
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
  }
</style>