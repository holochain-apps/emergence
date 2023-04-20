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

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import type { ActionHash, EntryHash } from '@holochain/client';
import MultiSelect from 'svelte-multiselect'
import type { ObjectOption } from 'svelte-multiselect'

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();
export let note: Info<Note>|undefined = undefined;  // set this if update
export let sessionHash: ActionHash;

let text: string = '';
let pic: EntryHash | undefined = undefined;
let tags = []

let errorSnackbar: Snackbar;

$: text, tags
$: isNoteValid = text !== ""

$: allTags = store.allTags
// $: tagOpts = tagOptions()

// const tagOptions = () : ObjectOption[] => {
//   const options:ObjectOption[] = $allTags.map(tag => 
//   {return {label: `${tag}`, value: tag}} )
//   return options
// }

onMount(() => {
  store.fetchTags()
  if (note) {
    text = note.record.entry.text
    pic = note.record.entry.pic
    tags = note.record.entry.tags
  }
});

async function updateNote() {
  if (note) {
    const updateRecord = await store.updateNote(note.original_hash, text, tags, pic)
    if (updateRecord) {
      dispatch('note-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createNote() {  
  try {
    const record = await store.createNote(sessionHash, text, tags, pic)

    text = ""
    pic = undefined
    tags = []

    dispatch('note-created', { note: record });
  } catch (e) {
    console.log("CREATE NOTE ERROR", e)
    errorSnackbar.labelText = `Error creating the note: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  {#if note}
    <span style="font-size: 18px">Edit Note</span>
  {:else}
    <span style="font-size: 18px">Create Note</span>
  {/if}
              
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Text 
      value={ text } on:input={e => { text = e.target.value;} }
    ></sl-textarea>
  </div>

  <div style="margin-bottom: 16px">
    <span>Tags:</span >
    <MultiSelect 
      bind:selected={tags} 
      options={$allTags} 
      allowUserOptions={true}
      />
  </div>

  <div style="margin-bottom: 16px">
    <span>Add a pic (optional):</span >
    <upload-files
    one-file
    accepted-files="image/jpeg,image/png,image/gif"
    on:file-uploaded={(e) => {
      pic = e.detail.file.hash;
    }}
  ></upload-files>
  </div>

  {#if note}
    <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => dispatch('edit-canceled')}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => updateNote()}
      disabled={!isNoteValid}
      variant=primary>Save</sl-button>
    </div>
  {:else}
  <div style="display: flex; flex-direction: row">
    <sl-button
    label="Cancel"
    on:click={() => dispatch('edit-canceled')}
    style="flex: 1; margin-right: 16px"
    >Cancel</sl-button>
    <sl-button 
    on:click={() => createNote()}
    disabled={!isNoteValid}
    variant=primary>Create Note</sl-button>
    </div>
  {/if}

</div>
