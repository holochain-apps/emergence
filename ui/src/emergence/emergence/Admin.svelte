<script lang="ts">
    import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
    import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import { getContext } from "svelte";
  import type { Info } from "./types";
  import { get } from "svelte/store";
  import { faFileExport, faFileImport } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";
  import sanitize from "sanitize-filename";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
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
  
    <div class="header">
        <div>
            <sl-button style="margin-left: 8px;" size=small on:click={doExport} circle>
                <Fa icon={faFileExport} />
            </sl-button>
            <sl-button style="margin-left: 8px;" size=small on:click={()=>fileinput.click()} circle>
                <Fa icon={faFileImport} />
            </sl-button>
        </div>
    </div>



  <style>
    .header{
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: solid 1px;
    }

  </style>