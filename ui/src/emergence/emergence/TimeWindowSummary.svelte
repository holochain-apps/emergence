<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import type { Record, ActionHash, AppAgentClient, EntryHash, AgentPubKey, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import { timeWindowStartToStr, timeWindowDurationToStr, type TimeWindow } from './types';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@material/mwc-snackbar';
import '@shoelace-style/shoelace/dist/components/button/button.js';
  import Slot from './Slot.svelte';

export let timeWindow: TimeWindow;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

</script>


<div class="slot">
  { timeWindowStartToStr(timeWindow) } for { timeWindowDurationToStr(timeWindow) } {timeWindow.tags.length > 0 ? timeWindow.tags.join(", ") : "" }
</div>

<style>
  .slot{
    margin-left:5px;
  }
</style>
