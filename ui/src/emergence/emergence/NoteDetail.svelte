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
    import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
    import NoteCrud from './NoteCrud.svelte';
    import Confirm from './Confirm.svelte';

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let noteHash: ActionHash
    export let showAvatar = true
    export let showSession = true
    export let showTimestamp = true

    $: note = store.neededStuffStore.notes.get(noteHash)
    onDestroy(() => {
        store.neededStuffStore.notes.clear(noteHash)
    }); 

    let updateNoteDialog
    const deleteNote = ()=> {
      store.deleteNote($note.value.record.actionHash)
    }

    let showConfirm = false
</script>
{#if showConfirm}
<div class="modal">
  <Confirm message="Please confirm delete." 
    on:confirm-canceled={()=>showConfirm=false} 
    on:confirm-confirmed={deleteNote}></Confirm>
</div>
{/if}

{#if $note.status=== "pending"}
  <sl-spinner></sl-spinner>
{:else}
  <div class="note">
      {#if $note.value}
        <NoteCrud 
        bind:this={updateNoteDialog}
        sessionHash={undefined}
        on:note-updated={() => {} }
        ></NoteCrud>
        <div class="post-header">
          {#if showAvatar}
            <div class="avatar"><Avatar agentPubKey={$note.value.record.action.author}></Avatar></div>
          {/if}
          <div class="header-left">
            <div class="author-name">
              <!-- TODO: SEPERATE AUTHOR NAME AND AVATAR -->
            </div>
            {#if showTimestamp}
              <div class="post-date"> 
                {timestampToStr($note.value.record.action.timestamp)}
              </div>
            {/if}
            {#if showSession}
            <div class="post-session"> 
              Session: {store.getSession($note.value.record.entry.session).record.entry.title}
            </div>         
            {/if}
          </div>
          {#if encodeHashToBase64($note.value.record.action.author) === store.myPubKeyBase64 &&
            !$note.value.record.entry.trashed
         }
            <div class="crud">
              <sl-button style="margin-left: 8px;" size=small on:click={()=>showConfirm=true} circle>
                <Fa icon={faTrash} />
              </sl-button>
              <sl-button style="margin-left: 8px; " size=small on:click={() => { updateNoteDialog.open($note.value) } } circle>
                <Fa icon={faEdit} />
              </sl-button>        
            </div>
          {/if}
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
    font-size: 12px;
    margin-bottom: .25em;
    border: 1px solid rgba(243, 243, 245, 1.0);
    background-color: rgba(243, 243, 245, 1.0);
    color: rgba(0, 0, 0, .5);
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
