<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import type SlSelect from '@shoelace-style/shoelace/dist/components/select/select.js';
    import { decodeHashFromBase64, encodeHashToBase64, type ActionHash, type EntryHash } from '@holochain/client';
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

<div>
    People using tag "{tag}"
  {#each folk as agent}
    <div>
        <Avatar agentPubKey={agent.agentPubKey}></Avatar>
    </div>
  {/each}
</div>