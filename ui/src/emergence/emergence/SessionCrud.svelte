<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { frameContext, storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';

import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../stores/emergence-store';
import {  Amenities, setAmenity, type Slot, sessionSelfTags, SessionInterestBit, type AnyAgent, type SessionType, timeWindowDurationToStr, type InfoSession, sessionLinks } from './types';
import SlotSelect from './SlotSelect.svelte';
import { encodeHashToBase64,  decodeHashFromBase64 } from '@holochain/client';
import AnyAvatar from './AnyAvatar.svelte';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import Fa from 'svelte-fa';
import MultiSelect from 'svelte-multiselect'
import { errorText, type WALUrl } from './utils';
import { isWeContext, WeaveClient, weaveUrlFromWal } from '@lightningrodlabs/we-applet';
import AttachmentsList from './AttachmentsList.svelte';
import SvgIcon from './SvgIcon.svelte';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();
let frameClient: WeaveClient = (getContext(frameContext) as any).getFrame();

let amenityElems: Array<SlCheckbox> = []
$: uiProps = store.uiProps
const dispatch = createEventDispatcher();

export let session: InfoSession|undefined = undefined;  // set this if update
export const open = (ses) => {
  if (ses) {
    session = ses
    sesType = `${session.record.entry.session_type}`
    title = session.record.entry.title
    amenities = session.record.entry.amenities
    description = session.record.entry.description
    leaders = session.record.entry.leaders
    smallest = session.record.entry.smallest
    largest = session.record.entry.largest
    duration = session.record.entry.duration
    tags = sessionSelfTags(session)
    links = sessionLinks(session)
    slot = store.getSessionSlot(session)
  } else {

    sesType = "0"
    title = ""
    amenities = 0
    description = ""
    smallest = 2;
    largest = 100;
    duration = 60
    amenities = 0;
    const sitemap = store.getCurrentSiteMap()
    leaders = sitemap && sitemap.record.entry.tags[0]=="emergent" ? [{type:"Agent", hash:store.myPubKey}] : []
    tags = []
    links = []
    slot = undefined
  }
  if (sesTypeSelect)
    sesTypeSelect.value = sesType
  slotSelect.setSlot(slot)
  dialogShow = true
  dialog.show()
}
let slotSelect
const MAX_GROUP_SIZE = 600

let title: string = '';
let description: string = '';
let smallest: number = 2;
let largest: number = 100;
let duration: number = 60
let amenities: number = 0;
let leaders:Array<AnyAgent> = []
let tags:Array<string> = []
let links:Array<WALUrl> = []
$: links
$: proxyAgents = store.proxyAgents
$: proxyAgentOptions = $proxyAgents.map(a=>{return {label: a.record.entry.nickname, value: encodeHashToBase64(a.original_hash)}})
let proxyAgentSelect

let errorSnackbar: Snackbar;

let slot: Slot | undefined
let slotValid: boolean = true
let sesType = "0"
let sesTypeSelect: SlSelect;

$: title, description, leaders, smallest, largest, duration, amenities, slot, slotValid, tags;
$: sessionType = $settings.session_types[parseInt(sesType)]
$: isSessionValid = (leaders.length > 0 || sessionType.can_leaderless) && title !== '' && description !== '' && slotValid && smallest > 0 && largest < MAX_GROUP_SIZE && duration > 0;
$: tagUses = store.allTags
$: allTags = $tagUses.map(t=>t.tag)
$: settings = store.settings
$: anyTime = sessionType.can_any_time

onMount(() => {
});


async function updateSession() {
  if (session) {
    const sessionType = parseInt(sesType)
    const updateRecord = await store.updateSession(session.original_hash, {sessionType, title, amenities, slot, description, leaders, smallest, largest, duration, tags, links})
    if (updateRecord) {
      dispatch('session-updated', { actionHash: updateRecord.actionHash });
    }
    dialog.hide()
  }
}

async function createSession() {    
  try {
    const record = await store.createSession(parseInt(sesType), title!, description, leaders, smallest, largest, duration, amenities, slot, tags, links)

    if (leaders.find(l=>encodeHashToBase64(l.hash) === store.myPubKeyBase64))
      await store.setSessionInterest(record.actionHash, SessionInterestBit.Going )

    title = ""
    description = ""
    smallest = 2;
    largest = 100;
    duration = 60
    amenities = 0
    slot = undefined
    dispatch('session-created', { session: record });
  } catch (e) {
    console.log("CREATE SESSION ERROR", e)
    errorSnackbar.labelText = `Error creating the session: ${errorText(e)}`;
    errorSnackbar.show();
  }
  dialog.hide()
}

function addleader(agent: AnyAgent) {
  
  const agentB64 = encodeHashToBase64(agent.hash)
  if (leaders.findIndex(l=>encodeHashToBase64(l.hash)=== agentB64) == -1 ) {
    leaders.push(agent)
    leaders = leaders
  }
}
function deleteLeader(index: number) {
  leaders.splice(index, 1)
  leaders = leaders
}
const addAttachment = async () => {
    const wal = await frameClient.userSelectWal()
    if (wal) {
      links.push(weaveUrlFromWal(wal))
      links = links
      console.log("LINKS", links)
    }
  }
const removeAttachment = (idx: number) => {
  links.splice(idx,1)
  links=links
}
let dialog
let titleInput
let dialogShow
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<sl-dialog
  on:sl-after-show={()=> {if (dialogShow) {
    titleInput.focus();
    dialogShow = false;
  }}}
  on:sl-request-close={(event)=>{
    if (event.detail.source === 'overlay') {
      event.preventDefault();    
  }}}
  style="--width: 80vw;" label={session ? "Edit Session" : "Create Session"} bind:this={dialog}>
<div style="display: flex; flex-direction: column">
  {#if session}
    Key: {session.record.entry.key}
  {/if}
  {#if $uiProps.amSteward}
    <div style="margin-bottom: 16px; display:flex; align-items:flex-end">
      <div>

        <sl-select
          style="width: 290px"
          id="session-type-select"
          bind:this={sesTypeSelect}
          label="Session Type"
          on:sl-change={(e) => {
            sesType = e.target.value
          } }
        >
          {#each $settings.session_types as type, idx}
            <sl-option value={idx}>{type.name}</sl-option>
          {/each}
        </sl-select>
      </div>
    </div>
  {/if}
  <div id="title-textfield" style="margin-bottom: 16px">
    <sl-input
      bind:this={titleInput}
      label=Title
      autocomplete="off"
      maxlength={60}
      value={title}
      on:input={e => { title = e.target.value; } }
      required
    ></sl-input>
  </div>
  <div id="description-textarea"
    style="margin-bottom: 16px">
    <sl-textarea
      label=Description 
      autocomplete="off"
      value={ description } on:input={e => { description = e.target.value;} }
      required
    ></sl-textarea>
  </div>
  <div id="tags-multiselect" style="margin-bottom: 16px">
    <span>Tags:</span >
    <MultiSelect 
      bind:selected={tags}
      on:add={(e)=>{
        const tag = e.detail.option
        if (tag.length > 30) {
          errorSnackbar.labelText = "Maximum tag length is 30 characters";
          errorSnackbar.show();
          const idx= tags.findIndex(t=>tag==t)
          tags.splice(idx,1)
        }
        }}
      options={allTags} 
      allowUserOptions={true}
      />
  </div>
  {#if isWeContext()}
  <span class="form-label">Links:
    <sl-button size="small" circle on:click={()=>addAttachment()} >          
      <SvgIcon icon=link/>
    </sl-button>
  </span >
    <AttachmentsList 
      on:remove-attachment={(e)=>{removeAttachment(e.detail)}}
      allowDelete={true} 
      attachments={links} />
  {/if}
  <div style="margin-bottom: 16px">
    <span style="margin-right: 4px"><strong class="form-label">Leaders:</strong>
      {#if !sessionType.can_leaderless}
        <span class="required">*</span>
      {/if}
    </span>
    <div style="display:flex;">
      {#each leaders as leader, i}
        <div id="delete-leader-button" style="display:flex;margin-right:10px">
          <AnyAvatar agent={leader}></AnyAvatar>
          <sl-button style="margin-left: 8px;" on:click={() => deleteLeader(i)} circle>
            <Fa icon={faTrash} />
          </sl-button>
        </div>      
      {/each}
    </div>
    <div style="margin-bottom: 16px; display:flex; ">
      <search-agent field-label="Add Leader" include-myself={true} clear-on-select={true} on:agent-selected={(e)=>addleader({type:"Agent", hash:e.detail.agentPubKey})}></search-agent>

      {#if $uiProps.amSteward}
        <div id="proxyagent-select">
          <sl-select
            bind:this={proxyAgentSelect}
            label="Add Proxy Agent"
            on:sl-change={(e) => {
              const hash = decodeHashFromBase64(e.target.value)
              addleader({type:"ProxyAgent", hash})
              proxyAgentSelect.value=""
             } }
          >
          {#each proxyAgentOptions as option}
          <sl-option value={option.value}>{option.label}</sl-option>
          {/each}
          </sl-select>
        </div>
      {/if}
      </div>  
  </div>
  <div style="display:flex">
    <!-- <div style="margin-bottom: 16px; display:flex; flex-direction:column">
      <span>Group Size:</span >
      <div style="display:flex; ">
          <sl-input
          style="width:70px;margin-right:10px"
          maxlength=4
          label="Smallest"
          value={isNaN(smallest)? '' : `${smallest}`}
          on:input={e => { smallest = parseInt(e.target.value); } }
        ></sl-input>
          <sl-input
          style="width:70px"
          maxlength=4
          label="Largest"
          value={isNaN(largest)? '' : `${largest}`}
          on:input={e => { largest = parseInt(e.target.value); } }
        ></sl-input>
      </div>
    </div> -->
  </div>
  <div style="margin-bottom: 16px">
    <div id="clear-amentities-button" class="form-label" on:click={()=>amenities = 0}>Required Amenities </div>
    {#each Amenities as amenity, i}
      <sl-checkbox
        bind:this={amenityElems[i]}
        checked={(amenities >> i)&1}
        on:sl-change={e => { amenities = setAmenity(amenities, i, e.target.checked)} }
      >{amenity}</sl-checkbox>
    {/each}
  </div>
  <div id="slotselect">
    <SlotSelect
      bind:duration={duration}
      bind:this={slotSelect} 
      bind:slot={slot} 
      bind:valid={slotValid}
      bind:sessionType={sessionType}
      sitemap={store.getCurrentSiteMap()}></SlotSelect>
    {#if !slotValid}
      {#if sessionType.can_any_time}
        *You can't select a space without time!
      {:else}
        *You must select both a space and time, or niether.
      {/if}
    {/if}
  </div>
{#if session}
    <div style="display: flex; flex-direction: row; justify-content:flex-end;">
      <div id="cancel-button" >
        <sl-button
          label="Cancel"
          on:click={() => dialog.hide()}
          style=" margin-right: 16px"
          >Cancel</sl-button>
      </div>
      <div id="save-button" >
        <sl-button 
          style=""
          on:click={() => updateSession()}
          disabled={!isSessionValid}
          variant=primary>Save</sl-button>
      </div>
    </div>
  {:else}
  <div style="display: flex; flex-direction: row; justify-content:flex-end;">
    <div id="cancel-button" >
      <sl-button
        id="cancel-button"
        label="Cancel"
        on:click={() => {dialog.hide()}}
        style="margin-right: 16px"
        >Cancel</sl-button>
    </div>
    <div id="create-session-button" >
      <sl-button 
        on:click={() => createSession()}
        disabled={!isSessionValid}
        variant=primary>Create Session</sl-button>
      </div>
  </div>
  {/if}

</div>
</sl-dialog>

<style>
  sl-input::part(form-control-label), sl-textarea::part(form-control-label), #tags-multiselect span, .form-label {
    text-transform: uppercase;
    font-weight: normal;
    font-size: 12px;
    opacity: .7;
  }

:global(div.multiselect > ul.selected > li) {
  border: 1px solid #2F87D830 !important;
  color: #2F87D8 !important;
  background-color: transparent !important;
  margin-bottom: 0;
  display: inline;
  border-radius: 5px;
  font-size: 14px;
}
  
  sl-checkbox {
    margin-right:15px;
  }

  sl-dialog::part(panel) {
    max-width: 100vw;
    max-height: 100vh;
    width: 100vw;
    height: 100%;
  }

  sl-dialog::part(title) {
    font-size: 14px;
    font-weight: bold;
  }

  sl-dialog::part(header) {
    box-shadow: 0 10px 15px rgba(0,0,0,.15);
    width: 100%;
  }

  .type-color {
    margin-left:5px; width:45px; height:45px; border: solid 1px; 
    background-color: var(--type-bg-color, white);
  }
  .required {
    color: inherit;
  }

  sl-button[variant="primary"]::part(base) {
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

  sl-select {
    max-width: 280px;
  }

@media (min-width: 720px) {
  sl-dialog::part(panel) {
    height: auto;
    width: 100%;
    max-width: 700px;
    max-height: calc(100% - var(--sl-spacing-2x-large));
  }
}
</style>
