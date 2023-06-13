<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import type SlTabGroup from  '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';

    import type {  Record } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
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
                    <h3>Latest activity</h3>
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
              
                    <sl-button style=" " size=small on:click={() => { showFilter = !showFilter } } >
                        <Fa icon={faFilter} /> Filter
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

        </sl-tab-panel>
    </sl-tab-group>



</div>
<style>

    .pane-content {
        padding-top: 0;
    }

    sl-tab-group {
        max-width: 100%;
    }
    
    .discover.section-controls {
        justify-content: space-between;
        display: flex;
        flex-direction: row;
        align-items: center;
    }
    .search-bar {
        height:20px;
        max-width: 720px;
        margin: 0 auto 0 auto;
        position: relative;
    }

  .search-bar sl-input {
  }
  .search-icon {
    margin-right: 5px;
  }

</style>
