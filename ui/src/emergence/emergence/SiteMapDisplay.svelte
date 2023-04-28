<script lang="ts">
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
    import { slotEqual, type Info, type Session, type SiteLocation, type SiteMap, type Space, timeWindowStartToStr } from './types';
    import { faList, faStar } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { fromUint8Array } from "js-base64";
    import { watchResize } from "svelte-watch-resize";
  import  { HoloHashMap } from '@holochain-open-dev/utils';
  import { encodeHashToBase64, type ActionHash } from '@holochain/client';

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let sitemap: Info<SiteMap>;
    let loading = true;
    $: loading, sitemap;
    let file: File | undefined
    let picB64: string | undefined
    let img: HTMLImageElement | undefined;
    let r = 0
    let markerSize = 30
    let spaceDetails

    $: picB64, img, r, spaceDetails
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

    const handleClick = async (loc) => {
        spaceDetails = loc
    }

    const getSpaceStyle = (location: SiteLocation | undefined) => {
        if (!location) return "display:none"
        const x = location.location.x / (img.naturalWidth/img.width) 
        const y = location.location.y / (img.naturalHeight/img.height) 
        return `top:${y-markerSize/2}px;left:${x-markerSize/2}px;width:${markerSize}px;height:${markerSize}px`
    }

    const handleResize = async () => {
        r+=1
    }

    const sessionsInSpace = (space: Info<Space>) : Array<any> | undefined => {
        let rel = space.relations.filter(r=>r.relation.content.path == "space.sessions")
        const sessions: HoloHashMap<ActionHash, any> = new HoloHashMap
        const spaceB64 = encodeHashToBase64(space.original_hash)

        rel.forEach(r=> {
            const session = store.getSession(r.relation.dst)
            const slot = store.getSessionSlot(session)
            if (spaceB64 == encodeHashToBase64(slot.space)) {
                sessions.set(session.original_hash, {title: session.record.entry.title, window: slot.window})
            }
         })
        return Array.from(sessions.values())
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
            <div class="img-container">
                {#if spaceDetails}
                <div class="details">
                    {spaceDetails.space.record.entry.name}
                </div>
            {/if}
            {#if file && picB64}
            
            {#each locations as loc}
            <sl-tooltip  trigger="click">
                <div slot="content">
                    <div style="display:flex; flex-direction:column">
                        <span>{loc.space.record.entry.name}</span>
                        {loc.space.record.entry.description}
                        {#each sessionsInSpace(loc.space) as ses}
                            <span>{ses.title} -- {timeWindowStartToStr(ses.window)}</span>
                        {/each}
                    </div>
                </div>
                <div
                    style={getSpaceStyle(loc.loc)} class="location">
                    <Fa  icon={faStar} size={"2x"} color={"red"}></Fa>
                </div>
            </sl-tooltip>
            {/each}
            <img  bind:this={img} src="data:{file.type};base64,{picB64}" style="flex: 1; object-fit: cover; overflow: hidden">
            {/if}
            </div>
        </div>
    </div>
{/if}

<style>
img {
    width:100%;
}
.img-container {
    position: relative;
    padding: 0px;
}
.location {
    position:absolute;
}

.details {
    position: absolute;
    height: 200px;
    width: 500px;
    top: 50%;
    left: 20%;
    background-color: white;
    border: solid 1px;
    border-radius: 10px;
    padding: 10px;
}
</style>