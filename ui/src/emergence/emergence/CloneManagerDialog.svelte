<script lang="ts">
  import { getContext } from "svelte";
  import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import SvgIcon from "./SvgIcon.svelte";
  import { type CellInfoNormalized, CloneManagerStore } from "../../stores/clone-manager-store";
  import { CellType, type CellId } from "@holochain/client";
  import { hashEqual } from "./utils";
  import { type DnaJoiningInfo } from "./dnaJoiningInfo";
  import { get } from "svelte/store";
  import CloneManagerCreateDialog from "./CloneManagerCreateDialog.svelte";
  import CloneManagerShareDialog from "./CloneManagerShareDialog.svelte";
  import CloneManagerJoinDialog from "./CloneManagerJoinDialog.svelte";
  
  let dialog;
  let newCloneDialog;
  let shareCloneDialog;
  let joinCloneDialog;
  let shareInstance: CellInfoNormalized | undefined;
  export const open = () => { dialog.show() };
  
  let instances: CellInfoNormalized[];
  let loading = true;
  let error;
  
  const { getStore }: any = getContext('cloneManagerStore');
  let cloneManagerStore: CloneManagerStore = getStore();
  
  async function listInstances() {
    loading = true;
    try {
      instances = await cloneManagerStore.list();
    } catch(e) {
      error = e;
    }
    loading = false;
  }
  
  const activate = (cellId: CellId) => cloneManagerStore.activate(cellId);
  const disable = async (cellId: CellId) => {
    await cloneManagerStore.disable(cellId);
    listInstances();
  };
  const enable = async (cellId: CellId) => {
    await cloneManagerStore.enable(cellId);
    listInstances();
  };
  const create = async (name: string) => {
    await cloneManagerStore.create(name);
    listInstances();
  };
  const share = (instance: CellInfoNormalized) => {
    shareInstance = instance;
    shareCloneDialog.open();
  };
  const join = async (joiningCode: DnaJoiningInfo) => {
    await cloneManagerStore.join(joiningCode.name, joiningCode.networkSeed);
    listInstances();
  };
  const isInstanceActive = (instance: CellInfoNormalized) => hashEqual(get(cloneManagerStore.activeDnaHash), instance.cellId[0]);
  
  listInstances();
</script>

<sl-dialog label="Networks" bind:this={dialog} width={1000} >
  <div style="display:flex;flex-direction:column">
    {#if loading}
    <div class="spinning" style="display:inline-block"> <SvgIcon icon=faSpinner  color="black"></SvgIcon></div>
    {:else if instances && instances.length > 0}
    {#each instances as instance}
    <div style="display: flex; justify-content: space-between; align-items: center;" class={isInstanceActive(instance) ? "instance-active" : "instance-inactive"}>
      <div class={isInstanceActive(instance) ? "instance-active-name" : ""}>
        {instance.displayName}
      </div>
      <div class="button-container">
        {#if isInstanceActive(instance)}
        <div style="width: 30px; height: 30px; margin-left: 10px"></div>
        {:else if instance.cellInfo[CellType.Cloned]?.enabled ||  instance.cellInfo[CellType.Provisioned]}
        <div class="details-button" title="Switch to this Network" on:click={activate(instance.cellId)}>
          <SvgIcon icon="faToggleOff" size="16px"/>
        </div>
        {/if}
        
        <div class="details-button" title="Share Joining Code" on:click={share(instance)}>
          <SvgIcon icon="faShare" size="16px"/>
        </div>
        
        {#if !isInstanceActive(instance) && instance.cellInfo[CellType.Cloned]?.enabled}
        <div class="details-button" title="Disable Network" on:click={disable(instance.cellId)}>
          <SvgIcon icon="faStopCircle" size="16px"/>
        </div>
        {:else if instance.cellInfo[CellType.Cloned]?.enabled === false}
        <div class="details-button" title="Enable Network" on:click={enable(instance.cellId)}>
          <SvgIcon icon="faPlayCircle" size="16px"/>
        </div>
        {:else}
        <div style="width: 30px; height: 30px; margin-left: 10px;"></div>
        {/if}
      </div>
    </div>
    {/each}          
    
    <div style="margin-top: 20px; width: 100%; display: flex; justify-content: space-between; align-items: center;">
      <div class="new-clone" on:click={()=>newCloneDialog.open()} on:keydown={()=>newCloneDialog.open()} title="New Network"><SvgIcon color="white" size="25px" icon="faSquarePlus" style="margin-left: 15px;"/><span>New Network</span></div>
      <div class="new-clone" on:click={()=>joinCloneDialog.open()} on:keydown={()=>joinCloneDialog.open()} title="Join Network"><SvgIcon color="white" size="25px" icon="personMail" style="margin-left: 15px;"/><span>Join Network</span></div>
    </div>
    {:else if error}
    Error: {error}
    {/if}
  </div>
  
</sl-dialog>

<CloneManagerCreateDialog bind:this={newCloneDialog} handleSave={create} />
<CloneManagerShareDialog bind:this={shareCloneDialog} cell={shareInstance} on:close={() => {shareInstance = undefined;}} />
<CloneManagerJoinDialog bind:this={joinCloneDialog} handleJoin={join} />
  
  <style>
    .new-clone {
      box-sizing: border-box;
      height: 50px;
      background: rgba(24, 55, 122, 1.0);
      border: 1px solid #4A559D;
      color: #fff;
      display: flex;
      align-items: center;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      transition: all .25s ease;
      top: 3px;
      padding: 15px 0;
      box-shadow: 0px 4px 8px rgba(35, 32, 74, 0);
    }
    
    .new-clone:hover {
      cursor: pointer;
      padding: 15px 5px;
      border: 1px solid #252d5d;
      background: rgb(10, 25, 57);
      margin: 0 -5px 0 -5px;
      box-shadow: 0px 4px 15px rgba(35, 32, 74, 0.8);
    }
    
    .new-clone span {
      color: #fff;
      display: block;
      padding: 0 15px;
    }
    
    .instance-active {
      background-color: #164B9A;
      border-radius: 5px;
      padding: 4px 8px;
      font-weight: bold;
    }
    
    .instance-inactive {
      border-radius: 5px;
      padding: 4px 8px;
      font-weight: bold;
    }
    
    .instance-active-name {
      color: #fff;
    }
    
    .button-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .details-button {
      cursor: pointer;
      border-radius: 50%;
      padding:2px;
      width: 30px;
      height: 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      transform: scale(1);
      transition: all .25s ease;
      opacity: 0.7;
      
      margin-left: 10px;
      background: #FFFFFF;
      border: 1px solid rgba(35, 32, 74, 0.1);
      box-shadow: 0px 4px 4px rgba(66, 66, 66, 0.1);
      border-radius: 5px;
    }
    
    .details-button:hover {
      transform: scale(1.25);
      background-color: rgb(240, 249, 2244);
      border: solid 1px rgb(149, 219, 252);
      color: rgb(3, 105, 161);
      
    }
    
    .details-button:active {
      transform: scale(1.1);
      box-shadow: 0px 8px 10px rgba(53, 39, 211, 0.35);
    }
  </style>