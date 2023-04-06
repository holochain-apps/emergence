<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import { storeContext } from '../../contexts';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import type { EmergenceStore } from '../../emergence-store';

let store: EmergenceStore = (getContext(storeContext) as any).getStore();

const dispatch = createEventDispatcher();

let title: string = '';

let errorSnackbar: Snackbar;

$: title;
$: isSessionValid = title !== '';

onMount(() => {
});

async function createSession() {    
  try {
    const record = await store.createSession(title!)
    title = ""
    dispatch('session-created', { session: record });
  } catch (e) {
    errorSnackbar.labelText = `Error creating the session: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Create Session</span>
  
  <div style="margin-bottom: 16px">
    <sl-input
    label=Title
    value={title}
    on:input={e => { title = e.target.value; } }
  ></sl-input>

  </div>
            
  <sl-button 
  on:click={() => createSession()}
  disabled={!isSessionValid}
  variant=primary>Create Session</sl-button>

</div>
