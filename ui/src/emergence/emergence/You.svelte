<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import Fa from 'svelte-fa'
    import { faEdit, faExchange, faFileExport, faFileImport } from '@fortawesome/free-solid-svg-icons';

    import { type EntryHash, type Record, type AgentPubKey, type ActionHash, type AppAgentClient, type NewEntryAction, encodeHashToBase64 } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import NoteDetail from './NoteDetail.svelte';
    import SessionSummary from './SessionSummary.svelte';
    import Avatar from './Avatar.svelte';
    import { get } from 'svelte/store';
    import sanitize from "sanitize-filename";
    import type { Info, TimeWindow } from './types';
    import { dirty_components } from 'svelte/internal';
    import TimeWindows from './TimeWindows.svelte';

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
  
    onMount(async () => {
        store.fetchMyStuff()
    });
    let tab = "notes"
    let editProfile = false

    $: myProfile = store.profilesStore.myProfile
    $: myNotes = store.myNotes
    $: mySessions = store.mySessions

    let exportJSON = ""

    const download = (filename: string, text: string) => {
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    const serializeInfo = (info:Info<any>) : any => {
        const obj = {
            original_hash: encodeHashToBase64(info.original_hash),
            entry: info.record.entry,
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

    const doExport = ()=> {
        exportJSON= JSON.stringify(
            {
                spaces:get(store.spaces).map(s=>{ 
                    const info = serializeInfo(s)

                    info.entry['picture'] = info.entry['picture'] ? encodeHashToBase64(info['picture']) : undefined
                    return info
                }),
                sessions:get(store.sessions).map(s=>{ 
                    const info = serializeInfo(s)
                    info.entry['leaders'] = info.entry['leaders'].map(l => encodeHashToBase64(l))

                    return info
                }),
                notes: get(store.notes).map(s=>{ 
                    const info = serializeInfo(s)

                    return info
                }),
                windows: get(store.timeWindows)
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
    const doImport = async (data: any) => {
        for (const s of data.spaces) {
            const e = s.entry
            await store.createSpace(e.name,e.description,[],e.capacity, e.amenities, undefined)
        }
        for (const s of data.windows) {
            await store.createTimeWindow(new Date(s.start), s.duration)
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

{#if $myProfile.status === "complete"  && $myProfile.value}
    <div class="header"><h3><Avatar agentPubKey={store.myPubKey}></Avatar></h3>
        <sl-button style="margin-left: 8px;" size=small on:click={() => editProfile=true} circle>
            <Fa icon={faEdit} />
        </sl-button>
        <div>
            <sl-button style="margin-left: 8px;" size=small on:click={doExport} circle>
                <Fa icon={faFileExport} />
            </sl-button>
            <sl-button style="margin-left: 8px;" size=small on:click={()=>fileinput.click()} circle>
                <Fa icon={faFileImport} />
            </sl-button>
        </div>
    </div>
    {#if editProfile}
        <p><b>Emergence</b> is a decentralized hApp for discovery, scheduling, connecting and remembering </p>
        <update-profile on:cancel-edit-profile={()=>editProfile = false} on:profile-updated={()=>editProfile = false}></update-profile>
    {:else}
    {exportJSON}
    <sl-tab-group>
        <sl-tab slot="nav" panel="notes">Notes
        </sl-tab>
        <sl-tab slot="nav" panel="sessions">Sessions
        </sl-tab>
        <sl-tab slot="nav" panel="updates">Updates</sl-tab>
    
        <sl-tab-panel name="notes">
            {#each $myNotes as note}
            <NoteDetail noteHash={note}></NoteDetail>
            {/each}
            
        </sl-tab-panel>
        <sl-tab-panel name="sessions">

            {#each Array.from($mySessions.keys()) as session}
            <SessionSummary session={store.getSession(session)}></SessionSummary>
            {/each}


        </sl-tab-panel>
        <sl-tab-panel name="updates">
            TBD

        </sl-tab-panel>
    </sl-tab-group>
    {/if}
{:else}
    <sl-spinner></sl-spinner>
{/if}
<style>
    .header{
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: solid 1px;
    }
</style>