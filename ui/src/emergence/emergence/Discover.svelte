<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import type SlTabGroup from  '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';

    import type {  Record } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../stores/emergence-store';
    import Feed from './Feed.svelte';
    import TagCloud from './TagCloud.svelte'
    import People from './People.svelte';
    import FeedFilter from './FeedFilter.svelte';
    import { faClose, faFilter, faMap, faSearch, faTag } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    $: uiProps = store.uiProps
    let tabs : SlTabGroup
    let tagCloud: TagCloud

    onMount(async () => {        
        await store.fetchAgentStuff(store.myPubKey)
        const [panel, sub] = $uiProps.discoverPanel.split('#')
        if (tabs) {
            tabs.show(panel)
            if (panel == "tags" && sub) {
                tagCloud.setTag(sub)
            }
        }
    });
    let showFilter = false

</script>
<div class="pane-content flex-center discover">

    <sl-tab-group
        bind:this={tabs}
        on:sl-tab-show={(e)=>store.setUIprops({discoverPanel:e.detail.name})}
    >
        <sl-tab slot="nav" panel="tags">Tags</sl-tab>
        <sl-tab slot="nav" panel="people">People</sl-tab>
        <sl-tab slot="nav" panel="activity">Activity</sl-tab>

        <sl-tab-panel name="tags">
            <div class="discover-section">
                <TagCloud bind:this={tagCloud}></TagCloud>
            </div>
        </sl-tab-panel>
        <sl-tab-panel name="people">
            <People></People>
        </sl-tab-panel>
        <sl-tab-panel name="activity">

            <div class="discover-section" style="display: flex; flex-direction: column;">

                <div style="display: flex; flex-direction: row; align-self:flex-end; margin-bottom:10px">
                    <!-- {#if $uiProps.feedFilter.keyword}
                    <div class="pill-button"  on:click={() => {store.resetFilterAttributes(["keyword"],"feedFilter")}} >
                      <Fa size="sm" icon={faMagnifyingGlass} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
                    {/if}
               -->
                    {#if $uiProps.feedFilter.tags.length>0}
                    <div class="pill-button"  on:click={() => {store.resetFilterAttributes(["tags"],"feedFilter")}} >
                      <Fa size="sm" icon={faTag} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
                    {/if}
                    {#if $uiProps.feedFilter.space.length>0}
                    <div class="pill-button"  on:click={() => {store.resetFilterAttributes(["space"],"feedFilter")}} >
                        <Fa size="sm" icon={faMap} /><Fa size="sm" icon={faFilter} /> <Fa size="sm" icon={faClose} /></div>
                    {/if}
                </div>
                <div class="discover section-controls">
                    <div class="center-row search-bar">
                        <span class="search-icon"><Fa icon={faSearch} /></span>
                        <sl-input
                          value={$uiProps.feedFilter.keyword}
                          placeholder="Search content"
                          on:input={e => { 
                            const filter = $uiProps.feedFilter;
                            filter.keyword = e.target.value
                            store.setUIprops({feedFilter: filter})}}
                        ></sl-input>
                      </div> 
              
                    <sl-button class="filter" on:click={() => { showFilter = !showFilter } } >
                        <Fa icon={faFilter} /> Filter
                    </sl-button>
                </div>
            </div>
            {#if showFilter}
            <div class="discover-filter">
                <FeedFilter
                    on:close-filter={()=>showFilter = false}
                    on:update-filter={(e)=>{store.setUIprops({feedFilter: e.detail})}}
                    filter={$uiProps.feedFilter}></FeedFilter>
            </div>
            {/if}
            <div class="discover-section feed" style="">
                <Feed></Feed>            
            </div>

        </sl-tab-panel>
    </sl-tab-group>



</div>
<style>

    [aria-selected="true"] {
      border: 1px solid red;
    }

    .pane-content {
        padding-top: 0px;
    }

    sl-tab-group {
        --track-color: white;
        max-width: 100%;
    }
    sl-tab-group::part(sl-tab)[aria-selected="true"] {
        border: 1px solid red;
    }


    sl-tab-group::part(active-tab-indicator) {
        border: 1px solid rgba(66, 118, 217, .4);
    }

    sl-tab::part(active-tab) { 
        color: white;
        background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
    }

    sl-tab-group::part(nav) {
    background: linear-gradient(180deg, rgba(86, 94, 109, 0.05) 0%, rgba(86, 94, 109, 0.26) 100%);
    border-bottom: none;
    }

    .section-controls sl-button.filter {
        width: auto;
        height: auto;
        box-shadow: none;
    }

    .section-controls sl-button.filter::part(base) {
        box-shadow: none;
        height: 35px;
        width: 80px
    }

    .discover.section-controls {
        justify-content: space-between;
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        padding-bottom: 15px;
    }

    .search-bar {
        max-width: 720px;
        margin: 0 10px 0 0;
        position: relative;
    }

  .search-bar sl-input {
  }
  .search-icon {
    margin-right: 5px;
  }
@media (min-width: 720px) {
    .pane-content {
        padding-top: 50px;
    }

}

</style>
