<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { clientContext } from '../../contexts';
import type { EmergenceSignal, Slot } from './types';
  import SlotDetail from './SlotDetail.svelte';


let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let slots: Array<Slot> | undefined;
let loading = true;
let error: any = undefined;

$: slots, loading, error;

onMount(async () => {

  await fetchSlots();
  // client.on('signal', signal => {
  //   if (signal.zome_name !== 'emergence') return;
  //   const payload = signal.payload as EmergenceSignal;
  //   if (payload.type !== 'EntryCreated') return;
  //   if (payload.app_entry.type !== 'Slot') return;
  //   hashes = [...hashes, payload.action.hashed.hash];
  // });
});

async function fetchSlots() {
  try {
    slots = await client.callZome({
      cap_secret: null,
      role_name: 'emergence',
      zome_name: 'emergence',
      fn_name: 'get_slots',
      payload: null,
    });
  } catch (e) {
    error = e;
  }
  loading = false;
}

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <sl-spinner></sl-spinner>
</div>
{:else if error}
<span>Error fetching the slots: {error.data.data}.</span>
{:else if slots.length === 0}
<span>No slots found.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each slots as slot}
    <div style="margin-bottom: 8px; width:500px; background:lightgray">
      <SlotDetail slot={slot}></SlotDetail>
    </div>
  {/each}
</div>
{/if}

