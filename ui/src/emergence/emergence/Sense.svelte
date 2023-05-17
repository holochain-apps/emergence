<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { Record } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { sessionTags, type Info, type Session, SessionInterest } from './types';
  import Avatar from './Avatar.svelte';
  import Fa from 'svelte-fa';
  import { faArrowRight, faBookmark, faStar } from '@fortawesome/free-solid-svg-icons';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;
  let senseIdx = 0
  let sessions

  $: original = store.sessions
  $: count = $original.length < 10 ? sessions.length : 10
  $: sessions = []
  $: error, senseIdx;
  $: session = sessions ? sessions[senseIdx] : undefined
  $: slot = session ? store.getSessionSlot(session) : undefined

  onMount(async () => {
   sessions = shuffle($original.filter(s=>!s.record.entry.trashed))
  });

  const swipe = (interest: SessionInterest) => {
    store.setSessionInterest(session.record.actionHash, interest)
    senseIdx += 1
  }

  const shuffle = (sessions: Array<Info<Session>>) => {
    const shuffled = sessions.map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    return shuffled.splice(0,count)
  }

</script>
{#if error}
<span>Error fetching the sense: {error.data.data}.</span>
{:else if !session}
<span>All Done, thanks!</span>
{:else}
<div class="sense">
    <div class="remaining">Remaining: {count - senseIdx}</div>
    <div class="sense-item">
      <h2>{session.record.entry.title}</h2>
      <div class="leaders">
        {#each session.record.entry.leaders as leader}
          <div><Avatar agentPubKey={leader}></Avatar></div>
        {/each}
      </div>
      <div class="description">
        {session.record.entry.description}
      </div>
      <div class="tags">
        {#each sessionTags(session) as tag}
          <div class="tag">{tag}</div>
        {/each}
      </div>
      <div class="slot">
        <div class="slot-wrapper">
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
      </div>
      <div class="buttons">
        <div class="button">
          <sl-button
          circle
          size="large"
          label="Next"
          on:click={() => {swipe(SessionInterest.NoOpinion)}}
        ><Fa icon={faArrowRight} /></sl-button>
          Next
        </div>
        <div class="button">
          <sl-button
          circle
          size="large"
          label="Interested"
          on:click={() => {swipe(SessionInterest.Interested)}}
          ><Fa icon={faBookmark} /></sl-button>
          Interested
        </div>
        <div class="button">
          <sl-button
          circle
          size="large"
          label="Going"
          on:click={() => {swipe(SessionInterest.Going)}}
        ><Fa icon={faStar} /></sl-button>
          Going
        </div>

      </div>
    </div>
  </div>

{/if}

<style>
  .sense {
    display: flex;
    flex-direction: column;
    border: solid 1px gray;
    background-color: white;
    border-radius: 20px;
    padding: 10px;
    margin: 10px;
  }
  .sense-item {
    padding: 10px;
    width:100%; 
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .leaders {
    display: flex;
    flex-direction: column;
  }
  .slot {
    display: flex;
    align-items: center;
    width: 90px;
    background-color: rgba(243, 243, 245, 1.0);
    text-align: center;
  }
  .slot-wrapper {
    padding: 5px;
    width: 100%;
    height: 75px;
  }
  .time {
    font-size: 1.7em;
    margin-top: -6px;
    margin-bottom: -2px;
  }
  .date, .space {
    font-size: .7em;
  }
  .buttons {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
  }
  .button {
    display: flex;
    flex-direction: column;
    width:75px;
    align-items: center;
  }

</style>