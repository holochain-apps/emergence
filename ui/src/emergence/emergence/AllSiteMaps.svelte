<script lang="ts">
import { onMount, getContext, createEventDispatcher } from 'svelte';
import type { Record  } from '@holochain/client';
import { storeContext } from '../../contexts';
import SiteMapDetail from './SiteMapDetail.svelte';
import type { EmergenceStore } from '../../stores/emergence-store';
import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
  import SiteMapCrud from './SiteMapCrud.svelte';

const dispatch = createEventDispatcher();

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let error: any = undefined;
let createSiteMapDialog: SiteMapCrud

$: sitemaps = store.maps
$: error;

onMount(async () => {
  store.fetchSiteMaps();
});
       

</script>

<SiteMapCrud
  bind:this={createSiteMapDialog}
  on:space-created={() => {} }
></SiteMapCrud>

<div class="pane-header">
  <div class="header-content">
    <h3>SiteMaps List</h3>
    <div class="section-controls">
      <sl-button style="margin-left: 8px; " on:click={() => { dispatch('sitemaps-close') } } circle>
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      <div class="pill-button" on:click={() => {createSiteMapDialog.open(undefined) } }>
        <span>+</span> Create
      </div>
    </div>
  </div>

</div>
<div class="pane-content">
  {#if error}
    <span>Error fetching the sitemaps: {error}.</span>
  {:else if $sitemaps.length === 0}
    <span>No sitemaps found.</span>
  {:else}
    {#each $sitemaps as sitemap}
      <div style="margin-bottom: 8px;" class="card">
        <SiteMapDetail sitemap={sitemap}  on:sitemap-deleted={() => store.fetchSiteMaps()}></SiteMapDetail>
      </div>
    {/each}
  {/if}
</div>

<style>
</style>
