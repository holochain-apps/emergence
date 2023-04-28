<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { type AppAgentClient, type Record, type EntryHash, type AgentPubKey, type ActionHash, type DnaHash, encodeHashToBase64 } from '@holochain/client';
import { storeContext } from '../../contexts';
import { Amenities, type Info, type Space, setAmenity, type SiteMap, type SiteLocation} from './types';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import "@holochain-open-dev/file-storage/dist/elements/show-image.js";

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import Avatar from './Avatar.svelte';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import SiteMapLocation from './SiteMapLocation.svelte';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let amenityElems: Array<SlCheckbox> = []

const dispatch = createEventDispatcher();
export let space: Info<Space>|undefined = undefined;  // set this if update

let name: string = '';
let description: string = '';
let stewards:Array<AgentPubKey> = []
let amenities: number = 0;
let capacity: number = 0;
let pic: EntryHash | undefined = undefined;
let location: SiteLocation | undefined;
let sitemap: Info<SiteMap> | undefined;

let errorSnackbar: Snackbar;

$: name, description, stewards, amenities;
$: isSpaceValid = true && name !== '' && description !== '' && capacity > 0;

onMount(() => {
  sitemap = store.getCurrentSiteMap()
  if (space) {
    name = space.record.entry.name
    amenities = space.record.entry.amenities
    description = space.record.entry.description
    stewards = space.record.entry.stewards
    capacity = space.record.entry.capacity
    pic = space.record.entry.pic
    console.log("sitemap", sitemap)

    location = store.getSpaceSiteLocation(space)
    console.log("location", location)

  }
});

async function updateSpace() {
  if (space) {
    const updateRecord = await store.updateSpace(space.original_hash, {name, description, stewards, capacity, amenities, pic, location})
    if (updateRecord) {
      dispatch('space-updated', { actionHash: updateRecord.actionHash });
    } else {
      dispatch('edit-canceled')
    }
  }
}

async function createSpace() {  
  try {
    const record = await store.createSpace(name, description, stewards, capacity, amenities, pic, location)

    name = ""
    description = ""
    amenities = 0
    capacity = 0
    pic = undefined
    location = undefined
    dispatch('space-created', { space: record });
  } catch (e) {
    console.log("CREATE SPACE ERROR", e)
    errorSnackbar.labelText = `Error creating the space: ${e.data.data}`;
    errorSnackbar.show();
  }
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
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  {#if space}
    <span style="font-size: 18px">Edit Space</span>
  {:else}
    <span style="font-size: 18px">Create Space</span>
  {/if}
  

  <div style="margin-bottom: 16px">
    <sl-input
    label=Name
    value={name}
    on:input={e => { name = e.target.value; } }
  ></sl-input>
  </div>
            
  <div style="margin-bottom: 16px">
    <sl-textarea 
      label=Description 
      value={ description } on:input={e => { description = e.target.value;} }
    ></sl-textarea>
  </div>
  <div style="margin-bottom: 16px">
    <span style="margin-right: 4px"><strong>Stewards:</strong></span>
    {#each stewards as steward, i}
    <div style="display:flex;">
      <Avatar agentPubKey={steward}></Avatar>
      <sl-button style="margin-left: 8px;" size=small on:click={() => deleteSteward(i)} circle>
        <Fa icon={faTrash} />
      </sl-button>

    </div>
      
    {/each}

    <search-agent field-label="Add Steward" include-myself={true} clear-on-select={true} on:agent-selected={(e)=>addSteward(e.detail.agentPubKey)}></search-agent>
  </div>

  <div style="margin-bottom: 16px">
    <sl-input
    label="Capacity"
    value={`${capacity}`}
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
    {#if pic}
    <div class="pic">
    <show-image image-hash={encodeHashToBase64(pic)}></show-image>
    </div>
    {/if}

    <span>Add a pic (optional):</span >
    <upload-files
    one-file
    accepted-files="image/jpeg,image/png,image/gif"
    on:file-uploaded={(e) => {
      pic = e.detail.file.hash;
    }}
  ></upload-files>
  </div>
  {#if sitemap}
    <div style="margin-bottom: 16px">
      Map Location: {location ? JSON.stringify(location.location) : "none"}
      <SiteMapLocation
        sitemap={sitemap}
        location={location && encodeHashToBase64(location.imageHash) === encodeHashToBase64(sitemap.record.entryHash) ? location.location : undefined}
        on:sitemap-locate={(e)=> location = {imageHash: sitemap.record.entryHash, location :e.detail}}
        ></SiteMapLocation>
    </div>
  {/if}
  {#if space}
    <div style="display: flex; flex-direction: row">
      <sl-button
      label="Cancel"
      on:click={() => dispatch('edit-canceled')}
      style="flex: 1; margin-right: 16px"
      >Cancel</sl-button>
      <sl-button 
      style="flex: 1;"
      on:click={() => updateSpace()}
      disabled={!isSpaceValid}
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
    on:click={() => createSpace()}
    disabled={!isSpaceValid}
    variant=primary>Create Space</sl-button>
    </div>
  {/if}

</div>
<style>
  .pic {
   width: 50px;
  }
</style> 