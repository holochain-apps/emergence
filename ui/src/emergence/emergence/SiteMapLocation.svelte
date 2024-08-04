<script lang="ts">
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../stores/emergence-store';
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
    import type { Info, Coordinates, SiteMap } from './types';
    import { fromUint8Array } from "js-base64";
    import { faStar } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let sitemap: Info<SiteMap>;
    
    let loading = true;
    export let location: Coordinates| undefined
    let file: File | undefined
    let picB64: string | undefined
    let img: HTMLImageElement | undefined
    let markerSize = 30

    $: loading, sitemap, location, picB64, file;

    onMount(async () => {
        await loadPic()
        loading = false
    });

    export const setSitemap = async (map: Info<SiteMap>) => {
        sitemap = map
        await loadPic()
    }
    const loadPic = async () => {
        if (sitemap === undefined) {
            throw new Error(`The sitemap input is required for the SiteMap element`);
        }
        file = await store.fileStorageClient.downloadFile(sitemap.record.entry.pic);
        const data = await file.arrayBuffer();
        picB64 = fromUint8Array(new Uint8Array(data))
    }

    const handleClick = async (e:MouseEvent) => {

        const scaleX = img.naturalWidth/img.width
        const scaleY = img.naturalHeight/img.height

        const bounds = img.getBoundingClientRect()
        const x = (e.clientX - bounds.left) ;
        const y = (e.clientY - bounds.top) ;
        location = {x: x*scaleX, y: y*scaleY}
        dispatch('sitemap-locate', location)
    }

    $: x = location && picB64 && img ? location.x / (img.naturalWidth/img.width) : 0
    $: y = location && picB64 && img ? location.y / (img.naturalHeight/img.height) : 0
	$: locStyle = `top:${y-markerSize/2}px;left:${x-markerSize/2}px;width:${markerSize}px;height:${markerSize}px`;

</script>
x{x} y{y}
<div class="pic" >
    <div class="img-container">
    {#if file}  
        {#if location}
            <div style="{locStyle}" class="location"><Fa  icon={faStar} size={"2x"} color={"red"}></Fa></div>
        {/if} 
        {#if picB64}
        <img bind:this={img} on:click={handleClick} src="data:{file.type};base64,{picB64}" style="flex: 1; object-fit: cover; overflow: hidden">
        {/if}       
    {/if}
    </div>
</div>

<style>
    img {
        width: 100%;
    }
.pic {
    cursor: crosshair;
}
.img-container {
    position: relative;
    padding: 0px;
}
.location {
    position:absolute;
}
</style>