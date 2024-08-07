<script lang="ts">
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../stores/emergence-store';
  import { getContext } from "svelte";
  import { DetailsType, type AnyAgent } from "./types";
  import Avatar from './Avatar.svelte';
  import ProxyAgentAvatar from "./ProxyAgentAvatar.svelte";

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let agent: AnyAgent
  export let size = 32
  export let namePosition = "row"
  export let showAvatar = true
  export let showNickname = true

  $: proxyAgent = agent.type=="Agent" ? undefined : store.getProxyAgent(agent.hash)
</script>
{#if agent.type=="Agent"}
    <Avatar size={size} namePosition={namePosition} showAvatar={showAvatar} showNickname={showNickname} agentPubKey={agent.hash}></Avatar>
{:else if agent.type=="ProxyAgent"}
    <div class="avatar-{namePosition} clickable"
        on:click={(e)=>{
            store.openDetails(DetailsType.ProxyAgent, agent.hash)
            e.stopPropagation()
        }}
        >
        {#if showAvatar}
            {#if proxyAgent}
                <span style="margin-right:5px"><ProxyAgentAvatar size={size} proxyAgentHash={proxyAgent.original_hash}></ProxyAgentAvatar></span>
            {:else}
                <span style="color:red" title="Proxy Agent Missing">(?)</span>
            {/if}
        {/if}
        {#if showNickname}
            <div class="nickname">{proxyAgent ? proxyAgent.record.entry.nickname : "unknown"}</div>
        {/if}
    </div>
{:else}
    <span style="color:red" title="Unknown agent type">(?)</span>
{/if}

<style>
    .avatar-column {
        display:flex;
        flex-direction: column;
    }
    .avatar-row {
        display:inline-flex;
        flex-direction: row;
        justify-content:center;
        position: relative;
        align-items: center;
    }
    .avatar-row show-image {
        margin-right: 0.5em;  
        border-radius: 50%;     
    }
    .avatar-row holo-identicon {
        margin-right: 0.5em;  
        border-radius: 50%;     
    }
</style>