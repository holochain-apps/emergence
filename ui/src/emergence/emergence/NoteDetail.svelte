<script lang="ts">
    import { encodeHashToBase64, type ActionHash } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { createEventDispatcher, onMount, getContext } from 'svelte';
    import Avatar from './Avatar.svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import { onDestroy } from 'svelte';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let noteHash: ActionHash
    export let showAvatar = true

    $: note = store.neededStuffStore.notes.get(noteHash)
    onDestroy(() => {
        store.neededStuffStore.notes.clear(noteHash)
    }); 

</script>

{#if $note.status=== "pending"}
  <sl-spinner></sl-spinner>
{:else}
  <div class="note">
      {#if $note.value}
        <div class="post-header">
          {#if showAvatar}
            <div class="avatar"><Avatar agentPubKey={$note.value.record.action.author}></Avatar></div>
          {/if}
          <div class="header-left">
            <div class="author-name">
              <!-- TODO: SEPERATE AUTHOR NAME AND AVATAR -->
            </div>
            <div class="post-date"> 
              <!-- TODO: DATE -->
            </div>
            <div class="post-session"> 
              <!-- TODO: SESSION -->
            </div>         
          </div>
        </div>

        <div class="post-content">
          {$note.value.record.entry.text}
        </div>
        <div class="tags">
          {#each $note.value.record.entry.tags as tag}
            <div class="tag">{tag}</div>
          {/each}
        </div>
        {#if $note.value.record.entry.pic}
          <div class="post-pic">
          <show-image image-hash={encodeHashToBase64($note.value.record.entry.pic)}></show-image>
          </div>
        {/if}
      {:else}
        Not found on DHT
      {/if}
  </div>
{/if}

<style>
  .note{
    margin: .5em;
    border: 1px solid #e9e9e9;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
    border-radius: 3px;
    background-color: white;
    padding: .5em;
  }  
  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .25em;
  }
  .header-left {
    display: flex;
    flex-direction: column;
    margin-left: 1em;
  }
  .author-name {
    font-weight: bold;
  }
  .post-date {
    font-size: 0.9em;
  }  
  .avatar {
    font-weight: bold;
    margin-right: 10px;
    display: flex;
  }
  .post-content {
    margin-bottom: .25em;
    font-size: 1.1em;
  }
  :global(.tags) {
    display: flex;
    margin-bottom: .25em;
    font-size: .9em;
    padding: 0px;
  }
  .post-pic {
    /*TODO: figure out best way to control content width 
    higher up the dom like at the pane level 
    so that images can take up 100% width of the post*/
    width: 300px;
    margin: 0 auto;
    margin:auto;
  }
  :global(.tag) {
    color: white;
    background-color: gray;
    border-radius: 7px;
    padding: 5px;
    margin-right: 5px;
    padding-top: 0px;
    padding-bottom: 0px;
    margin-bottom: .25em;
  }



  /*debug*/
  /*
  .avatar{
    background-color: #FF0000;
  }
  .post-pic{
    background-color: #00FF00;
  }
  .post-content{
    background-color: #FF00FF;
  }
  .post-tags{
    background-color: #0000FF;
  }
  */
</style>