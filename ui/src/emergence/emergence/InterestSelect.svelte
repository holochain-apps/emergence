<script lang="ts">
import { getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import { SessionInterestBit, type SessionInterest } from './types';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import {  faBookmark, faCheck, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
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
  <div class="interest-button bookmark" style="margin-right:5px"
    title="I'm Interested"
    class:selected={$relData.myInterest & SessionInterestBit.Interested}
    on:click={() => {setSessionInterest( ($relData.myInterest & ~SessionInterestBit.Hidden) ^ SessionInterestBit.Interested)}} >
    <div ><Fa icon={ faBookmark } /></div>
  </div>
  <div class="interest-button attend"  
    title="I'm Going!"
    class:selected={$relData.myInterest & SessionInterestBit.Going}
    on:click={() => {setSessionInterest(($relData.myInterest & ~SessionInterestBit.Hidden) ^ SessionInterestBit.Going)}} >
    <div ><Fa icon={ faCheck } /></div>
  </div>
  <div class="interest-button hide"  
    title="Hide!"
    class:selected={$relData.myInterest & SessionInterestBit.Hidden}
    on:click={() => {setSessionInterest(($relData.myInterest & SessionInterestBit.NoOpinion) + ($relData.myInterest ^ SessionInterestBit.Hidden))}} >
    <div ><Fa icon={ faEyeSlash }/></div>
  </div>
</div>


<style>
  .interest {
    display:flex;
    flex-direction: column;
  }
  .interest-button {
    display:flex;
    justify-content: center;
    align-items: center;
    width:30px;
    height:30px;
    border-radius: 50%;
    border: solid 1px rgba(203, 203, 203, .35);
    box-shadow: 0 3px 3px rgba(0, 0, 0, .15);
    margin-right: 5px;
    cursor: pointer;
  }
@media (min-width: 720px) { 
  .interest {
    flex-direction: row;
  }
}
</style>
