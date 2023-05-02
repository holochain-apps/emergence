<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext } from "svelte";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();
  let profilesStore: ProfilesStore = store.profilesStore

  export let agentPubKey: AgentPubKey
  export let size = 32
  export let namePosition = "row"
  export let showAvatar = true
  export let showNickname = true

  $: agentPubKey
  $: s = store.profilesStore.profiles.get(agentPubKey)
  $: nickname = $s.status == "complete" ? $s.value?.nickname : "..."
</script>

<div class="avatar-{namePosition}">
    {#if showAvatar}
        <agent-avatar size={size} agent-pub-key="{encodeHashToBase64(agentPubKey)}"></agent-avatar>
    {/if}
    {#if showNickname}
        <div class="nickname">{nickname}</div>
    {/if}
</div>

<style>
    .avatar-column {
        display:flex;
        flex-direction: column;
    }
    .avatar-row {
        display:flex;
        flex-direction: row;
    }
    .avatar-row agent-avatar{
        margin-right: 0.5em;
    }
    .nickname {
    }
</style>