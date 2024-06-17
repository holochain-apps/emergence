<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
  import { createEventDispatcher, getContext } from "svelte";
  import type {  WALUrl } from "./utils";
  import { weaveUrlToWAL } from "@lightningrodlabs/we-applet";
  import SvgIcon from "./SvgIcon.svelte";
  import { hrlToString } from "@holochain-open-dev/utils";
  import '@lightningrodlabs/we-elements/dist/elements/wal-embed.js';
  import type { WeaveClient } from '@lightningrodlabs/we-applet';
  import { frameContext } from "../../contexts";

  const dispatch = createEventDispatcher()

  export let attachments: Array<WALUrl>
  export let allowDelete = true

  const { getFrame } :any = getContext(frameContext);
  let frameClient: WeaveClient = getFrame();

  let embedLink

</script>
{#if embedLink>=0 && attachments.length>0}
  <wal-embed
    class="embed"
    style="margin-top: 20px;"
    src={attachments[embedLink]}
    closable
    on:open-in-sidebar={() => embedLink = -1}
    on:close={() => embedLink = -1}
      ></wal-embed>
{/if}
<div class="attachments-list">
  {#each attachments as attachment, index}
    {@const wal = weaveUrlToWAL(attachment)}
    <div 
      class:attachment-item-with-delete={allowDelete}
      class:attachment-item={!allowDelete}
    >
      {#await frameClient.assetInfo(wal)}
        <div style="cursor:pointer; padding: 0 5px 0 5px; border: dashed 1px;margin-right:5px" title={`Resolving WAL: ${hrlToString(wal.hrl)}?${JSON.stringify(wal.context)}`}> ...</div>
      {:then data}
        {#if data}
          {@const assetInfo = data.assetInfo}
          <sl-button  size="small"
            on:click={async (e)=>{
                e.stopPropagation()
                try {
  //                embedLink = index
                  await frameClient.openWal(wal)
                } catch(e) {
                  alert(`Error opening link: ${e}`)
                }
              }}
            style="display:flex;flex-direction:row;margin-right:5px"><sl-icon src={assetInfo.icon_src} slot="prefix"></sl-icon>
            {assetInfo.name}
          </sl-button>
        {:else} 
        <div style="color:red; cursor:pointer; padding: 0 5px 0 5px; border: dashed 1px;margin-right:5px" title={`Failed to resolve WAL: ${hrlToString(wal.hrl)}?${JSON.stringify(wal.context)}`}>Bad WAL</div>

        {/if}
      {:catch error}
        <div style="color:red">Error getting asset info: {error}</div>
      {/await}
      {#if allowDelete}
        <sl-button size="small"
          on:click={()=>{
            dispatch("remove-attachment",index)
          }}
        >
          <SvgIcon icon=faTrash size=12 />
        </sl-button>
      {/if}
</div>
  {/each}
</div>
<style>
  .attachments-list {
    display:flex;
    flex-direction:row;
    flex-wrap: wrap;
    align-items: center;
  }
  .attachment-item {
  }
  .attachment-item-with-delete {
    border:1px solid #aaa; 
    background-color:rgba(0,255,0,.1); 
    padding:4px;
    display:flex;
    margin-right:4px;
    border-radius:4px;
  }
  .embed {
    position: fixed;
    top: 84px;
    z-index: 100;
  }
</style>
