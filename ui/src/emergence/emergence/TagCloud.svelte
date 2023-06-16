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
        //store.fetchTags()
    });
    let selectedTags = []
    let innerWidth = 0
    let innerHeight = 0
    $: selectedTags
    const fontSize = (count: number) => {
        return `${Math.round(10*count/wordsMax)*10}px`
    }
    const getColor = (count:number) => {
        // let rankColor = Math.round(( (count - 1) / (wordsMax - 1) ) * 10)
        // const gradient = [35,55,75,95,115,135,155,175,195,215,235,255]
        // return `rgb(${gradient[rankColor]},0,0)`

        //Math.floor(Math.random()*16777215).toString(16)
        return `rgb(${count/wordsMax*255},0,0)`
    }
    export const setTag = (tag: string) => {
        selectedTags = [tag]
    }
</script>
<svelte:window bind:innerWidth bind:innerHeight />

<div class="cloud-container">
  {#if $tags.length > 0}
    <div class="cloud">
        {#each words.sort((a,b)=>b.count-a.count) as word}
        <div class="word"
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
            #{word.text} <span class="count">{word.count}</span>
        </div>
        {/each}
    </div>
    {#if selectedTags.length>0}
    <div class="results">
        <div style="display: flex; justify-content: space-between; width: 100%; border-top: 1px dashed rgba(228, 228, 231, 1.0); margin-top: 30px; padding-top: 15px; margin-bottom: 15px">
            <span style="opacity: .5;">Results</span>

            <div class="pill-button" style="display: flex; width: 75px; align-self: end;margin-bottom:5px" on:click={() => {
                selectedTags=[]
                }} >
                Clear
            </div>
        </div>
        <div>
            {#each selectedTags as tag}
                <div style="display:flex; flex-direction:column; justify-content: left;">
                    <TagCloudPeople tag={tag}></TagCloudPeople>
                </div>
            {/each}
        </div>
        <div style="display:flex; flex-direction: column; justify-items: flex-start;">
            {#each $sessions.filter(s=>sessionHasTags(s,selectedTags)) as session}
            <SessionSummary session={session} showTags={true} showLeaders={false}></SessionSummary>
            {/each}
        </div>
    </div>
    {/if}
{:else}
  No tags yet!
  {/if}
</div>
<style>
    .results {
        width: 100%;
    }

    .cloud {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
        margin: 0 auto;
    }

    .cloud-container {
        width: 100%;
        text-align: center;
        padding-bottom: 30px;
    }
    .word {
        font-size: 12px;
        padding: 5px 9px;
        border-radius: 25px;
        display: inline-block;
        margin: 13px 13px 0 0;
        border: 1px solid #2F87D830;
        color: #2F87D8;
        background-color: transparent;
        transition: all .25s ease;
        margin-bottom: 0;
        display: inline;
    }

    .word:hover {
        cursor: pointer;
    }

    .neonText {
        color: #fff;
        background-color: #2F87D8;
        padding: 10px 12px;
        margin: 7px 10px -4px -3px;
        box-shadow: 0 10px 15px rgba(0,0,0,.25);
    }


    .neonText .count {
        background-color: white;
        color: #2F87D8;
    }
    .count {
        display: inline-block;
        font-size: 12px;
        background-color: #2F87D890;
        color: white;
        width: 18px;
        height: 18px;
        border-radius: 18px;
        line-height: 18px;
        top: -3px;
        position: relative;
    }


@media (min-width: 720px) {
    .word {
        font-size: 14px;
    }
}
</style>