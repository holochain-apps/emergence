<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
  import { timeWindowStartToStr, type Slot, timeWindowDurationToStr, type Info, type Space, type TimeWindow, type SiteMap } from './types';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext, onMount } from 'svelte';
  import { storeContext } from '../../contexts';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let slot: Slot| undefined;
  export let valid: boolean = true
  export let sitemap: Info<SiteMap>| undefined

  let spaceSelect: SlSelect;
  let windowSelect: SlSelect;

  let selectedSpace: string = ""
  let selectedWindow: string = ""

  $: spaces = store.sitemapFilteredSpaces()
  $: windows = store.sitemapFilteredWindows()
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
    _setSlot()
  }
  const doSelectWindow = (w: string)=> {
    selectedWindow = w
    _setSlot()
  }

  export const setSlot = (s: Slot| undefined) => {
    slot = s
    updateSelects()
  }

  const _setSlot = () => {
    valid = true
    if (selectedSpace && selectedWindow) {
      slot = {window: JSON.parse(selectedWindow), space: decodeHashFromBase64(selectedSpace)}
    } else {
      if (selectedSpace || selectedWindow) valid = false
      slot = undefined
    }
  }

</script>

<div style="margin-bottom: 16px; display:flex; flex-direction:column">
  <div class="pill-button" style="display: flex; width: 75px; align-self: end;" on:click={() => {
    slot = undefined
    updateSelects()
    }} >
    Reset
  </div>
  <sl-select bind:this={spaceSelect}
    label="Space"
    value={selectedSpace}
    on:sl-change={(e) => doSelectSpace(e.target.value) }
  >
  <sl-option value="">No Space Selected</sl-option>
  {#each $spaces as space}
  <sl-option value={encodeHashToBase64(space.record.actionHash)}>{space.record.entry.name}{#if space.record.entry.key} ({space.record.entry.key}){/if}</sl-option>
  {/each}
  </sl-select>
</div>
<div style="margin-bottom: 16px">
  <sl-select bind:this={windowSelect}
    label="Time Slot"
    on:sl-change={(e) => doSelectWindow(e.target.value) }
  >
  <sl-option value="">No Slot Selected</sl-option>
  {#each $windows as window}
    <sl-option value={JSON.stringify(window)}>{timeWindowStartToStr(window)} {timeWindowDurationToStr(window)}</sl-option>
  {/each}
  </sl-select>
</div>
