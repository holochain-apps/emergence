<script lang="ts">
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import { type CellInfoNormalized } from "../../stores/clone-manager-store";
  import { encodeDnaJoiningInfo } from "./dnaJoiningInfo";
  import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
  import SvgIcon from "./SvgIcon.svelte";
  import QRCode from "qrcode";

  let dialog: SlDialog;
  export let cell: CellInfoNormalized | undefined;
  export let name: string | undefined = undefined;
  export const open = ()=> {
    dialog.show()
  }

  $: cellName = name ? name : cell?.displayName;
  $: joiningCode = cell ? encodeDnaJoiningInfo(cell.originalDnaHash, cellName, cell.networkSeed) : "";

  // The QR code holds exactly the joining code text, so scanning it in the
  // phone app is equivalent to pasting the code.
  let qrDataUrl = "";
  $: if (joiningCode) {
    QRCode.toDataURL(joiningCode, { width: 256, margin: 1 })
      .then((url) => (qrDataUrl = url))
      .catch((e) => console.error("Could not generate QR code", e));
  } else {
    qrDataUrl = "";
  }

  const copyJoiningCode = () => {
    navigator.clipboard.writeText(joiningCode);
    dialog.hide();
  };
</script>

<sl-dialog label="Share Network" bind:this={dialog} width={1000}>
  <div>
    <p>Share this code with a friend to grant them access to the Network <b>{cellName}</b></p>
    {#if qrDataUrl}
      <div style="display: flex; justify-content: center; margin-top: 10px;">
        <img src={qrDataUrl} alt="QR code of the joining code" style="width: 256px; height: 256px;" />
      </div>
    {/if}
    <sl-textarea rows="2" style="margin-top: 10px;" value={joiningCode}></sl-textarea>
    <div style="display: flex; justify-content: flex-end; align-items: center">
      {#if navigator.clipboard !== undefined}
        <sl-button style="margin-top: 10px;" on:keydown={copyJoiningCode} on:click={copyJoiningCode}>
          <div style="display: flex; justify-content: flex-start; align-items: center;">
            <SvgIcon icon="faClone" size="16px"/>
            <div style="margin-left: 10px;">Copy Joining Code</div>
          </div>
        </sl-button>
      {/if}
    </div>
  </div>
</sl-dialog>
