<script lang="ts">
    import { encodeHashToBase64, type EntryHash } from "@holochain/client";
    import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import { createEventDispatcher, getContext, onMount } from "svelte";
    import { sessionSelfTags, type Info } from "./types";
    import { get } from "svelte/store";
    import sanitize from "sanitize-filename";
    import { fromUint8Array, toUint8Array } from "js-base64";
    import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let exportJSON = ""
    const dispatch = createEventDispatcher();
    let sensing: SlCheckbox
    $:uiProps = store.uiProps

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
                entry.pic_hash = encodeHashToBase64(entry.pic)
                delete entry.pic
                entry.pic_data = fromUint8Array(new Uint8Array(data))
                entry.pic_file = {
                    name: file.name,
                    size: file.size,
                    file_type: file.type,
                    last_modified: file.lastModified,
                }
            }
        }
        const obj = {
            original_hash: encodeHashToBase64(info.original_hash),
            entry,
            relations: info.relations.map(ri => {
                const rel = {
                    timestamp: ri.timestamp,
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
            info.entry['tags'] = sessionSelfTags(s)
            sessions.push(info)
        }
        const notes = []
        for (const s of get(store.notes)) {
            const info = await serializeInfo(s, true)
            info.entry['session'] = encodeHashToBase64(info.entry['session'])
            notes.push(info)
        }
        
        const maps = []
        for (const s of get(store.maps)) { 
            const mapEntry = await serializeInfo(s, true)
            mapEntry.entryHash = encodeHashToBase64(s.record.entryHash)
            maps.push(mapEntry)
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
        const maps = {}
        for (const s of data.maps) {
            const e = s.entry
            let pic = await uploadImportedFile(e)
            const record = await store.createSiteMap(e.text, pic)
            maps[s.entryHash] = record.entryHash

        }
        for (const s of data.windows) {
            if (! s.tags) {
                s.tags = []
            }
            await store.createTimeWindow(new Date(s.start), s.duration, s.tags)
        }
        const spaces = {}
        for (const s of data.spaces) {
            const e = s.entry
            if (! e.tags) {
                e.tags = []
            }
            let pic = await uploadImportedFile(e)
            const record = await store.createSpace(e.key ? e.key : "", e.name,e.description,[],e.capacity, e.amenities, e.tags, pic, undefined)
            spaces[s.original_hash] = record.actionHash
            const relation = s.relations.filter(r=>r.content.path === "space.location").sort((a,b) => b.timestamp - a.timestamp)[0]
            if (relation) {
                await store.client.createRelations([
                    {   
                        src: record.actionHash,
                        dst: maps[relation.dst],
                        content:  {
                            path: `space.location`,
                            data: relation.content.data
                        }
                    }                    
                ])
            }

        }
        const sessions = {}
        for (const s of data.sessions) {
            const leaders = [] // fixme
            const e = s.entry
            const tags = e.tags  ? e.tags : []
            let record
            try {
             record = await store.createSession(e.title, e.description,leaders,e.smallest, e.largest, e.duration, e.amenities, undefined, tags)
             sessions[s.original_hash] = record.actionHash
            } catch(e) {
                console.log("Import Error",e)
            }
            const relation = s.relations.filter(r=>r.content.path === "session.space").sort((a,b) => b.timestamp - a.timestamp)[0]
            if (relation) {
                const window = JSON.parse(relation.content.data)
                await store.slot(record.actionHash, {window, space: spaces[relation.dst]})
            }

        }
        for (const n of data.notes) {
            const e = n.entry
            let pic = await uploadImportedFile(e)
            if (!e.trashed) {
                const record = await store.createNote(sessions[e.session], e.text, e.tags, pic)
            }

        }
        store.sync()
    }
</script>
<input style="display:none" type="file" accept=".json" on:change={(e)=>onFileSelected(e)} bind:this={fileinput} >

<div class="pane-header">
    <div class="header-content">
        <h3>Admin</h3>
        <div style="display:flex">
            &nbsp;
        </div>
    </div>
  </div>
<div class="pane-content">
    <div class="admin-controls">
        <sl-button style="margin: 8px;"  on:click={() => {  dispatch('open-slotting')} }>
            Manage Schedule
        </sl-button>

        <sl-button style="margin: 8px;" on:click={() => {  dispatch('open-sitemaps')} }>
            Site Maps
        </sl-button>

        <sl-button style="margin: 8px;"  on:click={async () => await doExport()}>
            Export
        </sl-button>

        <sl-button style="margin: 8px;" on:click={()=>fileinput.click()}>
            Import
        </sl-button>
    </div>
    <div>

    </div>



   
</div>
  <style>
    sl-checkbox {
        margin-right:15px;
        margin-left:15px;
    }

    .admin-controls {
        display: flex;
        justify-content: center;
        width: 100%;
    
    }

    .header-content h3 {
        text-align: center;
        width: 100%;
    }
  </style>