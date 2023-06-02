<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record } from '@holochain/client';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import Fa from 'svelte-fa';
import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import SpaceSummary from './SpaceSummary.svelte';
import SpaceCrud from './SpaceCrud.svelte';
import { DetailsType, type Info, type Space } from './types';

const dispatch = createEventDispatcher();


let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let error: any = undefined;
let spaceDetail: Info<Space> | undefined
let createSpaceDialog: SpaceCrud

$: spaces = store.spaces
$: error, spaceDetail;
$: uiProps = store ? store.uiProps : undefined

onMount(async () => {
  store.fetchSpaces();
});

</script>
<SpaceCrud
bind:this={createSpaceDialog}
on:space-created={() => {} }
></SpaceCrud>
<div class=" pane-header">
  <div class="header-content">
    <h3>Spaces List</h3>
    <div class="section-controls">
      <sl-button style="margin-left: 8px; " on:click={() => { dispatch('all-spaces-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      {#if $uiProps.amSteward}
        <div class="pill-button" on:click={() => {createSpaceDialog.open(undefined) } }>
          <span>+</span> Create
        </div>
      {/if}
    </div>
  </div>

</div>
<div class="">

  {#if error}
    <span class="notice">Error fetching the spaces: {error.data.data}.</span>
  {:else if $spaces.length === 0}
    <span class="notice">No spaces found.</span>
  {:else}

    {#each $spaces as space}
      <div class="space">
        <SpaceSummary
          on:space-selected={()=>{store.openDetails(DetailsType.Space, space.original_hash)}} 
          space={space}>
        </SpaceSummary>
      </div>
    {/each}
  {/if}
</div>

<style>
  .pill-button {
    margin-left: 10px;
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
