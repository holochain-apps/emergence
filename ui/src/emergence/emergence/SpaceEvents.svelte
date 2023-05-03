<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import { storeContext } from '../../contexts';
import type {  Info, Space,  Session,  TimeWindow } from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import Avatar from './Avatar.svelte';
import { encodeHashToBase64,  } from '@holochain/client';
import SessionSummary from './SessionSummary.svelte';

const dispatch = createEventDispatcher();


interface SlottedSession {
  session: Info<Session>,
  window: TimeWindow,
}

export let space: Info<Space>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

let errorSnackbar: Snackbar;
  
$: error, loading, space;

onMount(async () => {
  if (space === undefined) {
    throw new Error(`The space input is required for the SpaceDetail element`);
  }
  loading=false
});

$: slottedSessions = store.getSlottedSessions(space).slice(0, 2)

</script>

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the space: {error.data.data}</span>
{:else}

<div class="events">
  <div class="summary"
    on:click={() => dispatch('space-selected', space)}
  >
    <div class="pic">
      {#if space.record.entry.pic}
      <show-image image-hash={encodeHashToBase64(space.record.entry.pic)}></show-image>
      {:else}
      No Pic
      {/if}
      
    </div>
    <div class="info">
      <div class="name-row">
        <div class="name">
          <sl-tooltip placement="top-start" content={space.record.entry.description}>
            <span>{ space.record.entry.name }{#if space.record.entry.key} ({space.record.entry.key}){/if}</span>
          </sl-tooltip>
        </div>
      </div>
      <div class="stewards">
        {#each space.record.entry.stewards as steward}
          <Avatar agentPubKey={steward}></Avatar>
        {/each}
      </div>
    </div>
  </div>
  <div class="sessions">
        {#if slottedSessions.length == 0}
          No Sessions Scheduled
        {:else}
          {#each slottedSessions as session}
            <div class="session">
              <SessionSummary showSlot={true} session={session.session}></SessionSummary>
            </div>
          {/each}
        {/if}
  </div>
</div>
{/if}

<style>
  .events {
    display: flex;
  }
  .summary {
    display: flex;
    flex-direction: row;
    border: solid 1px gray;
  }
  .name-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  .name {
    flex: 1;
  }
  .info {
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 5px;

  }
  .sessions {
    display: flex;
    flex-direction: row;
  }
  .session {
    display: flex;
    flex-direction: row;
    border: solid 1px gray;
  }
  .stewards {
    display: flex;
    flex-direction: row;
  }
  .pic {
     width: 100px;
     border-right: solid 1px gray;
  }
</style> 