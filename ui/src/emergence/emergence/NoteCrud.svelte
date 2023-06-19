<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import type { Info, Note } from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import { encodeHashToBase64, type ActionHash, type EntryHash } from '@holochain/client15';
import MultiSelect from 'svelte-multiselect'
import type { UploadFiles } from '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import { errorText } from './utils';
import Fa from 'svelte-fa';
import {faSync } from '@fortawesome/free-solid-svg-icons';


let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

//const FILE_TYPES = "image/jpeg,image/png,image/gif,image/bmp,image/svg,video/mp4,video/webm,audio/mpeg,audio/x-aiff,audio/mp3,audio/m4a,audio/ogg,application/pdf,text/plain"
const FILE_TYPES = "image/jpeg,image/png,image/gif,image/bmp,image/svg,audio/x-aiff,audio/mp3,audio/m4a,audio/ogg,application/pdf,text/plain"
const dispatch = createEventDispatcher();
export let note: Info<Note>|undefined = undefined;  // set this if update
export let sessionHash: ActionHash;
export let modal = true

let text: string = '';
let pic: EntryHash | undefined = undefined;
let tags = []

let errorSnackbar: Snackbar;
let uploadFiles: UploadFiles

$: text, tags
$: isNoteValid = text !== ""

$: tagUses = store.allTags
$: allTags = $tagUses.map(t=>t.tag)

onMount(() => {
});
export const open = (n) => {
  store.fetchTags()
  if (n) {
    note = n
    text = note.record.entry.text
    pic = note.record.entry.pic
    tags = note.record.entry.tags
    sessionHash = note.record.entry.session
    uploadFiles.defaultValue = pic ? pic : undefined  // can't be null, must be undefined
  } else {
    clear()
  }
  uploadFiles.reset()
  if (modal)
    dialog.show()
}

export const clear = () =>{
  text = ""
  pic = undefined
  tags = []
  uploadFiles.defaultValue = undefined
  uploadFiles.reset()
}

async function updateNote() {
  if (note) {
    const pic = uploadFiles.value
    acting = true
    const updateRecord = await store.updateNote(note.original_hash, text, tags, pic)
    acting = false
    if (updateRecord) {
      dispatch('note-updated', { actionHash: updateRecord.actionHash });
    } 
    if (modal)
      dialog.hide()
  }
}

async function createNote() {  
  try {
    const pic = uploadFiles.value
    acting = true
    const record = await store.createNote(sessionHash, text, tags, pic)
    acting = false
    dispatch('note-created', { note: record });
  } catch (e) {
    acting = false
    console.log("CREATE NOTE ERROR", e)
    errorSnackbar.labelText = `Error creating the note: ${errorText(e)}`;
    errorSnackbar.show();
  }
  if (modal)
    dialog.hide()
  clear()
}

let dialog
let acting = false
$: acting

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
{#if modal}
<sl-dialog label={note ? "Edit Note" : "Create Note"} bind:this={dialog}>
<div style="display: flex; flex-direction: column">
              
  <div id="note-textarea" style="margin-bottom: 16px">
    <sl-textarea
      value={ text } on:input={e => { text = e.target.value;} }
    ></sl-textarea>
  </div>

  <div id="tags-select" style="margin-bottom: 16px">
    <span>Tags:</span >
    <MultiSelect 
      --sms-bg="white"
      on:add={(e)=>{
        const tag = e.detail.option
        if (tag.length > 30) {
          errorSnackbar.labelText = "Maximum tag length is 30 characters";
          errorSnackbar.show();
          const idx= tags.findIndex(t=>tag==t)
          tags.splice(idx,1)
        }
        }}
      bind:selected={tags} 
      options={allTags} 
      allowUserOptions={true}
      />
  </div>
  
  <div style="margin-bottom: 16px;">
    <span>Add a pic (optional):</span >
    <upload-files
    bind:this={uploadFiles}
    one-file
    accepted-files={FILE_TYPES}
    defaultValue={pic ? encodeHashToBase64(pic) : undefined}
    on:file-uploaded={(e) => {
      pic = e.detail.file.hash;
    }}
  ></upload-files>
  </div>

  <div style="display: flex; flex-direction: row; align-items:center">
    {#if acting}<div class="spinning" style="margin-right:10px"> <Fa icon={faSync}></Fa></div>{/if}
    {#if note}
      <div id="cancel-button">
        <sl-button
        id="cancel-button"
        label="Cancel"
        on:click={() =>  dialog.hide()}
        style="flex: 1; margin-right: 16px"
        >Cancel</sl-button>
      </div>
      <div id="save-button">
        <sl-button 
          style="flex: 1;"
          on:click={() => updateNote()}
          disabled={!isNoteValid|| acting}
          variant=primary>Save</sl-button>
      </div>
    {:else}
      <sl-button
      id="cancel-button"
      label="Cancel"
      on:click={() => dialog.hide()}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      on:click={() => createNote()}
      disabled={!isNoteValid || acting}
      variant=primary>Create Note</sl-button>
    {/if}
  </div>

</div>
</sl-dialog>
{:else}
<div style="display: flex; flex-direction: column; width: 100%; max-width: 720px; ">
  <div style="display:flex;flex-direction: row">
    <div style="display: flex; flex-direction: column; width: 100%; margin-right: 10px;">

      <div id="note-textarea" class="new-note">
        <h4>Add a note</h4>
        <sl-textarea
          resize=auto
          autocomplete={"off"}
          value={ text } on:input={e => { text = e.target.value;} }
        ></sl-textarea>
      </div>
      <div id="tags-select" style="margin: 16px 0">
        <MultiSelect 
        --sms-bg="white"
          on:add={(e)=>{
            const tag = e.detail.option
            if (tag.length > 30) {
              errorSnackbar.labelText = "Maximum tag length is 30 characters";
              errorSnackbar.show();
              const idx= tags.findIndex(t=>tag==t)
              tags.splice(idx,1)
            }
            }}
            bind:selected={tags} 
          options={allTags} 
          allowUserOptions={true}
          placeholder="Add tags"
          />
      </div>

    <div style="margin-bottom: 16px; display: flex; flex-direction: row; justify-content: space-between;">
      <upload-files
        bind:this={uploadFiles}
        one-file
        accepted-files={FILE_TYPES}
        defaultValue={pic ? encodeHashToBase64(pic) : undefined}
        on:file-uploaded={(e) => {
          pic = e.detail.file.hash;
        }}
      ></upload-files>
      <div style="display:flex;flex-direction: row; align-items:center">
        {#if acting}<div class="spinning" style="margin-right:10px"> <Fa icon={faSync}></Fa></div>{/if}
      {#if note}
          <div style="display: flex; flex-direction: row">
            <div id="cancel-button">
              <sl-button
              label="Cancel"
              on:click={() =>  dialog.hide()}
              style="flex: 1; margin-right: 16px"
              >Cancel</sl-button>
            </div>
            <div id="save-button">
              <sl-button 
              style="flex: 1;"
              on:click={() => updateNote()}
              disabled={!isNoteValid || acting}
              variant=primary>Save</sl-button>
            </div>
          </div>
        {:else}
          <div id="create-note-button" style="display: flex; flex-direction: row; justify-content: flex-end">
            <sl-button 
              style="flex: 1;"
              on:click={() => createNote()}
              disabled={!isNoteValid || acting}
              variant=primary>Create Note</sl-button>
            </div>
        {/if}
      </div>

    </div>
    </div>

  </div>
  


</div>
{/if}
<style>
  upload-files {
    min-width: 200px;
    --placeholder-font-size: 12px;
    --icon-font-size: 50px;
    --message-margin: 0px;
    --message-margin-top: 0px;
    --preview-height: 60px;
    --preview-width: 60px;
    --details-padding: 5px;
  }
  upload-files::part(dropzone) {
    height: 40px;
    display: flex;
    flex-direction: row;
    width: 100px;
    min-height: 0px;
  }

  sl-button::part(base) {
    background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
    min-height: 30px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 10px 15px rgba(0,0,0,.35);
    border-radius: 5px;
    padding: 0 10px;
    margin-right: 10px;
    cursor: pointer;
    font-size: 14px;
  }

  upload-files::part(dropzone) button {
    min-width: 124px;
  }

  .new-note h4 {
    opacity: .5;
  }
</style>