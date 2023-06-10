<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import { encodeHashToBase64, type ActionHash } from '@holochain/client';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext, onMount } from 'svelte';
    import { storeContext } from '../../contexts';
    import { dedupHashes, type TagUse } from './types';
    import Avatar from './Avatar.svelte';
  
    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let sessionHash: ActionHash|undefined = undefined
    export let tag = ""
    
    $: tags = store.allTags
	$: folk = filter($tags)
	const filter = (tagUses: Array<TagUse>) => {
        let uses = tagUses.filter(t => t.tag === tag)
        if (sessionHash) {
            const sB64 = encodeHashToBase64(sessionHash)
            uses = uses.filter(t=>t.session_agents.find(s=> encodeHashToBase64(s.session) === sB64))
        }
        const agents = dedupHashes(uses.map(t=> t.session_agents.map(sa=>sa.agent)).flat())
        const folk = agents.map(a=> ({agentPubKey:a}))

        return folk
    }
    onMount(async () => {
        store.fetchTags()
    });

</script>

<div class="card" style="padding:10px; width: 100%;">
    <div style="display:flex; flex-direction: row; align-items: center;">

        <span class="tag">#{tag}</span>
        <div style="display:flex;">
        {#each folk as agent}
            <div style="display:flex; position: relative; top: -4px; margin-left: 10px;">
                <Avatar agentPubKey={agent.agentPubKey}></Avatar>
            </div>
        {/each}
        </div>
    </div>
</div>

<style>

  .tag {
    display: inline;
    border: 1px solid #25bab030;
    color: #25BAB1;
    background-color: transparent;
    margin-bottom: 0;
    display: inline;
    font-size: 12px;
    height: 30px;
    line-height: 30px;
  }
</style>