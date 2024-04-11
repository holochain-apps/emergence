<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { Record } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import TimeWindowDetail from './TimeWindowDetail.svelte';
  import type { EmergenceStore } from '../../emergence-store';


  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;

  $: timeWindows = store.timeWindows
  $: loading, error;

  onMount(async () => {
    await store.fetchTimeWindows()
    loading = false
  });

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the timeWindows: {error}.</span>
{:else if $timeWindows.length === 0}
<span>No timeWindows found.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each $timeWindows as timeWindow}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <TimeWindowDetail timeWindow={timeWindow}></TimeWindowDetail>
    </div>
  {/each}
</div>
{/if}

