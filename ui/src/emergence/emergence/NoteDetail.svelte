<script lang="ts">
    import { encodeHashToBase64, type ActionHash } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { createEventDispatcher, onMount, getContext } from 'svelte';
    import Avatar from './Avatar.svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import { onDestroy } from 'svelte';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let noteHash: ActionHash
    export let showAvatar = true

    $: note = store.neededStuffStore.notes.get(noteHash)
    onDestroy(() => {
        store.neededStuffStore.notes.clear(noteHash)
    }); 

</script>

{#if $note.status=== "pending"}
<sl-spinner></sl-spinner>
{:else}
    {#if $note.value}
        {#if showAvatar}
            <div class="avatar"><Avatar agentPubKey={$note.value.record.action.author}></Avatar></div>
        {/if}
        {$note.value.record.entry.text}
        {#if $note.value.record.entry.pic}
        <div class="pic">
        <show-image image-hash={encodeHashToBase64($note.value.record.entry.pic)}></show-image>
        </div>
        {/if}
        <div class="tags">
            {#each $note.value.record.entry.tags as tag}
                <div class="tag">{tag}</div>
            {/each}
        </div>
    {:else}
        Not found on DHT
    {/if}
{/if}

<style>
  .avatar {
    margin-right: 10px;
  }
  .pic {
    max-width: 100px;
  }
  .tags {
    display: flex;
    margin-left: 5px;
  }
  .tag {
    color: white;
    background-color: gray;
    border-radius: 7px;
    padding: 5px;
    margin-right: 5px;
  }
</style>