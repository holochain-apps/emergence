<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
  import { timeWindowStartToStr, type Slot, timeWindowDurationToStr } from './types';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext, onMount } from 'svelte';
  import { storeContext } from '../../contexts';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let slot: Slot| undefined;
  export let valid: boolean = true

  let spaceSelect: SlSelect;
  let windowSelect: SlSelect;

  let selectedSpace: string = ""
  let selectedWindow: string = ""

  $: spaces = store.spaces
  $: windows = store.timeWindows
  $: selectedSpace, selectedWindow, slot
  $: slot && updateSelects()

  onMount(() => {
  });

  const updateSelects = () => {
    if (slot) {
      selectedSpace= spaceSelect.value = encodeHashToBase64(slot.space)
      selectedWindow= windowSelect.value = JSON.stringify(slot.window)
    } else {
      selectedSpace= spaceSelect.value = ""
      selectedWindow= windowSelect.value = ""
    }
  }

  const doSelectSpace = (s: string)=> {
    selectedSpace = s
    setSlot()
  }
  const doSelectWindow = (w: string)=> {
    selectedWindow = w
    setSlot()
  }

  const setSlot = () => {
    valid = true
    if (selectedSpace && selectedWindow) {
      slot = {window: JSON.parse(selectedWindow), space: decodeHashFromBase64(selectedSpace)}
    } else {
      if (selectedSpace || selectedWindow) valid = false
      slot = undefined
    }
  }

</script>

<div style="margin-bottom: 16px">
  <sl-select bind:this={spaceSelect}
    label="Space"
    value={selectedSpace}
    on:sl-change={(e) => doSelectSpace(e.target.value) }
  >
  <sl-option value="">No Space Selected</sl-option>
  {#each $spaces as space}
  <sl-option value={encodeHashToBase64(space.record.actionHash)}>{space.record.entry.name}</sl-option>
  {/each}
  </sl-select>
</div>
<div style="margin-bottom: 16px">
  <sl-select bind:this={windowSelect}
    label="Time Window"
    on:sl-change={(e) => doSelectWindow(e.target.value) }
  >
  <sl-option value="">No Time Window Selected</sl-option>
  {#each $windows as window}
    <sl-option value={JSON.stringify(window)}>{timeWindowStartToStr(window)} {timeWindowDurationToStr(window)}</sl-option>
  {/each}
  </sl-select>
</div>
