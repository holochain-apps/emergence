<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { storeContext } from '../../contexts';
import SpaceDetail from './SpaceDetail.svelte';
import type { EmergenceStore } from '../../emergence-store';


let store: EmergenceStore = (getContext(storeContext) as any).getStore();

let loading = true;
let error: any = undefined;

$: spaces = store.spaces
$: loading, error;

onMount(async () => {
  await store.fetchSpaces();
  loading = false;
});

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>

</div>
{:else if error}
<span>Error fetching the spaces: {error.data.data}.</span>
{:else if $spaces.length === 0}
<span>No spaces found.</span>
{:else}
<div class="pane-content">
  <div class="pane-header">
    <h3>Spaces List</h3>
  </div>
  {#each $spaces as space}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <SpaceDetail space={space}  on:space-deleted={() => store.fetchSpaces()}></SpaceDetail>
    </div>
  {/each}
</div>
{/if}

