<script lang="ts">
    import { getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
    import SvgIcon from './SvgIcon.svelte';

    let saving = false;
    let dialog: SlDialog
    let name: string = "";
    let error;

    export let handleSave: (name: string) => Promise<void>;
    export const open = ()=> {
        dialog.show()
    }
    
    const close = () => {
        name = "";
        error = undefined;
        dialog.hide();
    }

    const create = async () => {
        saving = true
        try {
            await handleSave(name);
            close();
        } catch(e) {
            error = e;
        }
        saving = false;
    }

    $: valuesValid = name.length > 0;
</script>

<sl-dialog bind:this={dialog} label="New Network"
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
            <div class="title-text">Title</div> <sl-input class='textarea' maxlength="60" value={name}  on:input={e=> name = e.target.value}></sl-input>
        </div>

        <div class='controls'>
            <sl-button on:click={close} class="board-control">
              Cancel
            </sl-button>
      
            <sl-button class="board-control"
              variant="primary"
              disabled={!valuesValid || saving} 
              style="margin-left:10px; width:70px;" on:click={create}>
                
            {#if saving}
                <div class="spinning"><SvgIcon icon=faSpinner></SvgIcon></div>
            {:else}
                Save
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
  