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
import {  faBookmark, faCheck, faChevronDown, faEnvelope, faStar } from '@fortawesome/free-solid-svg-icons';
import type{  ActionHash } from '@holochain/client';
import type { Snackbar } from '@material/mwc-snackbar';
import Fa from 'svelte-fa';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

export let sessionHash: ActionHash;
let errorSnackbar: Snackbar;

$: session = store.sessionStore(sessionHash)
$: relData = store.sessionReleationDataStore(session)

async function setSessionInterest(interest: SessionInterest) {
  try {
    if (interest !== $relData.myInterest)
      await store.setSessionInterest($session.original_hash, interest )
    else 
      await store.setSessionInterest($session.original_hash, SessionInterest.NoOpinion )

  } catch (e: any) {
    console.log("SET SESSION INTEREST ERROR", e)

    errorSnackbar.labelText = `Error attending the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}
</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

<div class="interest">
  <div class="interest-button" style="margin-right:5px"
    title="I'm Interested"
    class:selected={$relData.myInterest == SessionInterest.Interested}
    on:click={() => {setSessionInterest(SessionInterest.Interested)}} >
    <div ><Fa icon={ faBookmark } /></div>
  </div>
  <div class="interest-button"  
    title="I'm Going!"
    class:selected={$relData.myInterest == SessionInterest.Going}
    on:click={() => {setSessionInterest(SessionInterest.Going)}} >
    <div ><Fa icon={ faCheck } /></div>
  </div>
</div>


<style>
  .interest {
    display:flex;
    flex-direction: row;
  }
  .interest-button {
    display:flex;
    justify-content: center;
    align-items: center;
    width:30px;
    height:30px;
    border-radius: 50%;
    border: solid 1px rgb(203, 203, 203);

  }
  .selected {
    outline: none;
    border-color: #9ecaed;
    box-shadow: 0 0 10px #9ecaed !important;
    background-color: rgb(240, 249, 2244);
    border: solid 1px rgb(149, 219, 252);

  }
</style>
