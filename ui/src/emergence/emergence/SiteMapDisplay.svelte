<script lang="ts">
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
    import type { Info, SiteLocation, SiteMap, Space } from './types';
    import { encodeHashToBase64 } from '@holochain/client';
    import { faList } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { fromUint8Array } from "js-base64";
    import { watchResize } from "svelte-watch-resize";

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let sitemap: Info<SiteMap>;
    let loading = true;
    $: loading, sitemap;
    let file: File | undefined
    let picB64: string | undefined
    let img: HTMLImageElement | undefined;
    let r = 0
    $: picB64, img, r
    $: spaces = store.spaces
    $: locations = $spaces && picB64 && img && (r>-1)? $spaces.map(s=>{return {loc: store.getSpaceSiteLocation(s), space:s}}) : []

    onMount(async () => {
        file = await store.fileStorageClient.downloadFile(sitemap.record.entry.pic);
        const data = await file.arrayBuffer();
        picB64 = fromUint8Array(new Uint8Array(data))
        loading = false
        if (sitemap === undefined) {
            throw new Error(`The sitemap input is required for the SiteMap element`);
        }
    });

    const handleClick = async (e:MouseEvent) => {
        picB64 = picB64
    }

    const getSpaceStyle = (location: SiteLocation | undefined) => {
        if (!location) return "display:none"
        const x = location.location.x / (img.naturalWidth/img.width) 
        const y = location.location.y / (img.naturalHeight/img.height) 
        return `top:${y-10}px;left:${x-10}px`
    }

    const handleResize = async () => {
        r+=1
    }

</script>

{#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <sl-spinner></sl-spinner>
    </div>
{:else}
    <div class="pane-content">
        <div class="pane-header">
        <h3>SiteMap</h3>
        <sl-button style="margin-left: 8px; " size=small on:click={() => { dispatch('show-all-spaces') } } circle>
            <Fa icon={faList} />
          </sl-button>
      
        </div>
        <div class="pic" use:watchResize={handleResize}>
            <div class="container">
            {#if file && picB64}
            
            {#each locations as loc}
                <div title={loc.space.record.entry.name} style={getSpaceStyle(loc.loc)} class="location"></div>
            {/each}
            <img  bind:this={img} on:click={handleClick} src="data:{file.type};base64,{picB64}" style="flex: 1; object-fit: cover; overflow: hidden">
            {/if}
            </div>
        </div>
    </div>
{/if}

<style>
img {
    width:100%;
}
.container {
    position: relative;
}
.location {
    position:absolute;
    width: 20px;
    height: 20px;
    background-color: red;
}

</style>