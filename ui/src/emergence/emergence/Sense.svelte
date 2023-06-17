<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { type Record, encodeHashToBase64 } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { sessionTags, type Info, type Session, SessionInterestBit } from './types';
  import Fa from 'svelte-fa';
  import { faArrowRight, faBookmark, faClose, faCheck } from '@fortawesome/free-solid-svg-icons';
  import SenseResults from './SenseResults.svelte';
  import AnyAvatar from './AnyAvatar.svelte';
  import { Marked } from "@ts-stack/markdown";

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
      return s.record.entry.session_type==0 && !s.record.entry.trashed && 
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
let instructionsVisible = true
let gameActive = false
</script>
{#if error}
<span>Error fetching the sense: {error.data.data}.</span>
{:else if !session}
<div style="display:flex;flex-direction:column;">
  <h2 class="complete">All Done, thanks!</h2>
  <SenseResults></SenseResults>
</div>
{:else}
<div class="sense-wrapper"
  class:game-active={gameActive}>
  <div class="controls">
    <sl-button style="margin-left: 8px; " on:click={() => { gameActive = false; instructionsVisible = true} } circle>
      <Fa icon={faClose} />
    </sl-button>
  </div>
<div class="instructions"
  class:close={!instructionsVisible}
  >
  <h3>Today is Tomorrow</h3>
  <strong>X people proposed Y sessions for Tomorrow!</strong>
  <p>Help figure out what gets scheduled where by quickly setting your interest on proposed sessions. Sessions with most interest will get scheduled first.</p>
  <div class="begin-button"  on:click={() => { instructionsVisible = false; gameActive = true  }}>Begin</div>
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
            • {new Date(slot.window.start).toTimeString().slice(0,5)} •
          </div>
          <div class="space">
            {store.getSpace(slot.space) ? store.getSpace(slot.space).record.entry.name : "Unknown"}
          </div>
          {:else}
          <div class="date tba">
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
        {#if session.record.entry.description}
          <div class="description">
            {@html Marked.parse(session.record.entry.description) }
          </div>
        {/if}
        <div class="bg"></div>
      </div>
    </div>

    <div class="buttons">
      <div class="button">
        <sl-button
        circle
        size="large"
        label="Going"
        on:click={() => {swipe(SessionInterestBit.Going)}}
      ><Fa icon={faCheck} class="foo" /></sl-button>
        Going
      </div>
      <div class="button">
        <sl-button
        circle
        size="large"
        label="Interested"
        color="red"
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
</div>
{/if}

<style>

  .tags {
    display: block;
  }

  .begin-button {
    background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
    min-height: 30px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 10px 15px rgba(0,0,0,.35);
    border-radius: 5px;
    padding: 0 10px;
    margin-right: 10px;
    cursor: pointer;
    font-size: 14px;
    height: 40px;
    margin-top: 20px;
  }

  .sense-wrapper {
    background-color: rgba(73, 80, 93, 0);
    position: relative;
    transition: all .25s ease;
  }

  .sense-wrapper.game-active {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(73, 80, 93, .95);
    z-index: 10000;
    align-items: center;
    justify-content: center;
    display: flex;
    overflow-y: scroll;
  }

  .description {
    max-height: 150px;
  }
  .bg {
    width: 100%;
    height: 30px;
    position: absolute;
    bottom: 0;
    left: 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 100%);
  }

  .sense-wrapper .close-game, .controls {
    display: none;
  }

  .game-active .controls {
    display: block;
  }

  .sense-wrapper .controls {
    position: absolute;
    z-index: 1001;
    top: 20px;
    left: 20px;
  }

  .game-active .instructions {
    opacity: 0;
  }

  .sense-wrapper.game-active .close-game {
    display: block;
  }

  .instructions {
    background-color: rgba(49, 54, 63, .90);
    background-image: url(/images/dweb-background.jpg);
    background-size: 300%;
    background-position: 50% 50%;
    border-radius: 10px;
    position: absolute;
    top: 0;
    left: 0;
    justify-content: center;
    display: flex;
    text-align: center;
    padding: 30px;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    z-index: 10;
  }

  .instructions.close {
    display: none;
  }

  .instructions h3, .instructions p, .instructions strong {
    color: black;
  }

  .instructions h3 {
    font-size: 24px;
  }

  .instructions p {
    font-size: 14px;
  }
  .sense {
    display: flex;
    flex-direction: column;
    margin: 0;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
  }

  .slot-details {
    max-width: 100%;
    overflow: hidden;
    position: relative;
  }
  .sense-item {
    padding: 10px;
    background-color: rgba(255,255,255,1);
    border-radius: 10px;
    width:100%; 
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 10px 15px rgba(0,0,0,.2);
    align-items: flex-start;
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
    background-color: rgba(86, 94, 109, 1.0);
    text-align: center;
    border-radius: 5px;
    height: 24px;
    margin-right: auto;
  }
  .slot-wrapper {
    padding: 5px;
    flex-direction: row;
    align-items: center;
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
    padding-top: 10px;
  }
  
  .tag {
    border: 1px solid #2F87D850;
    color: #2F87D8;
    background-color: transparent;
    margin-bottom: 0;
    display: inline;
  }

  .time {
    font-size: 12px;
    padding: 8px;
    color: white;
  }
  .date, .space {
    font-size: 12px;
    font-weight: normal;
    margin-bottom: 0;
    color: white;
  }
  .buttons {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    position: fixed;
    bottom: 20px;
    width: 100%;
    justify-content: center;
    z-index: 1;
    left: 0;
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
  .foo {
    color: red;
  }
  @media (min-width: 720px) {
    .instructions {
      background-size: 180%;
    }

    .buttons {
      position: relative;
      bottom: initial;
    }
  }
</style>