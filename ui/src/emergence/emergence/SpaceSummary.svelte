<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import { storeContext } from '../../contexts';
import { amenitiesList, timeWindowDurationToStr, type Info, type Space, timeWindowStartToStr, type SlottedSession } from './types';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import Fa from 'svelte-fa'
import { faFlag } from '@fortawesome/free-solid-svg-icons';
import type { EmergenceStore } from '../../emergence-store';
import Avatar from './Avatar.svelte';
import { encodeHashToBase64 } from '@holochain/client';
import {ActionHashMap } from '@holochain-open-dev/utils';

const dispatch = createEventDispatcher();

export let space: Info<Space>;

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

let errorSnackbar: Snackbar;
  
$: error, loading, space;

onMount(async () => {
  if (space === undefined) {
    throw new Error(`The space input is required for the SpaceSummary element`);
  }
  loading=false
});

$: slottedSessions = store.getSlottedSessions(space)

const getSlottedSessions = () :Array<SlottedSession>=> {

  const sessions:  ActionHashMap<SlottedSession> = new ActionHashMap()
  space.relations.forEach(ri => {
    if (ri.relation.content.path == "space.sessions") {
      const session = store.getSession(ri.relation.dst)
      const slot = store.getSessionSlot(session)
      if (slot && encodeHashToBase64(slot.space) == encodeHashToBase64(space.original_hash)) {
        const s = sessions.set(session.original_hash, {session,window:JSON.parse(ri.relation.content.data)})
      }
    }
  })
  return Array.from(sessions.values())
}
const slottedSessionSummary = (ss: SlottedSession) : string => {
  return `${ss.session.record.entry.title} ${timeWindowStartToStr(ss.window)} for ${timeWindowDurationToStr(ss.window)}`
}
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


<div class="SpaceSummary card summary"
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
      <div class="sessions">
        <sl-tooltip >
          <ul slot="content">
            {#if slottedSessions.length == 0}
              No Sessions Scheduled
            {:else}
              {#each slottedSessions as session}
                <li>{slottedSessionSummary(session)}</li>
              {/each}
            {/if}
          </ul>
          <span style="margin-right:5px">{slottedSessions.length}</span><Fa icon={faFlag}></Fa>
        </sl-tooltip>
      </div>
    </div>
    <div class="amenities">
      {amenitiesList(space.record.entry.amenities).join(", ")}
    </div>
  </div>
  
</div>
{/if}

<style>
  .summary {
    display: flex;
    flex-direction: row;
    width: 100%;
  }
  .name-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    font-weight: bold;
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
  .amenities {
    display: flex;
    font-size: 12px;
    opacity: .5;
    flex-direction: row;
  }

  .info {
    justify-content: center;
    padding: 0 15px;
  }

  .sessions {
    display: flex;
    flex-direction: row;
  }
  .stewards {
    display: flex;
    flex-direction: row;
  }
  .pic {
    width: 100px;
    border-radius: 10px 0 0 10px;
  }

  .pic img {
    border: 1px solid red;
  }
</style> 