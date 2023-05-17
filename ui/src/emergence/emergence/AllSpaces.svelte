<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import Fa from 'svelte-fa';
import { faCircleArrowLeft, faSync } from '@fortawesome/free-solid-svg-icons';
import SpaceSummary from './SpaceSummary.svelte';
import Sync from './Sync.svelte';
import type { Info, Space } from './types';
const dispatch = createEventDispatcher();


let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;
let spaceDetail: Info<Space> | undefined

$: spaces = store.spaces
$: error, spaceDetail;

onMount(async () => {
  store.fetchSpaces();
});

</script>

<div class="pane-content">
  <div class="pane-header">
    <div style="display: flex; flex-direction: row; align-self:center">
      <h3>Spaces List</h3>

      <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('all-spaces-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      <div style="margin-left: 8px;">
        <Sync agentPubKey={undefined}></Sync>
      </div>
    </div>

  </div>
  {#if error}
    <span class="notice">Error fetching the spaces: {error.data.data}.</span>
  {:else if $spaces.length === 0}
    <span class="notice">No spaces found.</span>
  {:else}

    {#each $spaces as space}
      <div class="space">
        <SpaceSummary
          on:space-selected={()=>{store.setUIprops({spaceDetails:space.original_hash})}} 
          space={space}>
        </SpaceSummary>
      </div>
    {/each}
  {/if}
</div>

<style>
  :global(.pane-content) {
    overflow-y: auto;
    height: 95%;
  }
  .notice {
    display: block;
    text-align: center;
    padding: 25px;
  }

  .space {
    width: 100%;
    max-width: 720px;
    margin: 0 auto 10px auto;
  }
</style>
