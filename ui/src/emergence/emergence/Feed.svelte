<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import FeedElemDetail from './FeedElemDetail.svelte';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;

  $: feed = store.feed
  $: loading, error;

  onMount(async () => {
    await store.fetchFeed();
    loading = false
  });

</script>
{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the feed: {error.data.data}.</span>
{:else if $feed.length === 0}
<span>No Activity</span>
{:else}
<div class="pane-content">
  <div class="pane-header">
    <h3>Feed</h3>
  </div>
  {#each $feed as f}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <FeedElemDetail feedElem={f}></FeedElemDetail>
    </div>
  {/each}
</div>
{/if}

