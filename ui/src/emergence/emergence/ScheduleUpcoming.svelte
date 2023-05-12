<script lang="ts">
    import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import { createEventDispatcher, getContext, onMount } from "svelte";
    import Fa from "svelte-fa";
    import { faCalendarTimes } from "@fortawesome/free-solid-svg-icons";
    import SpaceEvents from "./SpaceEvents.svelte";
    import type { Info, SlottedSession, Space } from "./types";
    import { encodeHashToBase64 } from "@holochain/client";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    const dispatch = createEventDispatcher();

    onMount(() => {
    })
    $: spaces = store.spaces
    $: sortedSpaces = sortSpaces($spaces)
    interface SlottedSessionSpace {
      ss: SlottedSession,
      space: Info<Space>
    }
    const sortSpaces = (spaces) => {
      let slottedSessionSpaces:Array<SlottedSessionSpace> = []
      for (const space of spaces) {
        const sss = store.getSlottedSessions(space).map(ss=> {return {ss,space}})
        slottedSessionSpaces = slottedSessionSpaces.concat(sss)
      }
      let sortedSpaces = slottedSessionSpaces.sort((a,b)=>a.ss.window.start-b.ss.window.start).map(sss => sss.space)
      // remove dups
      for (let i = sortedSpaces.length-1; i >=0; i-=1) {
        const j = sortedSpaces.findIndex(s=>encodeHashToBase64(s.original_hash) == encodeHashToBase64(sortedSpaces[i].original_hash))
        if (j >= 0 && j != i) {
          sortedSpaces.splice(i,1)
        }
      }
      return sortedSpaces
    }

</script>


<div class="pane-header">
  <h3>Upcoming Events</h3>
  <div style="display:flex">
    <sl-button style="margin: 8px;" size=small on:click={() => {  dispatch('open-slotting')} } circle>
      <Fa icon={faCalendarTimes} />
    </sl-button>
  </div>
</div>

<div class="pane-content">
  {#each sortedSpaces as space}
    <div class="event-row">
      <SpaceEvents
        on:session-selected={(event)=>{dispatch('session-selected', event.detail)}} 
        space={space}
        >
      </SpaceEvents>
    </div>
  {/each}
</div>
<style>

</style>