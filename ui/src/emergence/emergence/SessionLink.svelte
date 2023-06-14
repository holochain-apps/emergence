<script lang="ts">
   import type { ActionHash } from '@holochain/client';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext, onMount } from 'svelte';
  import { storeContext } from '../../contexts';
  import { DetailsType } from './types';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();
  $: uiProps = store.uiProps

  export let sessionHash: ActionHash;
  export let linkText = ""

  onMount(() => {
  });

  const handleClick = (e)=> {
    e.stopPropagation()
    store.openDetails(DetailsType.Session, sessionHash)
  }
  const sessionTitle = (sessionHash: ActionHash) => {
    const session = store.getSession(sessionHash)
    if (session) {
      return session.record.entry.title
    }
    return "<deleted session>"
  }
</script>

<div class="session-link" on:click={handleClick}>{linkText ? linkText : sessionTitle(sessionHash)}</div>

<style>
    .session-link {
      margin: 0 5px 0 5px;
      cursor: pointer;
      text-decoration: underline;
      color: rgba(51, 131, 216, 1.0);
      background: -webkit-linear-gradient(rgba(51, 131, 216, 1.0), rgba(93, 52, 201, 1.0));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline;
    }
</style>
