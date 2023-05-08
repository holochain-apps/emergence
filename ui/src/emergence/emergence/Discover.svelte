<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

    import type {  Record } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import Feed from './Feed.svelte';
    import TagCloud from './TagCloud.svelte'

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let steward: SlCheckbox

    onMount(async () => {
        store.fetchMyStuff()
    });
    let tab = "feed"

    $: amSteward = store.amSteward
 
</script>

<div class="pane-header">
    <h3>Discover</h3>
</div>
  
<div class="pane-content">

    <sl-tab-group>
        <sl-tab slot="nav" panel="feed">Feed
        </sl-tab>
        <sl-tab slot="nav" panel="cloud">Tag Cloud
        </sl-tab>
    
        <sl-tab-panel name="feed">
            <Feed></Feed>            
        </sl-tab-panel>
        <sl-tab-panel name="cloud">
            <TagCloud></TagCloud>

        </sl-tab-panel>
    </sl-tab-group>
</div>

<style>
</style>