<script lang="ts">
  import { createEventDispatcher, onMount, getContext } from "svelte";
  import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import "@holochain-open-dev/profiles/dist/elements/search-agent.js";
  import { storeContext } from "../../contexts";
  import type { Snackbar } from "@material/mwc-snackbar";
  import "@material/mwc-snackbar";
  import Fa from "svelte-fa";
  import {
    faTrash,
    faEdit,
    faCircleArrowLeft,
  } from "@fortawesome/free-solid-svg-icons";
  import ProxyAgentCrud from "./ProxyAgentCrud.svelte";
  import type { EmergenceStore } from "../../stores/emergence-store";
  import Confirm from "./Confirm.svelte";
  import { encodeHashToBase64, type ActionHash, type AgentPubKey } from "@holochain/client";
  import { slide } from "svelte/transition";
  import SessionSummary from "./SessionSummary.svelte";
  import ProxyAgentAvatar from "./ProxyAgentAvatar.svelte";
  import { errorText } from "./utils";

  const dispatch = createEventDispatcher();

  export let proxyAgentHash: ActionHash;

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;

  let errorSnackbar: Snackbar;

  $: error, loading;
  $: proxyAgent = store.proxyAgentStore(proxyAgentHash);
  $: allSessions = store.sessions;
  $: uiProps = store.uiProps
  $: sessions = $allSessions.filter((s) =>
    s.record.entry.leaders.find(
      (l) =>
        encodeHashToBase64(l.hash) ==
        encodeHashToBase64($proxyAgent.original_hash)
    )
  );

  onMount(async () => {
    if (proxyAgent === undefined) {
      throw new Error(
        `The proxyAgent input is required for the ProxyAgentDetail element`
      );
    }
    loading = false;
  });

  async function assignProxyAgent() {
    await store.assignProxySessionsToAgent(proxyAgentHash, assignAgent)
  }

  async function deleteProxyAgent() {
    try {
      await store.deleteProxyAgent($proxyAgent.original_hash);
      //await store.updateProxyAgent(proxyAgent.original_hash, {trashed:true})
      dispatch("proxyagent-deleted", {
        proxyAgentHash: $proxyAgent.original_hash,
      });
    } catch (e: any) {
      errorSnackbar.labelText = `Error deleting the proxyAgent: ${errorText(
        e
      )}`;
      errorSnackbar.show();
    }
  }
  let confirmDeleteDialog;
  let confirmAssignDialog;
  let updateProxyAgentDialog;
  
  let assignAgent: AgentPubKey
</script>

<mwc-snackbar bind:this={errorSnackbar} leading />

{#if loading}
  <div
    style="display: flex; flex: 1; align-items: center; justify-content: center"
  >
    <sl-spinner />
  </div>
{:else if error}
  <span>Error fetching the proxyAgent: {error}</span>
{/if}

<ProxyAgentCrud
  bind:this={updateProxyAgentDialog}
  proxyAgent={$proxyAgent}
  on:proxyagent-updated={async () => {
    await store.fetchProxyAgents();
  }}
/>

<Confirm
  bind:this={confirmDeleteDialog}
  message="This will remove this proxy agent for everyone!"
  on:confirm-confirmed={deleteProxyAgent}
/>
<Confirm
  bind:this={confirmAssignDialog}
  message="Please confirm assigning sessions to agent"
  on:confirm-confirmed={assignProxyAgent}
/>

<div transition:slide={{ axis: "x", duration: 400 }} class="pane-content">
  <div class="pane-header">
    <div class="controls">
      <sl-button
        on:click={() => {
          dispatch("proxyagent-close");
        }}
        circle
      >
        <Fa icon={faCircleArrowLeft} />
      </sl-button>
      <div>
        <sl-button
          style="margin-left: 8px; "
          on:click={(e) => {
            e.stopPropagation();
            updateProxyAgentDialog.open($proxyAgent);
          }}
          circle
        >
          <Fa icon={faEdit} />
        </sl-button>
        <sl-button
          style="margin-left: 8px;"
          on:click={() => {
            confirmDeleteDialog.open();
          }}
          circle
        >
          <Fa icon={faTrash} />
        </sl-button>
      </div>
    </div>
  </div>
  <div class="card">
  <div class="details">
    <div style="display: flex; flex-direction: column;">
      <div style="display: flex; flex-direction: row; padding-bottom: 15px; align-items: center; justify-content: center;">
        <div class="pic">
          <ProxyAgentAvatar size={170} {proxyAgentHash} />
        </div>
        <div style="display: flex; flex-direction: column; margin-left:10px">
          <h1 style="font-size: 24px;">{$proxyAgent.record.entry.nickname}</h1>
          
          <span style="font-size: 12px; opacity: .7; text-transform: uppercase;"
          >{$proxyAgent.record.entry.location}</span
        >
          {#if $proxyAgent.record.entry.bio}
            <div
              style="display: flex; flex-direction: row; margin-bottom: 16px"
            >
              <span style="white-proxyAgent: pre-line"
                >{$proxyAgent.record.entry.bio}</span
              >
            </div>
          {/if}
          {#if $proxyAgent.record.entry.location}
            <div
              style="display: flex; flex-direction: row; margin-bottom: 16px"
            >
            </div>
          {/if}
        </div>
      </div>
      <div>
        {#if sessions}
          <div style="display: flex; flex-direction: column; margin-bottom: 16px">
            <div style="display: flex; flex-direction: column; width: 100%;">
              {#each Array.from(sessions ? sessions : []) as session}
                <SessionSummary {session} />
              {/each}
            </div>
          </div>
        {/if}
      </div>
      </div>
      {#if $uiProps.amSteward && sessions.length > 0}
      <search-agent 
        field-label="Assign Sessions To:" 
        include-myself={true}
        clear-on-select={true} 
        on:agent-selected={(e)=>{
          assignAgent = e.detail.agentPubKey
          confirmAssignDialog.open()
        }}>
      </search-agent>

      {/if}
    </div>
  </div>
</div>

<style>
  .pane-content {
    padding-top: 8px;
  }
  .details {
    width: 100%;
    padding: 15px;
  }

  .pane-header {
    padding-top: 0;
  }
  .pic {
    max-width: 300px;
  }
</style>
