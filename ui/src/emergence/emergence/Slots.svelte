<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import SlotDetail from './SlotDetail.svelte';
  import type { EmergenceStore } from '../../emergence-store';


  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;

  $: slots = store.slots
  $: loading, error;

  onMount(async () => {
    await store.fetchSlots()
    loading = false
  });

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the slots: {error.data.data}.</span>
{:else if $slots.length === 0}
<span>No slots found.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each $slots as slot}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <SlotDetail slot={slot}></SlotDetail>
    </div>
  {/each}
</div>
{/if}

