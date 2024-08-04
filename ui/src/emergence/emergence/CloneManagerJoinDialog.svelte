<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import { decodeDnaJoiningInfo } from "./dnaJoiningInfo";
  import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
  import SvgIcon from './SvgIcon.svelte';
  
  let dialog: SlDialog;
  let saving = false;
  let joiningCode = "";
  let error;
  
  export let handleJoin;
  export const open = ()=> {
    dialog.show()
  };
  const close = () => {
    joiningCode = "";
    error = undefined;
    dialog.hide();
  };
  const join = async () => {
    saving = true
    try {
      await handleJoin(decodeDnaJoiningInfo(joiningCode));
      close();
    } catch (e) {
      error = e;
    }
    saving = false
  };
  
  
  $: valuesValid = joiningCode.length > 0;
</script>

<sl-dialog bind:this={dialog} label="Join Network"
on:sl-initial-focus={(e)=>{
  e.preventDefault()
}}
on:sl-request-close={(event)=>{
  if (event.detail.source === 'overlay') {
    event.preventDefault();    
  }}}
  on:sl-hide={(e) => {
    e.preventDefault()
    close();
  }}
  >
  <div class='board-editor'>
    <div class="edit-title setting">
      <div class="title-text">Joining Code</div> <sl-input class='textarea' value={joiningCode}  on:input={e=> joiningCode = e.target.value}></sl-input>
    </div>
    
    <div class='controls'>
      <sl-button on:click={close} class="board-control">
        Cancel
      </sl-button>
      
      <sl-button class="board-control"
      variant="primary"
      disabled={!valuesValid || saving} 
      style="margin-left:10px; width:70px;" on:click={join}>
      
      {#if saving}
      <div class="spinning"><SvgIcon icon=faSpinner></SvgIcon></div>
      {:else}
      Join
      {/if}
      
    </sl-button>
  </div>
  <div style="margin-top: 10px">
    {#if error}
    Error: {error}
    {/if}
  </div>
</div>
</sl-dialog>

<style>
  .board-editor {
    display: flex;
    flex-basis: 270px;
    font-style: normal;
    font-weight: 600;
    flex-direction: column;
    justify-content: flex-start;
  }
  .textarea {
    width: 100%;
    padding: 5px;
    margin-right: 5px;
    font-weight: normal;
  }
  
  .setting {
    background-color: white;
    margin-bottom: 15px;
    box-shadow: 0px 2px 3px rgba(35, 32, 74, 0.15);
    font-size: 12px;
    line-height: 16px;
    color: #23204A;
    border-radius: 5px;
    display:flex;
    flex-direction:column;
    padding: 10px;
    transition: all .25s ease;
    height: 0;
    height: auto;
  }
  
  .controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    padding-left: 7px;
    padding-top: 10px;
  }
  
  .board-control {
    margin-right: 10px;
  }
  
  .title-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-weight: normal;
    font-weight: bold;
    font-size: 18px;
    margin-bottom: 10px;
    color: rgba(86, 94, 109, 1.0);
  }
</style>
