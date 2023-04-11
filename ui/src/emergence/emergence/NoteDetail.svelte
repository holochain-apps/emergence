<script lang="ts">
    import type { ActionHash } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { createEventDispatcher, onMount, getContext } from 'svelte';
    import Avatar from './Avatar.svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let noteHash: ActionHash
    $: note = store.getNote(noteHash)
</script>

{#if note}
<div class="avatar"><Avatar agentPubKey={note.record.action.author}></Avatar></div>
{note.record.entry.text}
{:else}
<sl-spinner></sl-spinner>
{store.needNote(noteHash)}
{/if}

<style>
  .avatar {
    margin-right: 10px;
  }
</style>