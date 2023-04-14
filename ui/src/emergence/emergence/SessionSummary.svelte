<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { storeContext } from '../../contexts';
import type { EmergenceStore  } from '../../emergence-store';
import type { Slot, Session, Info } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';

const dispatch = createEventDispatcher();

export let session: Info<Session>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = false;

let slot:Slot|undefined = undefined

$: loading, session, slot;

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
<div class="summary" on:click={()=>{dispatch('session-selected', session); }}>
  <div class="slot">
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
    <span style="margin-right: 4px"><strong>Title:</strong></span>
    <span style="white-space: pre-line">{ session.record.entry.title }</span>
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
    padding: 5px;
  }
</style>