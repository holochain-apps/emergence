<script lang="ts">
    import { encodeHashToBase64, type AgentPubKey, type EntryHash } from "@holochain/client";
    import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext, onMount } from "svelte";
    import type { Info, SiteMap } from "./types";
    import { get } from "svelte/store";
    import { faFileExport, faFileImport, faPlus } from "@fortawesome/free-solid-svg-icons";
    import Fa from "svelte-fa";
    import sanitize from "sanitize-filename";
    import SiteMapCrud from "./SiteMapCrud.svelte";
    import AllSiteMaps from "./AllSiteMaps.svelte";
    import { fromUint8Array, toUint8Array } from "js-base64";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let exportJSON = ""
    let creatingMap = false;

    onMount(() => {
    })

    const download = (filename: string, text: string) => {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    const serializeInfo = async (info:Info<any>, hasPic: boolean) : Promise<any> => {
        let entry = info.record.entry
        if (hasPic) {
            if (entry.pic) {
                const file = await store.fileStorageClient.downloadFile(entry.pic);
                const data = await file.arrayBuffer();
                delete entry.pic
                entry.pic_data = fromUint8Array(new Uint8Array(data))
                entry.pic_file = {
                    name: file.name,
                    size: file.size,
                    file_type: file.type,
                    last_modified: file.lastModified,
                }
            }
            console.log(entry.pic_file)
        }
        const obj = {
            original_hash: encodeHashToBase64(info.original_hash),
            entry,
            relations: info.relations.map(ri => {
                const rel = {
                    src: encodeHashToBase64(ri.relation.src),
                    dst: encodeHashToBase64(ri.relation.dst),
                    content: ri.relation.content
                }
                return rel
            })
        }
        return obj
    }

    const doExport = async ()=> {
        const spaces = []
        for (const s of get(store.spaces)) { 
            spaces.push(await serializeInfo(s, true))
        }
        const sessions = []
        for (const s of get(store.sessions)) {
            const info = await serializeInfo(s, false)
            info.entry['leaders'] = info.entry['leaders'].map(l => encodeHashToBase64(l))
            sessions.push(info)
        }
        const notes = []
        for (const s of get(store.notes)) { 
            notes.push(await serializeInfo(s, true))
        }
        
        const maps = []
        for (const s of get(store.maps)) { 
            maps.push(await serializeInfo(s, true))
        }

        exportJSON= JSON.stringify(
            {
                spaces,
                sessions,
                notes,
                windows: get(store.timeWindows),
                maps,
            }
        )
        const fileName = sanitize(`emergence.json`)
        download(fileName, exportJSON)
    }

    let fileinput;
    const onFileSelected = (e)=>{
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.addEventListener("load", async () => {
            const b = JSON.parse(reader.result as string)
            doImport(b)
        }, false);
        reader.readAsText(file);
    };

    const uploadImportedFile = async (e) : Promise<EntryHash> => {
        let pic = undefined
        if (e.pic_data) {
            const file = new File([toUint8Array(e.pic_data)], e.pic_file.name, {
                    lastModified: e.pic_data.last_modifed,
                    type: e.pic_data.file_type,
                     });
        pic = await store.fileStorageClient.uploadFile(file);
        }
        return pic
    }

    const doImport = async (data: any) => {
        for (const s of data.maps) {
            const e = s.entry
            let pic = await uploadImportedFile(e)


            await store.createSiteMap(e.text, pic)
        }
        for (const s of data.windows) {
            if (! s.tags) {
                s.tags = []
            }
            await store.createTimeWindow(new Date(s.start), s.duration, s.tags)
        }
        for (const s of data.spaces) {
            const e = s.entry
            if (! e.tags) {
                e.tags = []
            }
            let pic = await uploadImportedFile(e)
            await store.createSpace(e.name,e.description,[],e.capacity, e.amenities, e.tags, pic, undefined)
        }
        for (const s of data.sessions) {
            const leaders = [] // fixme
            const slot = undefined
            const e = s.entry

            await store.createSession(e.title, e.description,leaders,e.smallest, e.largest, e.duration, e.amenities, slot)
        }
    }
</script>
<input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >
{#if creatingMap}
    <div class="modal">
        <SiteMapCrud
        on:sitemap-created={() => {creatingMap = false;} }
        on:edit-canceled={() => { creatingMap = false; } }
        ></SiteMapCrud></div>
{/if}


    <div class="header">
        <div>
            <sl-button style="margin-left: 8px;" size=small on:click={async () => await doExport()} circle>
                <Fa icon={faFileExport} />
            </sl-button>
            <sl-button style="margin-left: 8px;" size=small on:click={()=>fileinput.click()} circle>
                <Fa icon={faFileImport} />
            </sl-button>
        </div>
    </div>
    <div>
        Create Sitemap:
        <sl-button on:click={() => {creatingMap = true; } } circle>
          <Fa icon={faPlus} />
        </sl-button>

        <AllSiteMaps></AllSiteMaps>
    </div>

  <style>
    .header{
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: solid 1px;
    }

  </style>