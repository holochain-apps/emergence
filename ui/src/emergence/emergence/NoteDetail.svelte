<script lang="ts">
    import { encodeHashToBase64, type ActionHash } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { createEventDispatcher, getContext } from 'svelte';
    import Avatar from './Avatar.svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import { onDestroy } from 'svelte';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
    import { timestampToStr } from './types';
    import Fa from 'svelte-fa';
    import { faChevronDown, faChevronUp, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
    import NoteCrud from './NoteCrud.svelte';
    import Confirm from './Confirm.svelte';
    import SessionLink from './SessionLink.svelte';
    import ShowFile from './ShowFile.svelte';
    import { Marked } from "@ts-stack/markdown";
    import { truncateText } from './utils';

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let noteHash: ActionHash
    export let showAvatar = true
    export let showSession = true
    export let showTimestamp = true
    export let showFrame = false
    export let showDeleted = true

    let collapsed = true

    $: note = store.neededStuffStore.notes.get(noteHash)
    $: uiProps = store.uiProps

    $: session = $note.value?  store.getSession($note.value.record.entry.session) : undefined

      onDestroy(() => {
        store.neededStuffStore.notes.clear(noteHash)
    }); 

    let updateNoteDialog
    const deleteNote = ()=> {
      store.deleteNote($note.value.record.actionHash)
    }

    let confirmDialog
</script>
  <Confirm 
    bind:this={confirmDialog}
    message="Please confirm delete." 
    on:confirm-confirmed={deleteNote}></Confirm>

{#if $note.status=== "pending"}
  <sl-spinner></sl-spinner>
{:else}
  <div class="note {showFrame ? "note-frame" : ""} {!showDeleted &&  $note.value.record.entry.trashed ? "hidden" : ""}">
    {#if $note.value}
        <NoteCrud 
        bind:this={updateNoteDialog}
        sessionHash={undefined}
        on:note-updated={() => {} }
        ></NoteCrud>
        <div class="post-header">
          <div class="header-left">
            {#if showAvatar}
              <div class="avatar"><Avatar agentPubKey={$note.value.record.action.author}></Avatar></div>
            {/if}
            <div class="author-name">
              <!-- TODO: SEPERATE AUTHOR NAME AND AVATAR -->
            </div>
            {#if showTimestamp}
              <div class="post-date"> 
                {timestampToStr($note.value.record.action.timestamp)}
              </div>
            {/if}
          </div>
          {#if encodeHashToBase64($note.value.record.action.author) === store.myPubKeyBase64 &&
            !$note.value.record.entry.trashed
          }
            <div class="crud">
              <sl-button style="margin-left: 8px;" on:click={()=>confirmDialog.open()} circle>
                <Fa icon={faTrash} />
              </sl-button>
              <sl-button style="margin-left: 8px; " on:click={() => { updateNoteDialog.open($note.value) } } circle>
                <Fa icon={faEdit} />
              </sl-button>        
            </div>
          {/if}
     </div>
     {#if $uiProps.debuggingEnabled}
       <div style="display: flex; flex-direction: row; margin-bottom: 16px">
          <span style="margin-right: 4px"><strong>Deleted:</strong></span>
          <span style="white-space: pre-line">{$note.value.record.entry.trashed}</span>
        </div>
        <div style="display: flex; flex-direction: row; margin-bottom: 16px">
          <span style="margin-right: 4px"><strong>Original Hash:</strong></span>
          <span style="white-space: pre-line">{ encodeHashToBase64($note.value.original_hash) }</span>
        </div>
        <div style="display: flex; flex-direction: row; margin-bottom: 16px">
            <span style="margin-right: 4px"><strong>Action Hash:</strong></span>
          <span style="white-space: pre-line">{ encodeHashToBase64($note.value.record.actionHash) }</span>
        </div>
      {/if}     
        {#if showSession}
        <div class="post-session"> 
          <strong>{ session && session.record.entry.trashed ? "Deleted ":""}Session:</strong>
           {#if  session}<SessionLink sessionHash={$note.value.record.entry.session}></SessionLink> {:else}unknown{/if}
        </div>         
        {/if}

        <div class="post-content"
        >
          {@html Marked.parse(collapsed ? truncateText($note.value.record.entry.text, 330) : $note.value.record.entry.text)}
          {#if $note.value.record.entry.text.length > 330 }
              <sl-button style="margin-left: 8px;" on:click={()=> collapsed = !collapsed} circle>
                <Fa icon={collapsed ? faChevronUp : faChevronDown} />
              </sl-button>
          {/if}
        </div>
        <div class="tags">
          {#each $note.value.record.entry.tags as tag}
            <div class="tag">#{tag}</div>
          {/each}
        </div>
        {#if $note.value.record.entry.pic}
          <div class="post-pic">
            <ShowFile fileHash={$note.value.record.entry.pic}></ShowFile>
<!-- 
          <show-image image-hash={encodeHashToBase64($note.value.record.entry.pic)}></show-image> -->
          </div>
        {/if}
      {:else}
        Not found on DHT
      {/if}
  </div>
{/if}

<style>
  .note{
    background-color: white;
  }
  .hidden {
    display: none;
  }
  .note-frame {
    border-top: 1px solid #e9e9e9;
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.25);
    border-radius: 10px;
    margin: .5em;
    padding: 15px;
  }
  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .25em;
  }
  .post-session {
    display: flex;
  }
  .header-left {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .author-name {
    font-weight: bold;
  }
  .post-date {
    font-size: 11px;
    opacity: .4;
  }  
  .avatar {
    font-weight: bold;
    margin-right: 10px;
    display: flex;
  }
  .post-content {
    margin-bottom: .25em;
    font-size: 1.1em;
    overflow: hidden;
  }
  
  .post-pic {
    /*TODO: figure out best way to control content width 
    higher up the dom like at the pane level 
    so that images can take up 100% width of the post*/
    max-width: 680px;
    margin: 0 auto;
    margin:auto;
  }

  .tags {
    display: block;
    padding-top: 8px;
  }

  .tag {
    display: inline;
    border: 1px solid #2F87D840;
    color: #2F87D8;
    background-color: transparent;
    margin-bottom: 0;
    display: inline;
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
