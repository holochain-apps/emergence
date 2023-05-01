<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { storeContext } from '../../contexts';
import SpaceDetail from './SpaceDetail.svelte';
import type { EmergenceStore } from '../../emergence-store';
import Fa from 'svelte-fa';
import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import SpaceSummary from './SpaceSummary.svelte';
import type { Info, Space } from './types';
const dispatch = createEventDispatcher();


let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;
let spaceDetail: Info<Space> | undefined

$: spaces = store.spaces
$: loading, error, spaceDetail;

onMount(async () => {
  await store.fetchSpaces();
  loading = false;
});

</script>

<div class="pane-content">
  <div class="pane-header">
      <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('all-spaces-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>

    <h3>Spaces List</h3>
  </div>
  {#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
      <sl-spinner></sl-spinner>

    </div>
  {:else if error}
    <span>Error fetching the spaces: {error.data.data}.</span>
  {:else if $spaces.length === 0}
    <span>No spaces found.</span>
  {:else}
    {#if spaceDetail}
    <div class="modal">
      <SpaceDetail
        on:close-space-detail={()=>spaceDetail = undefined} 
        space={spaceDetail}>
      </SpaceDetail>
    </div>
    {/if}


    {#each $spaces as space}
      <div style="margin-bottom: 8px; width:100%;">
        <SpaceSummary
          on:space-selected={()=>spaceDetail=space} 
        space={space}></SpaceSummary>
      </div>
    {/each}
  {/if}
</div>

<style>
  :global(.pane-content) {
    overflow-y: auto;
    height: 95%;
  }
</style>