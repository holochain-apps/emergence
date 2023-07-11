<script lang="ts">
    import { encodeHashToBase64, type ActionHash } from '@holochain/client15';
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
    import SessionLink from './SessionLink.svelte';

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

    let confirmDialog
    $: uiProps = store.uiProps

</script>
  <Confirm 
    bind:this={confirmDialog}
    message="Please confirm delete." 
    on:confirm-confirmed={deleteNote}></Confirm>

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
            <div style="display:flex">
            "{$note.value.record.entry.text.length > 50 ? 
              `${$note.value.record.entry.text.substring(0,50)}...` : 
              $note.value.record.entry.text}"
            {#if showSession}
              in session <SessionLink sessionHash={$note.value.record.entry.session}></SessionLink>
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
      {:else}
        Not found on DHT
      {/if}
  </div>
{/if}

<style>
  .note{
    background-color: white;
    display:flex;
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
