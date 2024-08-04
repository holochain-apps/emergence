<script lang="ts">
  import { isWeContext } from "@lightningrodlabs/we-applet";
  import { getContext } from "svelte";
  import { CloneManagerStore } from "../../stores/clone-manager-store";
    import CloneManagerShareDialog from "./CloneManagerShareDialog.svelte";
    import CloneManagerDialog from "./CloneManagerDialog.svelte";
    import SvgIcon from "./SvgIcon.svelte";
  
  const { getStore }: any = getContext('cloneManagerStore');
  let cloneManagerStore: CloneManagerStore = getStore();
  let weaveGroupName;
  let cloneManagerDialog;
  let cloneManagerShareDialog;

  $: activeCellInfoNormalized = cloneManagerStore.activeCellInfoNormalized;

  const loadWeaveGroupName = async () => {
    if(!cloneManagerStore.weaveClient) return;

    const appletInfo = await cloneManagerStore.weaveClient.appletInfo(cloneManagerStore.weaveClient.renderInfo.appletHash);
    const groupProfile = await cloneManagerStore.weaveClient.groupProfile(appletInfo.groupsHashes[0]);
    weaveGroupName = groupProfile.name;
  };

  loadWeaveGroupName();
</script>

{#if isWeContext()}
  <div
    on:keypress={()=>{cloneManagerShareDialog.open()}}
    on:click={()=>cloneManagerShareDialog.open()} 
    style="cursor: pointer; background-color:  #164B9A; padding: 3px 5px; border-radius: 10px;">
      <div style="display: flex; justify-content: flex-start; align-items: center">
          <div style="margin-right: 10px; font-weight: bold; color: #fff">
            {weaveGroupName}
          </div>
          <SvgIcon icon="network" size="20px" color="#fff"/>
      </div>
  </div>
{:else}
  <div
    on:keypress={()=>{cloneManagerDialog.open()}}
    on:click={()=>cloneManagerDialog.open()} 
    style="cursor: pointer; background-color: #164B9A; padding: 3px 5px; border-radius: 10px;">
      <div style="display: flex; justify-content: flex-start; align-items: center">
          <div style="margin-right: 10px; font-weight: bold; color: #fff">
            {$activeCellInfoNormalized.displayName}
          </div>
          <SvgIcon icon="network" size="20px" color="#fff"/>
      </div>
  </div>
{/if}

{#if isWeContext()}
  <CloneManagerShareDialog bind:this={cloneManagerShareDialog} cell={$activeCellInfoNormalized} name={weaveGroupName} />
{:else}
  <CloneManagerDialog bind:this={cloneManagerDialog} />
{/if}