<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
    import { decodeHashFromBase64, encodeHashToBase64, type ActionHash, type EntryHash } from '@holochain/client';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext, onMount } from 'svelte';
    import { storeContext } from '../../contexts';
    import type { TagUse } from './types';
	import WordCloud from "svelte-d3-cloud";
    import TagCloudPeople from './TagCloudPeople.svelte';
  
    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: tags = store.allTags
	$: words = calcWords($tags)
	const calcWords = (tags) => {
		return tags.map(t => {return{text: t.tag, count: t.session_agents.length}})
	}
    onMount(async () => {
        store.fetchTags()
    });
    let selectedTag = ""
</script>

<div>
  {#if $tags.length > 0}
    <div class="cloud">
        <WordCloud words={words} on:click={(e)=> selectedTag = e.detail.target.innerHTML}/>
    {#if selectedTag}
        <TagCloudPeople tag={selectedTag}></TagCloudPeople>
    {/if}
    </div>
{:else}
  No tags yet!
  {/if}
</div>

<style>
    .cloud {
        display: flex;
    }
</style>