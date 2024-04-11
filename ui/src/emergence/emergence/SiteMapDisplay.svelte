<script lang="ts">
    import { storeContext } from '../../contexts';
    import type { EmergenceStore  } from '../../emergence-store';
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
    import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
    import { type Info, type SiteLocation, type SiteMap, type Space, timeWindowStartToStr, DetailsType, type DownloadedFile } from './types';
    import { faList } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';
    import { fromUint8Array } from "js-base64";
    import { watchResize } from "svelte-watch-resize";
    import  { HoloHashMap } from '@holochain-open-dev/utils';
    import SpaceCrud from './SpaceCrud.svelte';
    import { encodeHashToBase64, type ActionHash } from '@holochain/client';
    import AllSpaces from './AllSpaces.svelte';

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();

    export let sitemap: Info<SiteMap>;
    let loading = true;
    $: loading, sitemap;
    let file: DownloadedFile | undefined
    let img: HTMLImageElement | undefined;
    let r = 0
    let markerSize = 30
    let spaceDetails
    let spacesDrawer = false
    let createSpaceDialog: SpaceCrud

    $: img, r, spaceDetails
    $: spaces = store.spaces
    $: locations = $spaces && img && (r>-1)? $spaces.map(s=>{return {loc: store.getSpaceSiteLocation(s, sitemap.original_hash), space:s}}) : []
    $: uiProps = store ? store.uiProps : undefined

    let mapCanvas

    onMount(async () => {
        file = await store.downloadFile(sitemap.record.entry.pic)
        loading = false
        if (sitemap === undefined) {
            throw new Error(`The sitemap input is required for the SiteMap element`);
        }

        if (mapCanvas) { // sometimes it looks like svelte doesn't complete the bind before this runs
            //drag to scroll map
            mapCanvas.scrollTop = 0;
            mapCanvas.scrollLeft = 0;
        }

        let pos = { top: 0, left: 0, x: 0, y: 0 };

        const mouseDownHandler = function (e) {
            // Change the cursor and prevent user from selecting the text
            console.log('down');
            mapCanvas.style.cursor = 'grabbing';
            mapCanvas.style.userSelect = 'none';
            pos = {
                // The current scroll
                left: mapCanvas.scrollLeft,
                top: mapCanvas.scrollTop,
                // Get the current mouse position
                x: e.clientX,
                y: e.clientY,
            };

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        };

        const mouseMoveHandler = function (e) {
            // How far the mouse has been moved
            const dx = e.clientX - pos.x;
            console.log('move');
            const dy = e.clientY - pos.y;

            // Scroll the element
            mapCanvas.scrollTop = pos.top - dy;
            mapCanvas.scrollLeft = pos.left - dx;
        };

        const mouseUpHandler = function () {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);

            mapCanvas.style.cursor = 'grab';
            mapCanvas.style.removeProperty('user-select');
        };
    });

    const handleClick = async (loc) => {
        spaceDetails = loc
    }

    const getLocationMarkerStyle = (location: SiteLocation | undefined) => {
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
            if (session && !session.record.entry.trashed) {
                const slot = store.getSessionSlot(session)
                if (slot && spaceB64 == encodeHashToBase64(slot.space)) {
                    sessions.set(session.original_hash, {title: session.record.entry.title, window: slot.window})
                }
            }
         })
        return Array.from(sessions.values())
    }
</script>

<SpaceCrud
bind:this={createSpaceDialog}
on:space-created={() => {} }
></SpaceCrud>

{#if spacesDrawer}
    <div class="spaces-drawer modal">
        <div class="spaces-list">
        <AllSpaces></AllSpaces>
        </div>
    </div>
{/if}

{#if loading}
    <div bind:this={mapCanvas} id="map"  style="display: flex; flex: 1; align-items: center; justify-content: center">
        <sl-spinner></sl-spinner>
    </div>
{:else}
    <div bind:this={mapCanvas} id="map" class="SiteMapDisplay {spacesDrawer}">
        <div class="map-controls">
            <div class="toggle-drawer map-control" on:click={() => { spacesDrawer = ! spacesDrawer } } >
                {#if spacesDrawer}
                <img src="/images/x.svg" height="18">
                {:else}
                <Fa icon={faList} />
                {/if}
            </div>
            {#if $uiProps.amSteward}
            <div class="create-space map-control" on:click={() => {createSpaceDialog.open(undefined) } }>
              <span>+</span> Create
            </div>
          {/if}
        </div>
        <div class="pane-content spaces-container">
            
            <div class="map-image" use:watchResize={handleResize}>
                <div class="img-container">
                    {#if spaceDetails}
                    <div class="details">
                        {spaceDetails.space.record.entry.name}
                    </div>
                {/if}
                {#if file}
                
                {#each locations as loc}
                <sl-tooltip >
                    <div slot="content">
                        <div class="tooltip-text">
                            <span>{loc.space.record.entry.name}</span>
                            {loc.space.record.entry.description}
                            {#each sessionsInSpace(loc.space) as ses}
                                <span>{ses.title} -- {timeWindowStartToStr(ses.window)}</span>
                            {/each}
                        </div>
                    </div>
                    <div
                        on:click={()=> store.openDetails(DetailsType.Space, loc.space.original_hash)}
                        style={getLocationMarkerStyle(loc.loc)} class="location">
                        {loc.space.record.entry.key}
                    </div>
                </sl-tooltip>
                {/each}
                <img class="map-image" bind:this={img} src="data:{file.file.type};base64,{file.data}">
                {/if}
                </div>
            </div>
        </div>
    </div>
{/if}
<style>
.map-img {
    width:100%;
    min-height: calc(100vh - 40px);
}

.create-space {
    display: block;
}

.create-space span {
    color: white;
    padding-right: 5px;
}

.content, .open-drawer {
    color: white;
}

.SiteMapDisplay {
    pointer-events: auto;
    width: 100vw;
    height: 100%;
    overflow: auto;
    cursor: grab;
}
.pane-header {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

.header-content {
    max-width: 100%;
}

.pane-content {
    position: relative;
    z-index: 0;
    width: 100%;
    padding-top:0;
    min-width: 1000px;
    max-height: 100%;
}
.img-container {
    position: relative;
    padding: 0px;
}
.location {
    position: absolute;
    border: 1px solid rgba(33, 179, 95, .5);
    border-radius: 50%;
    text-align: center;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px #0D5E3340;
    padding-top: 3px;
    font-weight: normal;
    cursor: pointer;
    background: linear-gradient(129.46deg, #2F87D8 30%, #00D1FF 90%);
    box-shadow: 0 5px 5px rgba(0,0,0,.3);
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

.spaces-container {
    display:flex;
    flex-direction: row;
}

.spaces-drawer {
    width: 100vw;
    min-width: 100vw;
    max-width: 320px;
    max-height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
    padding-top: 60px;
}

.spaces-list {
    padding-bottom: 100px;
}

.map-controls {
    position: absolute;
    top: 20px;
    left: 20px;
    transition: all .25s ease;
    z-index: 5;
    display: flex;
    flex-direction: row;
}

.map-control {
    background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
    min-height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 10px 15px rgba(0,0,0,.35);
    border-radius: 5px;
    padding: 0 20px;
    margin-right: 20px;
    cursor: pointer;
}

.map-image {
    min-height: 100vh;
    max-width: 100%;
    flex: 1;
    width: auto;
}

.tooltip-text, .tooltip-text span {
    display: flex; 
    flex-direction: column;
    color: white;
    font-size: 12px;
}

sl-tooltip {
    background-color: rgba(131, 58, 217, 1.0);
}

.tooltip-text span {
    font-size: 14px;
    opacity: 1;
    font-weight: bold;
}

.true .map-controls {
    left: 10px;
    top: 10px;
}


@media (min-width: 430px) {
.spaces-drawer {
    width: 320px;
    min-width: 320px;
    max-width: 320px;
    max-height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
    padding-top: 60px;
    transition: all .25s ease;
}

.true .map-controls {
        left: 340px;
}
}

@media (min-width: 720px) {
    .map-controls {
        top: 70px;
    }

    .true .map-controls {
        top: 70px;
    }

    .spaces-container {
        padding-top: 50px;
    }
}



@media (max-aspect-ratio: 14/10) {
    .map-image {
        min-height: initial;
        min-width: initial;
        width: initial;
        height: initial;
        max-width: initial;
        height: 100vh;
    }
}


@media (min-aspect-ratio: 2/1) {
    .map-image {
        border: 1px solid blue;
    }
}

@media (min-width: 1000px) {

}
</style>