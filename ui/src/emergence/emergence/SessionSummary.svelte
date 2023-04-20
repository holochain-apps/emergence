<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import type { Slot, Session, Info } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import Avatar from './Avatar.svelte';
import InterestSelect from './InterestSelect.svelte';

const dispatch = createEventDispatcher();

export let session: Info<Session>;
export let allowSetIntention = false;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;

let slot:Slot|undefined = undefined

$: loading, session, slot;
$: tags = sessionTags(session)

const sessionTags = (session: Info<Session>):Array<string> => {
  return session.relations.filter(r=>r.content.path == "session.tag").map(r=> r.content.data)
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
  <div class="info">
    <div class="attribs">
      <div>
        <span style="margin-right: 4px"><strong>Title:</strong></span>
        <span style="white-space: pre-line">{ session.record.entry.title }</span>
      </div>
      <div>
        <span style="margin-right: 4px"><strong>Leaders:</strong></span>
          {#each session.record.entry.leaders as leader}
          <Avatar agentPubKey={leader}></Avatar>
          {/each}
      </div>
      <div class="tags">
        {#each tags as tag}
        <div class="tag">
          {tag}
        </div>
      {/each}
      </div>
    </div>
    <div class="right-side">
      {#if allowSetIntention}
        <InterestSelect sessionHash={session.original_hash}></InterestSelect>
      {/if}
    </div>
  </div>

</div>
{/if}

<style>
  .time {
    font-size: 1.6em;
  }
  .date, .space {
    font-size: .9em;
  }
  .summary {
    display: flex; flex-direction: row;
    border: solid 1px;
  }
  .slot {
    border-right: solid 1px;
    height: 70px;
    width: 70px;
    padding: 5px;
  }
  .info {
    display: flex;
    padding: 5px;
    justify-content: space-between;
    width: 100%;
  }
  .attribs {
    display: flex;
    flex-direction: column;
  }
  .right-side {
    width: 150px;
  }
</style>