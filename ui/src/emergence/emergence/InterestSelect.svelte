<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import { getTypeName, type FeedElem, FeedType, timeWindowStartToStr, timeWindowDurationToStr, sessionInterestToString, SessionInterest } from './types';
import { storeContext } from '../../contexts';
import type { EmergenceStore } from '../../emergence-store';
import {  faBookmark, faStar } from '@fortawesome/free-solid-svg-icons';
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
<sl-select 
value={`${$relData.myInterest}`}
on:sl-change={(e) => setSessionInterest(parseInt(e.target.value)) }
>
  <sl-option value={SessionInterest.NoOpinion}><Fa slot="prefix" icon={faBookmark} /> No Opinion</sl-option>
  <sl-option value={SessionInterest.Going}><Fa slot="prefix" icon={faStar} />Going</sl-option>
  <sl-option value={SessionInterest.Interested}><Fa slot="prefix" icon={faBookmark} /> Interested</sl-option>
</sl-select>