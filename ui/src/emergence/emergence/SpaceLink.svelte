<script lang="ts">
   import type { ActionHash } from '@holochain/client';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext, onMount } from 'svelte';
  import { storeContext } from '../../contexts';
  import { DetailsType } from './types';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();
  $: uiProps = store.uiProps

  export let spaceHash: ActionHash;
  export let linkText = ""

  onMount(() => {
  });

  const handleClick = (e)=> {
    e.stopPropagation()
    store.openDetails(DetailsType.Space, spaceHash)
  }
  const spaceTitle = (spaceHash: ActionHash) => {
    const space = store.getSpace(spaceHash)
    if (space) {
      let name = space.record.entry.name
      if (space.record.entry.key) name = `${name} (${space.record.entry.key})`
      return name
    }
    return "<deleted space>"
  }
</script>

<div class="space-link" on:click={handleClick}>{linkText ? linkText : spaceTitle(spaceHash)}</div>

<style>
    .space-link {
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
