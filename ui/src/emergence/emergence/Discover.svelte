<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';

    import type {  Record } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import Feed from './Feed.svelte';
    import TagCloud from './TagCloud.svelte'
    import Sense from './Sense.svelte';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: uiProps = store.uiProps

    onMount(async () => {        
        //await store.fetchMyStuff()

    });
 
</script>

<div class="pane-header">
    <h3>Discover</h3>
</div>
  
<div class="pane-content flex-center discover">
    <div class="discover-section">
        {#if $uiProps.sensing}
            <Sense></Sense>
        {/if}
    </div>
    <div class="discover-section">
        <TagCloud></TagCloud>
    </div>
    <div class="discover-section" style="">
        <Feed></Feed>            
    </div>
</div>

<style>
    .discover {
        width: 100%;
        display: block;
        flex-direction: column;
        background-color: lightgray;
    }
    .discover-section {
        display: flex;
    }
</style>