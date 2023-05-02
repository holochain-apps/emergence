<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { storeContext } from '../../contexts';
import SiteMapDetail from './SiteMapDetail.svelte';
import type { EmergenceStore } from '../../emergence-store';
  import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

$: sitemaps = store.maps
$: loading, error;

onMount(async () => {
  await store.fetchSiteMaps();
  loading = false;
});

</script>

<div class="pane-content">
  <div class="pane-header">
    <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('sitemaps-close') } } circle>
      <Fa icon={faCircleArrowLeft} />
    </sl-button>
  <h3>SiteMaps List</h3>
  </div>

  {#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
      <sl-spinner></sl-spinner>

    </div>
  {:else if error}
    <span>Error fetching the sitemaps: {error.data.data}.</span>
  {:else if $sitemaps.length === 0}
    <span>No sitemaps found.</span>
  {:else}
    {#each $sitemaps as sitemap}
      <div style="margin-bottom: 8px; width:500px; background:lightgray">
        <SiteMapDetail sitemap={sitemap}  on:sitemap-deleted={() => store.fetchSiteMaps()}></SiteMapDetail>
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