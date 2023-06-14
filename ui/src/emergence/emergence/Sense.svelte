<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { type Record, encodeHashToBase64 } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { sessionTags, type Info, type Session, SessionInterestBit } from './types';
  import Fa from 'svelte-fa';
  import { faArrowRight, faBookmark, faStar } from '@fortawesome/free-solid-svg-icons';
  import SenseResults from './SenseResults.svelte';
  import AnyAvatar from './AnyAvatar.svelte';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;
  let senseIdx = 0
  let sessions

  $: original = store.sessions
  $: sessions = []
  $: error, senseIdx;
  $: session = sessions ? sessions[senseIdx] : undefined
  $: slot = session ? store.getSessionSlot(session) : undefined

  const SESSIONS_TO_ASSESS = 20
  $: count = 0

  onMount(async () => {
    const filteredSessions = $original.filter(s=>{
      const relData = store.getSessionReleationData(s)
      const myRecordedInterest = relData.interest.get(store.myPubKey)
      return !s.record.entry.trashed && 
        myRecordedInterest==undefined &&
        !s.record.entry.leaders.find(l=>encodeHashToBase64(l.hash) == store.myPubKeyBase64)
    })
    const shuffled = shuffle(filteredSessions)
    count = shuffled.length < SESSIONS_TO_ASSESS ? shuffled.length : SESSIONS_TO_ASSESS
    sessions = shuffled.splice(0,count)
  });

  const swipe = (interest: SessionInterestBit) => {
    store.setSessionInterest(session.record.actionHash, interest)
    senseIdx += 1
  }

  const shuffle = (sessions: Array<Info<Session>>) => {
    const shuffled = sessions.map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    return shuffled
  }

</script>
{#if error}
<span>Error fetching the sense: {error.data.data}.</span>
{:else if !session}
<div style="display:flex;flex-direction:column;">
  <h2 class="complete">All Done, thanks!</h2>
  <SenseResults></SenseResults>
</div>
{:else}
<div class="instructions">
  <h3>Sensemake: Help us estimate attendance!</h3>
  <p>Here are some sessions, please indicate your interest by clicking the buttons below.</p>
</div>
<div class="sense">
    <div class="remaining">Remaining: {count - senseIdx}</div>
    <div class="sense-item">
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
      <div class="slot-details">
        <h2>{session.record.entry.title}</h2>
        <div class="leaders">
          {#each session.record.entry.leaders as leader}
            <div class="leader"><AnyAvatar agent={leader}></AnyAvatar></div>
          {/each}
        </div>
        <div class="tags">
          {#each sessionTags(session) as tag}
            <div class="tag">#{tag}</div>
          {/each}
        </div>
        <div class="description">
          {session.record.entry.description}
        </div>
      </div>
    </div>

    <div class="buttons">
      <div class="button">
        <sl-button
        circle
        size="large"
        label="Going"
        on:click={() => {swipe(SessionInterestBit.Going)}}
      ><Fa icon={faStar} /></sl-button>
        Going
      </div>
      <div class="button">
        <sl-button
        circle
        size="large"
        label="Interested"
        on:click={() => {swipe(SessionInterestBit.Interested)}}
        ><Fa icon={faBookmark} /></sl-button>
        Interested
      </div>
      <div class="button">
        <sl-button
        circle
        size="large"
        label="Skip"
        on:click={() => {swipe(SessionInterestBit.NoOpinion)}}
      ><Fa icon={faArrowRight} /></sl-button>
        Skip
      </div>

    </div>
  </div>

{/if}

<style>
  .instructions h3, .instructions p {
    color: white;
  }

  .instructions p {
    font-size: 14px;
  }
  .sense {
    display: flex;
    flex-direction: column;
    padding: 10px;
    margin: 10px;
    min-width: 400px;
  }

  .slot-details {
    padding-left: 15px;
  }
  .sense-item {
    padding: 10px;
    background-color: rgba(255,255,255,1);
    border-radius: 10px;
    width:100%; 
    height: 100%;
    display: flex;
    flex-direction: row;
    box-shadow: 0px 10px 15px rgba(0,0,0,.2);
    align-items: center;
  }
  .leaders {
    display: block;
  }

  .leader {
    display: inline-block;
    padding-right: 10px;
  }

  .slot {
    display: flex;
    min-width: 100px;
    align-items: center;
    width: auto;
    background-color: rgba(243, 243, 245, 1.0);
    text-align: center;
    border-radius: 5px;
  }
  .slot-wrapper {
    padding: 5px;
    flex-direction: column;
    width: 100%;
    height: auto;
  }

  .remaining {
    display: block;
    color: rgba(255,255,255,.5);
    font-size: 14px;
    padding-bottom: 5px;
    text-align: center;
  }

  h2.complete {
    color: rgba(77, 200, 194, 1.0);
    display: block;
    text-align: center;
  }
  
  .tag {
    border: 1px solid #2F87D850;
    color: #2F87D8;
    background-color: transparent;
    margin-bottom: 0;
    display: inline;
  }

  .time {
    font-size: 1.7em;
    margin-top: -6px;
    margin-bottom: -2px;
  }
  .date, .space {
    font-size: 12px;
    font-weight: normal;
  }
  .buttons {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    justify-content: center;
  }
  .buttons div {
    font-size: 12px;
    color: rgba(255,255,255,.5);
  }

  .button svg {
    box-shadow: 0px 10px 15px rgba(0,0,0,.2);
  }
  .button {
    display: flex;
    flex-direction: column;
    width:75px;
    align-items: center;
  }

</style>