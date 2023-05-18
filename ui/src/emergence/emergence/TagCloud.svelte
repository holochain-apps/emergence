<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext, onMount } from 'svelte';
    import { storeContext } from '../../contexts';
	import WordCloud from "svelte-d3-cloud";
    import TagCloudPeople from './TagCloudPeople.svelte';
  
    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: tags = store.allTags
    $: uiProps = store.uiProps
	$: words = calcWords($tags)
	const calcWords = (tags) => {
		return tags.map(t => {return{text: t.tag, count: t.session_agents.length}})
	}
    onMount(async () => {
        store.fetchTags()
    });
    let selectedTag = ""
    let innerWidth = 0
    let innerHeight = 0
</script>
<svelte:window bind:innerWidth bind:innerHeight />

<div class="cloud-container">
  {#if $tags.length > 0}
    <div class="cloud">
        <WordCloud backgroundColor={"lightGray"} width={320} height={300} words={words}
            on:click={(e)=> {
                const tag = e.detail.target.innerHTML
                const feedFilter = $uiProps.feedFilter
                const idx = feedFilter.tags.indexOf(tag)
                if (idx >= 0) {
                    feedFilter.tags.splice(idx,1)
                } else
                    feedFilter.tags.push(tag)
                store.setUIprops({feedFilter})
                }}

            on:mouseover={(e)=> selectedTag = e.detail.target.innerHTML}
            on:mouseout={(e)=> selectedTag = ""}/>
    {#if selectedTag}
    <div class="modal">
        <TagCloudPeople tag={selectedTag}></TagCloudPeople>
    </div>
    {/if}
    </div>
{:else}
  No tags yet!
  {/if}
</div>
<style>
    .cloud {
        display: flex;
        width: 100%;
        margin: 0 auto;
    }

    .cloud-container {
        width: 100%;
        text-align: center;
        padding-bottom: 30px;
    }
</style>