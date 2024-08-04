<script lang="ts">
    import { decodeHashFromBase64, encodeHashToBase64, type ActionHash, type EntryHash } from "@holochain/client";
    import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../stores/emergence-store';
    import { createEventDispatcher, getContext, onMount } from "svelte";
    import { sessionSelfTags, type Info, type Note, type InfoSession, APP_VERSION } from "./types";
    import { get } from "svelte/store";
    import sanitize from "sanitize-filename";
    import { fromUint8Array, toUint8Array } from "js-base64";
    import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import SenseResults from "./SenseResults.svelte";
    import type { HoloHashMap } from "@holochain-open-dev/utils";
    import { toPromise } from "@holochain-open-dev/stores";
    import DisableForOs from "./DisableForOs.svelte";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let exportJSON = ""
    const dispatch = createEventDispatcher();
    let sensing: SlCheckbox
    $: sitemaps = store.maps
    $: settings = store.settings
    $: allWindows = store.timeWindows


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

    const serializeInfo = async (info:Info<any>|InfoSession, hasPic: boolean) : Promise<any> => {
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
            info.entry['leaders'] = info.entry['leaders'].map(l => {return {type:l.type, hash:encodeHashToBase64(l.hash)}})
            info.entry['tags'] = sessionSelfTags(s)
            sessions.push(info)
        }
        const notes = []
        const n: HoloHashMap<ActionHash, Info<Note>| undefined> = store.neededStuffStore.notes.all()
        if (n) {
            for (const s of n.values()) {
                const info = await serializeInfo(s, true)
                info.entry['session'] = encodeHashToBase64(info.entry['session'])
                notes.push(info)
            }
        }
        
        const maps = []
        for (const s of get(store.maps)) { 
            const mapEntry = await serializeInfo(s, true)
            maps.push(mapEntry)
        }

        const proxyAgents = []
        for (const s of get(store.proxyAgents)) { 
            const proxyAgentEntry = await serializeInfo(s, true)
            proxyAgents.push(proxyAgentEntry)
        }

        const agents = []
        for (const [agentKey, profile] of await toPromise(store.profilesStore.allProfiles)) { 
            agents.push({
                pubKey: encodeHashToBase64(agentKey), 
                nickname:profile.entry.nickname, 
                bio: profile.entry.fields.bio, 
                location:profile.entry.fields.location})
        }

        exportJSON= JSON.stringify(
            {
                spaces,
                sessions,
                notes,
                windows: get(store.timeWindows),
                maps,
                agents,
                proxyAgents
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

    let uploadedPics = []

    const uploadImportedFile = async (e) : Promise<EntryHash> => {
        let pic = undefined
        if (e.pic_data) {
            const file = new File([toUint8Array(e.pic_data)], e.pic_file.name, {
                    lastModified: e.pic_data.last_modifed,
                    type: e.pic_file.file_type,
                     });
            pic = await store.fileStorageClient.uploadFile(file);
            uploadedPics[e.pic_hash] = pic
        }
        return pic
    }

    const doImport = async (data: any) => {
        const maps = {}
        for (const s of data.maps) {
            const e = s.entry
            let pic
            if (e.pic_data) {
                pic = await uploadImportedFile(e)
            } else {
                pic = uploadedPics[e.pic_hash]
            }
            if (!e.tags) {
                e.tags = []
            }
            const record = await store.createSiteMap(e.text, pic, e.tags)
            maps[s.original_hash] = record.actionHash

        }

        const proxyAgents = {}
        if (data.proxyAgents) {
            for (const s of data.proxyAgents) {
                const e = s.entry
                let pic = await uploadImportedFile(e)
                const record = await store.createProxyAgent(e.nickname, e.bio, e.location, pic)
                proxyAgents[s.original_hash] = {type: 'ProxyAgent', hash: record.actionHash}
            }
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
            const e = s.entry
            let leaders = e.leaders.filter(l=> l.type == "ProxyAgent" || (data.agents && data.agents.find(a=>a.pubKey == l.hash)))
                .map(l=>l.type == "ProxyAgent" ? proxyAgents[l.hash] : {type:"Agent", hash: decodeHashFromBase64(l.hash)})
            console.log("LEAD", leaders, e.title)
            if (leaders.length == 1 && leaders[0]== undefined) {
                leaders = []
            }
            const tags = e.tags  ? e.tags : []
            const links = e.links ? e.links : []
            let record
            try {
                console.log("CREATING: ",e.title)
                record = await store.createSession(e.session_type? e.session_type : 0, e.title, e.description,leaders,e.smallest, e.largest, e.duration, e.amenities, undefined, tags, links)
                sessions[s.original_hash] = record.actionHash
            } catch(e) {
                console.log("Import Error",e)
            }
            const relation = s.relations.filter(r=>r.content.path === "session.slot").sort((a,b) => b.timestamp - a.timestamp)[0]
            if (relation) {
                if (relation.content.data) {
                    const window = JSON.parse(relation.content.data)
                    await store.slot(record.actionHash, {window, space: spaces[relation.dst]})
                }
            }

        }
        for (const n of data.notes) {
            const e = n.entry
            let pic = await uploadImportedFile(e)
            if (!e.trashed) {
                const record = await store.createNote(sessions[e.session], e.text, e.tags, pic)
            }

        }
        await store.sync(undefined)
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
    <div class="admin-header">
        <h2>Emergence v{APP_VERSION}: Administration and Configuration</h2>
        <p>This page is available because you enabled being a conference steward.</p>
        <p>Use the buttons below to configure and administer the various aspects of your conference.</p>
    </div>
    <div class="admin-controls">
        <!-- <sl-button style="margin: 8px;"  on:click={async () => { throw("error!")} }>
            Error!
        </sl-button> -->
 
        <div class="admin-section">
            <div class="admin-section-desc">
                <h3>Site-maps</h3>
                <p>Create site-maps on which spaces will be placed.</p>
                {#if (!$sitemaps || $sitemaps.length==0) }
                    <p style="color:red"> Currently there are no site-maps configured.  Please add a site-map.</p>
                {/if}
            </div>

            <div class="admin-section-right">
                <strong>Site-maps</strong>: {$sitemaps.length}

                <div id="sitemaps-button">
                <sl-button  style="margin: 8px;" on:click={() => {  dispatch('open-sitemaps')} }>
                    Site Maps
                </sl-button></div>
                {#if $sitemaps.length > 0}
                    <div id="sitemmap-select"> 
                    <sl-select
                    value={$settings.current_sitemap ? encodeHashToBase64($settings.current_sitemap) : undefined}
                    style="margin: 8px; position: relative; "
                    label="Current Site Map"
                    on:sl-change={(e) => {
                        const s= $settings
                        const hash = decodeHashFromBase64(e.target.value)
                        s.current_sitemap = hash
                        store.setSettings(s)
                    } }
                    >
                    {#each $sitemaps as map}
                        <sl-option value={encodeHashToBase64(map.original_hash)}>{map.record.entry.text}</sl-option>
                    {/each}
                    </sl-select></div>
                {/if}
            </div>

        </div>

        <div class="admin-section">
            <div class="admin-section-desc">
                <h3>Scheduling</h3>
                <p>Set up time-slots and session schedule-grid</p>
                {#if (!$allWindows || $allWindows.length==0) }
                <p style="color:red"> Currently there are no time-slots configured.  Please go to the schedule page and add time-slots.</p>
            {/if}

            </div>
            <div class="admin-section-right">
                <strong>Time-slots</strong>: {$allWindows.length}
                <div id="schedule-button">        
                <sl-button  style="margin: 8px;"  on:click={() => { dispatch('open-slotting')} }>
                    Schedule
                </sl-button></div>
            </div>
        </div>

        <div class="admin-section">
            <div class="admin-section-desc">
                <h3>Proxy Agents</h3>
                <p>Create participant records for people who will attend but not use the app.</p>
            </div>
            <div id="proxyagents-button">
            <sl-button  style="margin: 8px;" on:click={() => {  dispatch('open-proxyagents')} }>
                Proxy Agents
            </sl-button></div>
        </div>

        <DisableForOs os={["android", "ios"]}>
            <div class="admin-section">
                <div class="admin-section-desc">
                    <h3>Import/Export</h3>
                </div>
                <div style="display:flex; flex-direction: row;">

                    <div id="export-button">
                    <sl-button  style="margin: 8px;"  on:click={async () => await doExport()}>
                        Export
                    </sl-button></div>
                    <div id="import-button">
                    <sl-button  style="margin: 8px;" on:click={()=>fileinput.click()}>
                        Import
                    </sl-button></div>
                </div>
            </div>
        </DisableForOs>
        
        <div class="admin-section" style="flex-direction:column">
            <div style="flex-direction:row;display:flex; justify-content:space-between">
                <div class="admin-section-desc">
                    <h3>Sense-making game</h3>
                    <p>Use the Sense-making game for large groups that will register interest interactively in real-time</p>
                </div>

                <div id="gameactive-button">
                    <sl-button  style="margin: 8px;" on:click={()=> {
                        const s= $settings
                        s.game_active = ! s.game_active
                        store.setSettings(s)
                    }
                    }>
                        {$settings.game_active ? 'Deactivate Sensing Game' : 'Activate Sensing Game'}
                    </sl-button>
                </div>
            </div>
            <div class="game-status">
                <h3>Total Attendees: {store.peopleCount() || 0}</h3>
          
                <h3> Sensemaking game is {#if $settings.game_active}Active{:else}Inactive{/if}</h3>
                <SenseResults></SenseResults>
            </div>
        
        </div>

        
    </div>
  

   
</div>
  <style>
    sl-checkbox {
        margin-right:15px;
        margin-left:15px;
    }

    .game-status {
        border-top: dashed 1px lightblue;
        margin-top: 10px;
    }
    
    .admin-controls {
        display: flex;
        flex-direction: column;
        width: 100%;
        justify-content: center;
        margin: 0 auto;
    }
    .admin-section {
        display: flex;
        max-width: 720px;
        width: 100%;
        justify-content: space-between;
        margin: 0 auto;
        margin-bottom: 20px;
        border-radius: 10px;
        border: solid 1px lightblue;
        padding: 10px;
    }

    .header-content h3 {
        text-align: center;
        width: 100%;
    }
    .admin-header{
        margin-bottom: 20px;
        text-align: center;
        width: 100%;
    }

  </style>