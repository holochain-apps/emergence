<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';

const dispatch = createEventDispatcher();

export let message = ""

onMount(() => {
});


</script>
<div style="display: flex; flex-direction: column">
  <div>
    <h2>Are you sure?</h2>
    {#if message}
    {message}
    {/if}
  </div>
    <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => dispatch('confirm-canceled')}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => dispatch('confirm-confirmed')}
      variant=primary>Confrim</sl-button>
    </div>
</div>
