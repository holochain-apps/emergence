<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
import '@shoelace-style/shoelace/dist/components/dialog/dialog';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';

const dispatch = createEventDispatcher();

export let message = ""
export let details = ""
export let noConfirm = ""
let store: EmergenceStore = (getContext(storeContext) as any).getStore();

$: uiProps = store.uiProps

let dialog: SlDialog
let clearConfirm = false
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
  {#if details}
    <div style="color:gray;margin-bottom:20px">
      {details}
    </div>
  {/if}
  {#if noConfirm}
    <div style="margin-bottom:16px" >
      <sl-checkbox on:sl-change={e => { clearConfirm = e.target.checked;}}>Don't ask to confirm again.</sl-checkbox>
    </div>
  {/if}
  <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => {dialog.hide(); dispatch('confirm-canceled')}}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => {
        if (noConfirm && clearConfirm) {
          const props = {}
          props[noConfirm] = false
          store.setUIprops(props)
        }
        dialog.hide(); dispatch('confirm-confirmed')
        }}
      variant=primary>Confirm</sl-button>
    </div>
</div>
</sl-dialog>
