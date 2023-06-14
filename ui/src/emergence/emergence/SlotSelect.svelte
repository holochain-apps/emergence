<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/select/select.js';
  import '@shoelace-style/shoelace/dist/components/option/option.js';
  import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
  import { timeWindowStartToStr, type Slot, timeWindowDurationToStr, type Info, type Space, type TimeWindow, type SiteMap, type SessionType } from './types';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext, onMount } from 'svelte';
  import { storeContext } from '../../contexts';
  import { DateInput } from 'date-picker-svelte'

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let slot: Slot| undefined;
  export let valid: boolean = true
  export let sitemap: Info<SiteMap>| undefined
  export let sessionType: SessionType 
  export let duration: number = 1
  export let tags:Array<string> = []

  let spaceSelect: SlSelect;
  let windowSelect: SlSelect;

  let selectedSpace: string = ""
  let selectedWindow: string = ""

  $: spaces = store.sitemapFilteredSpaces()
  $: windows = store.sitemapFilteredWindows()
  $: selectedSpace, selectedWindow, slot
  $: slot && updateSelects()
  $: date, duration && _setSlot()
  onMount(() => {
  });

  const updateSelects = () => {
    if (!spaceSelect || !windowSelect) return
    if (slot) {
      if ($windows.find(w=> slot.window && w.start == slot.window.start)) {
        selectedWindow= windowSelect.value = JSON.stringify(slot.window)
      } else {
        date = slot.window ? new Date(slot.window.start) : null
      }
      selectedSpace= slot.space ? spaceSelect.value = encodeHashToBase64(slot.space) : ""
    } else {
      selectedSpace= spaceSelect.value = ""
      selectedWindow= windowSelect.value = ""
      date = null
    }
  }

  const doSelectSpace = (s: string)=> {
    selectedSpace = s
    _setSlot()
  }
  const doSelectWindow = (w: string)=> {
    date = null
    selectedWindow = w
    _setSlot()
  }

  export const setSlot = (s: Slot| undefined) => {
    slot = s
    updateSelects()
  }

  const _setSlot = () => {
    if (selectedWindow || selectedSpace || date) {
      const s = {window:undefined, space:undefined}
      if (selectedWindow) {
        s.window = JSON.parse(selectedWindow)
      }
      if (selectedSpace) {
        s.space = decodeHashFromBase64(selectedSpace)
      }
      if (date) {
        s.window = {start: date.getTime(), duration, tags}
      }
      slot = s
    } else {
      slot = undefined
      date = null      
    }
    valid = false
    if (!slot ||
      slot.window && (slot.space || sessionType.can_any_time)) {
      valid = true
    }
  }

  let date:Date|null

</script>
<div style="display:flex; flex-direction:row">
  <div style="margin-bottom: 16px; display:flex; flex-direction:column">
    
    <div style="display:flex; flex-direction:row; align-items:center;">
      <sl-select  
        style="width:320px;"
        bind:this={windowSelect}
        label="Time Slot"
        on:sl-change={(e) => doSelectWindow(e.target.value) }
      >
        <sl-option value="">No Time Selected</sl-option>
        {#each $windows as window}
          <sl-option value={JSON.stringify(window)}>{timeWindowStartToStr(window)} {timeWindowDurationToStr(window)}</sl-option>
        {/each}
      </sl-select>
      {#if sessionType.can_any_time}
        <span style="margin:0 10px 0 10px;">or</span>
        <DateInput 
          format={"yyyy-MM-dd HH:mm"}
          closeOnSelection={true} 
          placeholder={"Choose any time"}
          on:select={()=>{
            windowSelect.value = ""
            _setSlot()
          }}
          bind:value={date} />
      {/if}
      <div class="pill-button" style="display: flex; width: 75px; margin-left:20px" on:click={() => {
        slot = undefined
        updateSelects()
        }} >
        Reset
      </div>
    </div>
    <sl-select bind:this={spaceSelect}
      style="width:320px;"
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

</div>