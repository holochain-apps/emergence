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
    import { faClose, faFilter, faMagnifyingGlass, faMap, faTag } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: uiProps = store.uiProps
    $: settings = store.settings

    onMount(async () => {        

    });
    let showFilter = false

</script>

<div class="pane-header">
    <div class="header-content">
        <h3>Discover</h3>
        
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
        {#if $settings.game_active}
            <Sense></Sense>
        {/if}
    </div>
    <div class="discover-section">
        <TagCloud></TagCloud>
    </div>
    <div class="discover-section" style="display: flex; flex-direction: column;">

        <div style="display: flex; flex-direction: row; align-self:flex-end; margin-bottom:10px">
            {#if $uiProps.feedFilter.keyword}
            <div class="pill-button"  on:click={() => {store.resetFilterAttributes(["keyword"],"feedFilter")}} >
              <Fa size="sm" icon={faMagnifyingGlass} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
            {/if}
      
            {#if $uiProps.feedFilter.tags.length>0}
            <div class="pill-button"  on:click={() => {store.resetFilterAttributes(["tags"],"feedFilter")}} >
              <Fa size="sm" icon={faTag} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
            {/if}
            {#if $uiProps.feedFilter.space.length>0}
            <div class="pill-button"  on:click={() => {store.resetFilterAttributes(["space"],"feedFilter")}} >
                <Fa size="sm" icon={faMap} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
            {/if}
        </div>
        <div class="section-controls">
            <sl-button style=" " size=small on:click={() => { showFilter = !showFilter } } circle>
                <Fa icon={faFilter} />
            </sl-button>
        </div>
    </div>
    <div class="discover-filter">
        {#if showFilter}
        <FeedFilter
            on:close-filter={()=>showFilter = false}
            on:update-filter={(e)=>{store.setUIprops({feedFilter: e.detail})}}
            filter={$uiProps.feedFilter}></FeedFilter>
        {/if}
    </div>
    <div class="discover-section feed" style="">
        <Feed></Feed>            
    </div>
</div>
<style>

</style>
