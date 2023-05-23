<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext, onMount } from 'svelte';
    import { storeContext } from '../../contexts';
	import WordCloud from "svelte-d3-cloud";
    import TagCloudPeople from './TagCloudPeople.svelte';
  import { bubble } from 'svelte/internal';
  
    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: tags = store.allTags
    $: uiProps = store.uiProps
	$: words = calcWords($tags)
    $: wordsMax = Math.max(...words.map(w=>w.count))
	const calcWords = (tags) => {
		let words = tags.map(t => {return{text: t.tag, count: t.session_agents.length}})
        words.sort((a,b)=>{
            if (a.text > b.text) {
                return -1;
            }
            if (b.text > a.text) {
                return 1;
            }
            return 0;
        })
        return words
	}
    onMount(async () => {
        store.fetchTags()
    });
    let selectedTag = ""
    let innerWidth = 0
    let innerHeight = 0

    const fontSize = (count: number) => {
        return `${Math.round(10*count/wordsMax)*10}px`
    }
</script>
<svelte:window bind:innerWidth bind:innerHeight />

<div class="cloud-container">
  {#if $tags.length > 0}
    <div class="cloud">
        {#each words as word}
        <div class="word" style="font-size:{fontSize(word.count)};color:#{Math.floor(Math.random()*16777215).toString(16)};"
            class:neonText={$uiProps.feedFilter.tags.includes(word.text)}
            on:click={(e)=> {
                const tag = word.text
                store.filterTag(tag, "feedFilter")
                }}

            on:mouseover={(e)=> selectedTag = word.text}
            on:mouseout={(e)=> selectedTag = ""}
            >
            {word.text}
        </div>
        {/each}
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
        flex-wrap: wrap;
        width: 100%;
        margin: 0 auto;
    }

    .cloud-container {
        width: 100%;
        text-align: center;
        padding-bottom: 30px;
    }
    .word {
        margin: 5px;
        cursor: pointer;
    }
    .neonText {
        color: #fff;
  text-shadow:
    0 0 5px #fff,
    0 0 10px #fff,
    0 0 20px #fff,
    0 0 40px #0ff,
    0 0 80px #0ff,
    0 0 90px #0ff,
    0 0 100px #0ff,
    0 0 150px #0ff;
}
</style>