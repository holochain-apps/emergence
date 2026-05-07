<script lang="ts">
    import { decodeHashFromBase64, encodeHashToBase64, type ActionHash, type EntryHash, type HoloHashMap } from "@holochain/client";
    import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../stores/emergence-store';
    import { createEventDispatcher, getContext, onMount } from "svelte";
    import { sessionSelfTags, type Info, type Note, type InfoSession, APP_VERSION, DNA_VERSION, type SessionType, type Amenity } from "./types";
    import { get } from "svelte/store";
    import sanitize from "sanitize-filename";
    import { fromUint8Array, toUint8Array } from "js-base64";
    import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
    import '@shoelace-style/shoelace/dist/components/select/select.js';
    import '@shoelace-style/shoelace/dist/components/option/option.js';
    import '@shoelace-style/shoelace/dist/components/details/details.js';
    import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
    import SenseResults from "./SenseResults.svelte";
        import { toPromise } from "@holochain-open-dev/stores";
    import DisableForOs from "./DisableForOs.svelte";
    import TemplateSelector from "./TemplateSelector.svelte";
    import { isTauriContext } from "./utils";
    import SvgIcon from "./SvgIcon.svelte";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let templateSelector: TemplateSelector;
    let exportJSON = ""
    const dispatch = createEventDispatcher();
    let sensing: SlCheckbox

    const { getStore }: any = getContext('cloneManagerStore');
    let cloneManagerStore: CloneManagerStore = getStore();

    $: sitemaps = store.maps
    $: settings = store.settings
    $: allWindows = store.timeWindows
    $: activeDnaHash = cloneManagerStore.activeDnaHash;
    $: activeDnaHashB64 = encodeHashToBase64($activeDnaHash);

    let manualConfig = false
    $: unconfigured = (!$sitemaps || $sitemaps.length==0) && (!$allWindows || $allWindows.length==0)
    $: showInitialSetup = unconfigured && !manualConfig

    // --- Network server config (tauri only) ---
    let bootstrapUrl = "";
    let relayUrl = "";
    let networkConfigLoaded = false;

    async function loadNetworkConfig() {
        if (!isTauriContext()) return;
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            let config = await invoke("get_user_network_config");
            if (!config) {
                config = await invoke("default_user_network_config");
            }
            bootstrapUrl = config.bootstrapUrl || "";
            relayUrl = config.relayUrl || "";
            networkConfigLoaded = true;
        } catch (e) {
            console.error("Failed to load network config:", e);
        }
    }

    async function saveNetworkConfig() {
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("set_user_network_config", { bootstrapUrl, relayUrl });
        } catch (e) {
            console.error("Failed to save network config:", e);
        }
    }

    async function resetNetworkDefaults() {
        try {
            const { invoke } = await import("@tauri-apps/api/core");
            const defaults = await invoke("default_user_network_config");
            bootstrapUrl = defaults.bootstrapUrl || "";
            relayUrl = defaults.relayUrl || "";
            await invoke("set_user_network_config", { bootstrapUrl, relayUrl });
        } catch (e) {
            console.error("Failed to reset network config:", e);
        }
    }

    onMount(() => {
        loadNetworkConfig();
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

    // --- Session-type / amenity admin ---
    // Selection (storage) is by index in the underlying array. Display order
    // is driven by the `order` field; a soft-deleted entry stays in place so
    // existing Session/Space references remain stable.
    const sortedSessionTypeIndices = (types: Array<SessionType>): Array<number> => {
        const idx = types.map((_, i) => i)
        idx.sort((a, b) => (types[a].order ?? 0) - (types[b].order ?? 0))
        return idx
    }
    const sortedAmenityIndices = (amenities: Array<Amenity>): Array<number> => {
        const idx = amenities.map((_, i) => i)
        idx.sort((a, b) => (amenities[a].order ?? 0) - (amenities[b].order ?? 0))
        return idx
    }
    const nextOrder = (entries: Array<{order?: number}>): number =>
        entries.reduce((m, e) => Math.max(m, (e.order ?? 0) + 1), 0)

    const addSessionType = async () => {
        const s = get(store.settings)
        s.session_types = [...(s.session_types ?? []), {
            name: "New Type", color: "#cccccc",
            can_rsvp: false, can_any_time: false, can_leaderless: false,
            deleted: false, order: nextOrder(s.session_types ?? []),
        }]
        await store.setSettings(s)
    }
    const updateSessionType = async (i: number, patch: Partial<SessionType>) => {
        const s = get(store.settings)
        s.session_types = s.session_types.map((t, j) => j === i ? { ...t, ...patch } : t)
        await store.setSettings(s)
    }
    let draggedSessionTypeIdx: number | null = null
    let draggedAmenityIdx: number | null = null
    let dropTargetSessionTypeIdx: number | null = null
    let dropTargetAmenityIdx: number | null = null
    // 'before' draws the indicator above the target row; 'after' draws it below.
    let dropPosition: "before" | "after" = "before"

    const computeDropPosition = (e: DragEvent): "before" | "after" => {
        const el = e.currentTarget as HTMLElement
        const rect = el.getBoundingClientRect()
        return (e.clientY - rect.top) < rect.height / 2 ? "before" : "after"
    }

    // Move the dragged storage-index `from` to occupy the display position
    // currently held by storage-index `to`. We renumber `order` over the
    // active (non-deleted) entries to keep the sequence stable.
    const reorderSessionType = async (from: number, to: number, position: "before" | "after") => {
        if (from === to) return
        const s = get(store.settings)
        const visible = sortedSessionTypeIndices(s.session_types).filter(j => !s.session_types[j].deleted)
        const fromPos = visible.indexOf(from)
        const toPos = visible.indexOf(to)
        if (fromPos < 0 || toPos < 0) return
        const next = [...visible]
        next.splice(fromPos, 1)
        const adjustedTo = next.indexOf(to) + (position === "after" ? 1 : 0)
        next.splice(adjustedTo, 0, from)
        s.session_types = s.session_types.map((t, j) => {
            const newPos = next.indexOf(j)
            return newPos >= 0 ? { ...t, order: newPos } : t
        })
        await store.setSettings(s)
    }

    const addAmenity = async () => {
        const s = get(store.settings)
        s.amenities = [...(s.amenities ?? []), {
            name: "New Amenity", deleted: false, order: nextOrder(s.amenities ?? []),
        }]
        await store.setSettings(s)
    }
    const updateAmenity = async (i: number, patch: Partial<Amenity>) => {
        const s = get(store.settings)
        s.amenities = s.amenities.map((a, j) => j === i ? { ...a, ...patch } : a)
        await store.setSettings(s)
    }
    const reorderAmenity = async (from: number, to: number, position: "before" | "after") => {
        if (from === to) return
        const s = get(store.settings)
        const visible = sortedAmenityIndices(s.amenities).filter(j => !s.amenities[j].deleted)
        const fromPos = visible.indexOf(from)
        const toPos = visible.indexOf(to)
        if (fromPos < 0 || toPos < 0) return
        const next = [...visible]
        next.splice(fromPos, 1)
        const adjustedTo = next.indexOf(to) + (position === "after" ? 1 : 0)
        next.splice(adjustedTo, 0, from)
        s.amenities = s.amenities.map((am, j) => {
            const newPos = next.indexOf(j)
            return newPos >= 0 ? { ...am, order: newPos } : am
        })
        await store.setSettings(s)
    }

    const handleApplyTemplate = async (e) => {
        await doImport(e.detail);
        const template = e.detail
        const maps = get(store.maps)
        const s = get(store.settings)
        let dirty = false
        if (maps && maps.length > 0) {
            s.current_sitemap = maps[maps.length - 1].original_hash
            dirty = true
        }
        if (template.sessionTypes && template.sessionTypes.length > 0) {
            s.session_types = template.sessionTypes
            dirty = true
        }
        if (template.amenities && template.amenities.length > 0) {
            s.amenities = template.amenities
            dirty = true
        }
        if (dirty) await store.setSettings(s)
    };
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
        <h2>Emergence: Administration and Configuration</h2> 
        <p>Version: {APP_VERSION} (DNA {DNA_VERSION})</p>
    </div>
    <div class="admin-controls">
        <!-- <sl-button style="margin: 8px;"  on:click={async () => { throw("error!")} }>
            Error!
        </sl-button> -->

        {#if showInitialSetup}
        <div class="admin-section">
            <div class="admin-section-desc">
                <h3>Get Started</h3>
                <p>Configure Emergence by choosing how to begin.</p>
            </div>
            <div class="admin-section-right">
                <sl-button variant="primary" style="margin: 8px;" on:click={() => templateSelector.open()}>
                    Quick Setup
                </sl-button>
                <sl-button style="margin: 8px;" on:click={() => fileinput.click()}>
                    Import a Setup
                </sl-button>
                <sl-button style="margin: 8px;" on:click={() => manualConfig = true}>
                    Manual Config
                </sl-button>
            </div>
        </div>
        {:else}

        {#if unconfigured && manualConfig}
        <div style="text-align:right; margin-bottom:8px;">
            <sl-button size="small" variant="text" on:click={() => manualConfig = false}>
                ← Back to Quick Setup
            </sl-button>
        </div>
        {/if}

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
            <div class="admin-section-desc">
                <h3 style="display:flex; align-items:center; gap:6px;">
                    Session Types
                    <sl-tooltip
                        placement="bottom"
                        class="settings-help-tooltip"
                        style="
                            --max-width: 460px;
                            --sl-tooltip-background-color: #ffffff;
                            --sl-tooltip-color: #111;
                            --sl-tooltip-border-radius: 14px;
                            --sl-tooltip-padding: 28px 32px;
                            --sl-tooltip-font-size: 14px;
                            --sl-tooltip-line-height: 1.5;
                            --sl-tooltip-arrow-size: 8px;
                        ">
                        <div slot="content" style="text-align:left;">
                            <strong>RSVP</strong> &mdash; sessions of this type show an "I'm going / interested" picker; useful when attendance matters (e.g. a Talk or Workshop).<br/><br/>
                            <strong>Any time</strong> &mdash; the session doesn't have to fit into the published time-grid. The creator gets a free-form date/time picker instead. Use for things like meals or pop-ups.<br/><br/>
                            <strong>Leaderless</strong> &mdash; sessions of this type can be created without naming a host or leader. Use for community time, open hangouts, etc.
                        </div>
                        <span class="info-icon" tabindex="0"><SvgIcon icon="faCircleInfo" size={14} color="#666" /></span>
                    </sl-tooltip>
                </h3>
                <p>The categories of session that can be created. Sessions reference a type by its position in this list, so deletion is a soft hide; reordering only affects display.</p>
            </div>
            <div style="display:flex; flex-direction:column; gap: 8px; margin-top: 8px;">
                {#each sortedSessionTypeIndices($settings.session_types ?? []) as i (i)}
                    {@const type = $settings.session_types[i]}
                    <div class="type-row"
                        class:deleted-row={type.deleted}
                        class:drop-before={dropTargetSessionTypeIdx === i && dropPosition === "before"}
                        class:drop-after={dropTargetSessionTypeIdx === i && dropPosition === "after"}
                        class:dragging={draggedSessionTypeIdx === i}
                        draggable={!type.deleted}
                        on:dragstart={(e) => { draggedSessionTypeIdx = i; if (e.dataTransfer) e.dataTransfer.effectAllowed = "move" }}
                        on:dragover={(e) => {
                            if (type.deleted || draggedSessionTypeIdx === null) return
                            e.preventDefault()
                            if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
                            dropTargetSessionTypeIdx = i
                            dropPosition = computeDropPosition(e)
                        }}
                        on:dragleave={() => { if (dropTargetSessionTypeIdx === i) dropTargetSessionTypeIdx = null }}
                        on:drop={(e) => {
                            e.preventDefault()
                            if (draggedSessionTypeIdx !== null && !type.deleted)
                                reorderSessionType(draggedSessionTypeIdx, i, dropPosition)
                            draggedSessionTypeIdx = null
                            dropTargetSessionTypeIdx = null
                        }}
                        on:dragend={() => { draggedSessionTypeIdx = null; dropTargetSessionTypeIdx = null }}>
                        <div class="drag-handle" title="Drag to reorder"><SvgIcon icon="faGripVertical" size={14} color="#888" /></div>
                        <sl-input size="small" style="flex:2" value={type.name} disabled={type.deleted}
                            on:sl-change={(e) => updateSessionType(i, { name: e.target.value })}></sl-input>
                        <input type="color" value={type.color} disabled={type.deleted}
                            on:change={(e) => updateSessionType(i, { color: e.currentTarget.value })}>
                        <sl-checkbox checked={type.can_rsvp} disabled={type.deleted}
                            on:sl-change={(e) => updateSessionType(i, { can_rsvp: e.target.checked })}>RSVP</sl-checkbox>
                        <sl-checkbox checked={type.can_any_time} disabled={type.deleted}
                            on:sl-change={(e) => updateSessionType(i, { can_any_time: e.target.checked })}>Any time</sl-checkbox>
                        <sl-checkbox checked={type.can_leaderless} disabled={type.deleted}
                            on:sl-change={(e) => updateSessionType(i, { can_leaderless: e.target.checked })}>Leaderless</sl-checkbox>
                        <sl-button size="small" variant={type.deleted ? "default" : "danger"}
                            on:click={() => updateSessionType(i, { deleted: !type.deleted })}>
                            {type.deleted ? "Restore" : "Delete"}
                        </sl-button>
                    </div>
                {/each}
                <div>
                    <sl-button size="small" variant="primary" on:click={addSessionType}>+ Add Session Type</sl-button>
                </div>
            </div>
        </div>

        <div class="admin-section" style="flex-direction:column">
            <div class="admin-section-desc">
                <h3>Amenities</h3>
                <p>Amenities that can be required by sessions and offered by spaces. Stored as a bitmask by position; deletion is a soft hide and reordering only affects display.</p>
            </div>
            <div style="display:flex; flex-direction:column; gap: 8px; margin-top: 8px;">
                {#each sortedAmenityIndices($settings.amenities ?? []) as i (i)}
                    {@const am = $settings.amenities[i]}
                    <div class="type-row"
                        class:deleted-row={am.deleted}
                        class:drop-before={dropTargetAmenityIdx === i && dropPosition === "before"}
                        class:drop-after={dropTargetAmenityIdx === i && dropPosition === "after"}
                        class:dragging={draggedAmenityIdx === i}
                        draggable={!am.deleted}
                        on:dragstart={(e) => { draggedAmenityIdx = i; if (e.dataTransfer) e.dataTransfer.effectAllowed = "move" }}
                        on:dragover={(e) => {
                            if (am.deleted || draggedAmenityIdx === null) return
                            e.preventDefault()
                            if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
                            dropTargetAmenityIdx = i
                            dropPosition = computeDropPosition(e)
                        }}
                        on:dragleave={() => { if (dropTargetAmenityIdx === i) dropTargetAmenityIdx = null }}
                        on:drop={(e) => {
                            e.preventDefault()
                            if (draggedAmenityIdx !== null && !am.deleted)
                                reorderAmenity(draggedAmenityIdx, i, dropPosition)
                            draggedAmenityIdx = null
                            dropTargetAmenityIdx = null
                        }}
                        on:dragend={() => { draggedAmenityIdx = null; dropTargetAmenityIdx = null }}>
                        <div class="drag-handle" title="Drag to reorder"><SvgIcon icon="faGripVertical" size={14} color="#888" /></div>
                        <sl-input size="small" style="flex:2" value={am.name} disabled={am.deleted}
                            on:sl-change={(e) => updateAmenity(i, { name: e.target.value })}></sl-input>
                        <sl-button size="small" variant={am.deleted ? "default" : "danger"}
                            on:click={() => updateAmenity(i, { deleted: !am.deleted })}>
                            {am.deleted ? "Restore" : "Delete"}
                        </sl-button>
                    </div>
                {/each}
                <div>
                    <sl-button size="small" variant="primary" on:click={addAmenity}>+ Add Amenity</sl-button>
                </div>
            </div>
        </div>

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
              
        <div class="admin-section" style="flex-direction:column">
            <div style="flex-direction:row;display:flex; justify-content:space-between">
                <div class="admin-section-desc">
                    <h3>Active Network DNA Hash</h3>
                    <p style="font-size: 0.8rem">{activeDnaHashB64}</p>
                </div>
            </div>
        </div>

        {#if isTauriContext()}
        <div class="admin-section" style="flex-direction:column">
            <sl-details summary="Advanced Network Options">
                <p style="font-size:12px;color:#666;margin-top:0;">Configure bootstrap and relay servers. Changes require an app restart.</p>
                {#if networkConfigLoaded}
                    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px;">
                        <div>
                            <label style="font-weight:bold;font-size:14px;">Bootstrap URL:</label>
                            <sl-input
                                value={bootstrapUrl}
                                placeholder="https://..."
                                on:input={e => bootstrapUrl = e.target.value}
                            ></sl-input>
                        </div>
                        <div>
                            <label style="font-weight:bold;font-size:14px;">Relay URL:</label>
                            <sl-input
                                value={relayUrl}
                                placeholder="https://..."
                                on:input={e => relayUrl = e.target.value}
                            ></sl-input>
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <sl-button size="small" variant="primary"
                            disabled={bootstrapUrl.length === 0 || relayUrl.length === 0}
                            on:click={saveNetworkConfig}
                        >Save & Restart</sl-button>
                        <sl-button size="small" variant="text"
                            on:click={resetNetworkDefaults}
                        >Reset to Defaults</sl-button>
                    </div>
                {:else}
                    <div class="spinning" style="display:inline-block"><SvgIcon icon="faSpinner" color="black"></SvgIcon></div>
                {/if}
            </sl-details>
        </div>
        {/if}
        {/if}
    </div>
  

   
</div>
<TemplateSelector bind:this={templateSelector} on:apply-template={handleApplyTemplate} />
  <style>
    sl-checkbox {
        margin-right:15px;
        margin-left:15px;
    }

    .type-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #fafafa;
    }
    .type-row.deleted-row {
        opacity: 0.5;
        background: #f0f0f0;
    }
    .type-row sl-checkbox {
        margin-left: 0;
        margin-right: 0;
    }
    .type-row {
        position: relative;
    }
    .type-row.dragging {
        opacity: 0.4;
    }
    .type-row.drop-before::before,
    .type-row.drop-after::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: #2c7;
        pointer-events: none;
    }
    .type-row.drop-before::before { top: -5px; }
    .type-row.drop-after::after  { bottom: -5px; }

    .drag-handle {
        cursor: grab;
        user-select: none;
        display: flex;
        align-items: center;
        padding: 0 4px;
    }
    .info-icon {
        display: inline-flex;
        align-items: center;
        cursor: help;
        opacity: 0.7;
    }
    .info-icon:hover { opacity: 1; }

    :global(.settings-help-tooltip::part(body)) {
        border: 1px solid #d0d0d0;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    }
    .type-row[draggable="true"]:active .drag-handle {
        cursor: grabbing;
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