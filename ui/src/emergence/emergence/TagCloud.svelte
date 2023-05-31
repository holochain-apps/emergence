<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext, onMount } from 'svelte';
    import { storeContext } from '../../contexts';
    import TagCloudPeople from './TagCloudPeople.svelte';
  import { sessionHasTags } from './utils';
  import SessionSummary from './SessionSummary.svelte';
  
    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: tags = store.allTags
    $: sessions = store.sessions
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
    let selectedTags = []
    let innerWidth = 0
    let innerHeight = 0
    $: selectedTags
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
            class:neonText={selectedTags.find(t=>t.toLocaleLowerCase() == word.text.toLowerCase())}
            on:click={(e)=> {
                const tag = word.text
                const idx = selectedTags.indexOf(tag)
                if (idx >= 0) {
                    selectedTags.splice(idx,1)
                } else {
                    selectedTags.push(tag)
                }
                selectedTags = selectedTags
               }}
            >
            {word.text}
        </div>
        {/each}
    </div>
    {#if selectedTags.length>0}
    <div class="pill-button" style="display: flex; width: 75px; align-self: end;margin-bottom:5px" on:click={() => {
        selectedTags=[]
        }} >
        Reset
      </div>
        <div style="display:flex;">
            {#each selectedTags as tag}
                <div style="display:flex;">
                    <TagCloudPeople tag={tag}></TagCloudPeople>
                </div>
            {/each}
        </div>
        <div style="display:flex; flex-direction: row; justify-items: flex-start;">
            {#each $sessions.filter(s=>sessionHasTags(s,selectedTags)) as session}
            <SessionSummary session={session} showTags={true} showLeaders={false}></SessionSummary>
            {/each}
        </div>
    {/if}
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