<script lang="ts">
import { getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import { SessionInterest } from './types';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import {  faBookmark, faChevronDown, faEnvelope, faStar } from '@fortawesome/free-solid-svg-icons';
import type{  ActionHash } from '@holochain/client';
import type { Snackbar } from '@material/mwc-snackbar';
import Fa from 'svelte-fa';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

export let sessionHash: ActionHash;
let errorSnackbar: Snackbar;

$: session = store.sessionStore(sessionHash)
$: relData = store.sessionReleationDataStore(session)

async function setSessionInterest(interest: SessionInterest) {
  open=false
  try {
    if (interest !== $relData.myInterest)
      await store.setSessionInterest($session.original_hash, interest )
  } catch (e: any) {
    console.log("SET SESSION INTEREST ERROR", e)

    errorSnackbar.labelText = `Error attending the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}
let open = false
let menu
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
  <div class="select" on:mousedown={(e)=>{open = true;e.stopPropagation()}}
    >
  <div style="margin-right: 5px">
    {#if $relData.myInterest === SessionInterest.NoOpinion}RSVP{/if}
    {#if $relData.myInterest === SessionInterest.Going}<Fa icon={faStar} />{/if}
    {#if $relData.myInterest === SessionInterest.Interested}<Fa icon={faBookmark} />{/if}
  </div>
  <Fa icon={faChevronDown} />
  {#if open}
    <div class="menu">  
      <sl-menu 
      bind:this={menu}
      value={`${$relData.myInterest}`}
      on:mouseleave={(e)=>{ 
        if (e.target == menu) {
          open = false;e.stopPropagation()
        }
        }}

      on:sl-select={(e) =>   {e.stopPropagation(); setSessionInterest(parseInt(e.detail.item.value)) }}
      >
        <sl-menu-item value={SessionInterest.NoOpinion}>RSVP</sl-menu-item>
        <sl-menu-item value={SessionInterest.Going}><Fa slot="prefix" icon={faStar} />Going</sl-menu-item>
        <sl-menu-item value={SessionInterest.Interested}><Fa slot="prefix" icon={faBookmark} /> Interested</sl-menu-item>
      </sl-menu>
    </div>
  {/if}
  </div>

<style>
  .select {
    position: relative;
    display:flex;
    border: 2px solid rgba(70, 47, 216, .20);
    padding: 0 10px;
    font-size: 14px;
    border-radius: 5px;
    align-items: center;
    color: #462FD8;
    font-weight: bold;
    height: 35px;
    z-index: 0;
  }
  .menu {
    background-color: white;
    position: absolute;
    top: 0;
    right: 0;   
    z-index: 1000;
  }
</style>
