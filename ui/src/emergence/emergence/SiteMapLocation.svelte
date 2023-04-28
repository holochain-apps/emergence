<script lang="ts">
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
    import type { Info, Coordinates, SiteMap } from './types';
    import { fromUint8Array } from "js-base64";
    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let sitemap: Info<SiteMap>;
    
    let loading = true;
    export let location: Coordinates| undefined
    let file: File | undefined
    let picB64: string | undefined
    let img: HTMLImageElement | undefined

    $: loading, sitemap, location, picB64, file;

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
	$: cssVarStyles = `--top:${y+10}px;--left:${x-10}px`;

</script>

<div class="pic" >
    {#if file}  
    {#if location}
    x:{x} y:{y}
        <div style="{cssVarStyles}" class="location">&nbsp</div>
    {/if} 
    {#if picB64}
    <img bind:this={img} on:click={handleClick} src="data:{file.type};base64,{picB64}" style="flex: 1; object-fit: cover; overflow: hidden">
    {/if}       
    
    {/if}
</div>

<style>
    img {
        width: 900px;
    }
.pic {
    cursor: crosshair;
}
.location {
    position:relative;
    top: var(--top);
    left: var(--left);
    width: 20px;
    height: 20px;
    background-color: red;
}
</style>