<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { type EntryHash, type AgentPubKey, encodeHashToBase64, type ActionHash, decodeHashFromBase64 } from '@holochain/client';
import { storeContext } from '../../contexts';
import { Amenities, type Info, type Space, setAmenity, type SiteMap, type SiteLocation} from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';

import type {
  UploadFiles,
} from "@holochain-open-dev/file-storage/dist/elements/upload-files.js";

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../stores/emergence-store';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import Avatar from './Avatar.svelte';
import { faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import SiteMapLocation from './SiteMapLocation.svelte';
import MultiSelect from 'svelte-multiselect'
  import { errorText } from './utils';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();
export let space: Info<Space>|undefined = undefined;  // set this if update

let key: string = '';
let name: string = '';
let description: string = '';
let stewards:Array<AgentPubKey> = []
let amenities: number = 0;
let capacity: number = 0;
let pic: EntryHash | undefined = undefined;
let tags: Array<string> = []
let location: SiteLocation | undefined;
let sitemap: Info<SiteMap>| undefined;
$: sitemaps = store.maps
$: sitemap

let uploadFiles: UploadFiles

let errorSnackbar: Snackbar;

$: key, name, description, stewards, amenities;
$: isSpaceValid = true && name !== '' && description !== '' && capacity > 0;

onMount(() => {
});

export const open = (spc) => {
  space = spc
  sitemap = store.getCurrentSiteMap()
  if (sitemap && siteMapLocation) {
    siteMapLocation.setSitemap(sitemap)
  }
  if (space) {
    key = space.record.entry.key
    name = space.record.entry.name
    amenities = space.record.entry.amenities
    description = space.record.entry.description
    stewards = space.record.entry.stewards
    capacity = space.record.entry.capacity
    pic = space.record.entry.pic
    tags = space.record.entry.tags
    location = sitemap ? store.getSpaceSiteLocation(space, sitemap.original_hash) : undefined
    uploadFiles.defaultValue = pic ? pic : undefined  // can't be null, must be undefined
  } else {
    key = ""
    name = ""
    description = ""
    amenities = 0
    capacity = 0
    pic = undefined
    tags = []
    location = undefined
    uploadFiles.defaultValue = undefined
  }
  uploadFiles.reset()
  dialog.show()
}

async function updateSpace() {
  if (space) {
    const pic = uploadFiles.value
    const updateRecord = await store.updateSpace(space.original_hash, {key, name, description, stewards, capacity, amenities, tags, pic, location})
    if (updateRecord) {
      dispatch('space-updated', { actionHash: updateRecord.actionHash });
    }
    dialog.hide()
  }
}

async function createSpace() {  
  try {
    const pic = uploadFiles.value
    const record = await store.createSpace(key, name, description, stewards, capacity, amenities, tags, pic, location)

    dispatch('space-created', { space: record });
  } catch (e) {
    console.log("CREATE SPACE ERROR", e)
    errorSnackbar.labelText = `Error creating the space: ${errorText(e)}`;
    errorSnackbar.show();
  }
  dialog.hide()
}
function addSteward(agent: AgentPubKey) {
  const agentB64 = encodeHashToBase64(agent)
  if (stewards.findIndex(l=>encodeHashToBase64(l)=== agentB64) == -1 ) {
    stewards.push(agent)
    stewards = stewards
  }
}
function deleteSteward(index: number) {
  stewards.splice(index, 1)
  stewards = stewards
}
let dialog
let siteMapLocation
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<sl-dialog style="--width:100vw;" label={space?"Edit Space":"Create Space"}
  bind:this={dialog}
  >
  {#if space}
      <sl-button circle 
      style="margin-top:12px" 
      slot="header-actions" 
      on:click={() => updateSpace()}
      disabled={!isSpaceValid}
      variant=primary><Fa icon={faSave} /></sl-button>
      
  {:else}
      <sl-button circle 
      style="margin-top:12px" 
      slot="header-actions" 
      on:click={() => createSpace()}
      disabled={!isSpaceValid}
      variant=primary><Fa icon={faSave} /></sl-button>
      
  {/if}


  <div style="display: flex; flex-direction: column">
  <div style="display: flex; flex-direction: row; justify-content:space-between">


</div>
<div style="display:flex; flex-direction:row; justify-content:space-between; flex-wrap: wrap;">
  <div style="display:flex; flex-direction:column; margin-right: 10px">
    <div style="margin-bottom: 16px; width: 100px">
      <sl-input
      label="Map Symbol"
      value={key}
      on:input={e => { key = e.target.value; } }
    ></sl-input>
    </div>

    <div style="margin-bottom: 16px">
      <sl-input
      label=Name
      value={name}
      on:input={e => { name = e.target.value; } }
    ></sl-input>
    </div>
  </div>
  <div style="margin-bottom: 16px">
    <span style="margin-right: 4px">Stewards:</span>
    {#each stewards as steward, i}
    <div style="display:flex;">
      <Avatar agentPubKey={steward}></Avatar>
      <sl-button style="margin-left: 8px;" on:click={() => deleteSteward(i)} circle>
        <Fa icon={faTrash} />
      </sl-button>

    </div>
      
    {/each}

    <search-agent field-label="Add Steward" include-myself={true} clear-on-select={true} on:agent-selected={(e)=>addSteward(e.detail.agentPubKey)}></search-agent>
  </div>
</div>

  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Description 
      value={ description } on:input={e => { description = e.target.value;} }
    ></sl-textarea>
  </div>

  <div style="display:flex; flex-direction:row; justify-content:space-between; flex-wrap: wrap;">
    <div style="display:flex; flex-direction:column; margin-right: 10px;">
      <div style="margin-bottom: 16px">
        <sl-input
        label="Capacity"
        value={isNaN(capacity)? '' : `${capacity}`}
        on:input={e => { capacity = parseInt(e.target.value); } }
        ></sl-input>
      </div>

      <div style="margin-bottom: 16px">
        <div style="font-size: 16px">Amenities Available </div>
        {#each Amenities as amenity, i}
          <sl-checkbox 
            bind:this={amenityElems[i]}
            checked={(amenities >> i)&1}
            on:sl-change={e => { amenities = setAmenity(amenities, i, e.target.checked)} }
          >{amenity}</sl-checkbox>
        {/each}
      </div>

      <div style="margin-bottom: 16px">
        <span>Slot type:</span >
        <MultiSelect 
          bind:selected={tags} 
          options={store.getSlotTypeTags()}
          allowUserOptions={true}
          />
      </div>
    </div>

    <div style="margin-bottom: 16px">
      <span>Image (optional):</span >
        <div class="pic-upload">
            <upload-files
            bind:this={uploadFiles}
            one-file
            accepted-files="image/jpeg,image/png,image/gif"
            defaultValue={pic ? encodeHashToBase64(pic) : undefined}
            on:file-uploaded={(e) => {
              pic = e.detail.file.hash;
            }}
          ></upload-files>
        </div>
    </div>
  </div>
  {#if sitemap}
    <sl-select
      value={encodeHashToBase64(sitemap.original_hash)}
      style="margin: 8px;"
      label="Current Site Map"
      on:sl-change={(e) => {
        const hash = decodeHashFromBase64(e.target.value)
        sitemap = store.getSiteMap(hash)
        siteMapLocation.setSitemap(sitemap)
      } }
    >
    {#each $sitemaps as map}
        <sl-option value={encodeHashToBase64(map.original_hash)}>{map.record.entry.text}</sl-option>
    {/each}
    </sl-select>

    <div style="margin-bottom: 16px; width:100%">
      Map Location: {location ? JSON.stringify(location.location) : "none"}
      <SiteMapLocation
        bind:this={siteMapLocation}
        sitemap={sitemap}
        location={location && encodeHashToBase64(location.imageHash) === encodeHashToBase64(sitemap.original_hash) ? location.location : undefined}
        on:sitemap-locate={(e)=> location = {imageHash: sitemap.original_hash, location :e.detail}}
        ></SiteMapLocation>
    </div>
  {/if}


</div>
</sl-dialog>
<style>
  :global(.pic-upload) {
    width: 200px;
  }
  sl-checkbox {
    margin-right:15px;
  }

  upload-files {
    --placeholder-font-size: 14px;
    --icon-font-size: 50px;
    --message-margin: 0px;
    --message-margin-top: 0px;
  }
  upload-files::part(dropzone) {
    height: 200px;
    width: 100px;
    min-height: 0px;
  }
</style> 
