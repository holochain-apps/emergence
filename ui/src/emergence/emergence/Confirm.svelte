<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';

const dispatch = createEventDispatcher();

export let message = ""
let dialog: SlDialog
onMount(() => {
});

export const open = ()=>{
  dialog.show()
}

</script>
<sl-dialog
  bind:this={dialog}
  label={message ? message : "Are you sure?"}>
<div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => {dialog.hide(); dispatch('confirm-canceled')}}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => {dialog.hide(); dispatch('confirm-confirmed')}}
      variant=primary>Confirm</sl-button>
    </div>
</div>
</sl-dialog>
