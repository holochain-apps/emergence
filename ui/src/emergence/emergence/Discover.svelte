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
    import FeedFilter from './FeedFilter.svelte';
  import Sync from './Sync.svelte';
  import { faFilter } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: uiProps = store.uiProps

    onMount(async () => {        

    });
    let showFilter = false

</script>

<div class="pane-header">
    <div class="header-content">
        <h3>Discover</h3>
        <div style="display: flex; flex-direction: row; align-self:center">
            <sl-button style=" " size=small on:click={() => { showFilter = !showFilter } } circle>
                <Fa icon={faFilter} />
            </sl-button>
        
            <div style="margin-left: 8px;">
                <Sync agentPubKey={undefined}></Sync>
            </div>
        </div>
    </div>
</div>
{#if showFilter}
<FeedFilter
    on:close-filter={()=>showFilter = false}
    on:update-filter={(e)=>{store.setUIprops({feedFilter: e.detail})}}
    filter={$uiProps.feedFilter}></FeedFilter>
{/if}
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
    }
    .discover-section {
        display: flex;
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
        justify-content: center;
    }

</style>