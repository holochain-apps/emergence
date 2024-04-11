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
import {  faBookmark, faCheck, faEllipsis, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import type{  ActionHash } from '@holochain/client';
import type { Snackbar } from '@material/mwc-snackbar';
import Fa from 'svelte-fa';
import { errorText } from './utils';
import Confirm from './Confirm.svelte';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

export let sessionHash: ActionHash;
let errorSnackbar: Snackbar;
let setting : undefined | number = undefined

$: setting
$: session = store.sessionStore(sessionHash)
$: relData = store.sessionReleationDataStore(session)
$: uiProps = store.uiProps

async function setSessionInterest(interest: SessionInterest) {
  try {
    if (interest !== $relData.myInterest) {
      await store.setSessionInterest($session.original_hash, interest )
      setting = undefined
    }

  } catch (e: any) {
    console.log("SET SESSION INTEREST ERROR", e)

    errorSnackbar.labelText = `Error attending the session: ${errorText(e)}`;
    errorSnackbar.show();
  }
}
let confirmDialog
function doHide() {
  setting  = SessionInterestBit.Hidden
  setSessionInterest(($relData.myInterest & SessionInterestBit.NoOpinion) + ($relData.myInterest ^ SessionInterestBit.Hidden))
}
</script>
<div class="confirm-hide">
  <Confirm 
    bind:this={confirmDialog}
    message="Please confirm hiding this session."
    details="Note: you can find hidden sessions later by selecting 'Hidden' in the filters."
    noConfirm="confirmHide"
    on:confirm-confirmed={doHide}>
  </Confirm>
</div>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div class="interest">
  <div class="interest-button attend"  
    title="I'm Going!"
    class:selected={$relData.myInterest & SessionInterestBit.Going}
    on:click={() => {
      setting  = SessionInterestBit.Going
      setSessionInterest(($relData.myInterest & ~SessionInterestBit.Hidden) ^ SessionInterestBit.Going)
      }} >
    <div ><Fa icon={ setting  == SessionInterestBit.Going ? faEllipsis : faCheck } /></div>
  </div>
  <div class="interest-button bookmark" style="margin-right:5px"
    title="I'm Interested"
    class:selected={$relData.myInterest & SessionInterestBit.Interested}
    on:click={() => {
      setting  = SessionInterestBit.Interested
      setSessionInterest( ($relData.myInterest & ~SessionInterestBit.Hidden) ^ SessionInterestBit.Interested)
      }} >
    <div ><Fa icon={ setting  == SessionInterestBit.Interested ? faEllipsis : faBookmark } /></div>
  </div>
  <div class="interest-button hide"  
    title="Hide!"
    class:selected={$relData.myInterest & SessionInterestBit.Hidden}
    on:click={() => {
      if ($uiProps.confirmHide)
        confirmDialog.open()
      else
        doHide()
    }} >
    <div ><Fa icon={ setting  == SessionInterestBit.Hidden ? faEllipsis :faEyeSlash }/></div>
  </div>
</div>


<style>
  .confirm-hide {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
  }
  .interest {
    display:flex;
    flex-direction: column;
  }

  .interest-button.attend {
    border: 1px solid rgba(35, 170, 80, .4);
  }

  .interest-button.bookmark {
    border: 1px solid rgba(254, 217, 165, .7);
  }

  .interest-button.hide {
    opacity: .6;
  }

  .interest-button:hover {
    opacity: 1;
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
    margin-bottom: 5px;
    cursor: pointer;
  }
  
@media (min-width: 540px) { 
  .interest {
    flex-direction: row;
  }

  .interest-button {
    margin-right: 5px;
  }
}
</style>
