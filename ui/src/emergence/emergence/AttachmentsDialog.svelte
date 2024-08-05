<script lang="ts">
  import { type WAL, isWeContext, weaveUrlFromWal } from "@lightningrodlabs/we-applet";
  import { createEventDispatcher, getContext } from "svelte";
  import type { WALUrl} from "./utils";
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import AttachmentsList from "./AttachmentsList.svelte";
  import SvgIcon from "./SvgIcon.svelte";
  import { frameContext, storeContext } from '../../contexts';
  import type { WeaveClient } from '@lightningrodlabs/we-applet';
  import type { EmergenceStore } from "../../emergence-store";
  import { sessionLinks, type InfoSession } from "./types";

  const { getFrame } :any = getContext(frameContext);
  let frameClient: WeaveClient = getFrame();
  const { getStore } :any = getContext(storeContext);
  let store: EmergenceStore = getStore();

  let session: InfoSession | undefined
  let attachments: Array<WALUrl> = []
  const dispatch = createEventDispatcher();

  $:attachments = attachments

  export const close=()=>{dialog.hide()}
  export const open= async (s: InfoSession)=>{
    session = s
    if (session) {
      attachments = sessionLinks(session)
      dialog.show()
    }
  }
  let dialog

  function removeAttachment(index: number) {
    attachments.splice(index, 1);
    attachments = attachments
    handleSave()
  }

  const addAttachment = async () => {
    const hrl = await frameClient.userSelectWal()
    if (hrl) {
      _addAttachment(hrl)
    }
  }

  const _addAttachment = (wal: WAL) => {
    attachments.push(weaveUrlFromWal(wal))
    attachments = attachments
    handleSave()
  }

  const handleSave = async () => {
    if (session) {
      dispatch('save-links',attachments)
    }
  }
</script>

<sl-dialog label={session? "Session Links":"FIXME"} bind:this={dialog}>
  {#if isWeContext()}
  <AttachmentsList attachments={attachments}
      on:remove-attachment={(e)=>removeAttachment(e.detail)}/>

  <div style="">
      <h3>Search Linkables:</h3> 
      <sl-button style="margin-top:5px;margin-right: 5px" circle on:click={()=>addAttachment()} >
        <SvgIcon icon=searchPlus size=30 />
  </sl-button>
  </div> 
  {/if}
</sl-dialog>

<style>


  sl-dialog::part(panel) {
      background: #FFFFFF;
      border: 2px solid rgb(166 115 55 / 26%);
      border-bottom: 2px solid rgb(84 54 19 / 50%);
      border-top: 2px solid rgb(166 115 55 / 5%);
      box-shadow: 0px 15px 40px rgb(130 107 58 / 35%);
      border-radius: 10px;
  }
</style>