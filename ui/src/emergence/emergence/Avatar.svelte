<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { getContext } from "svelte";

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  export let agentPubKey: AgentPubKey
  export let size = 32

  $:agentPubKey

</script>

<agent-avatar size={size} agent-pub-key="{encodeHashToBase64(agentPubKey)}"></agent-avatar>
<!-- nickname: {JSON.stringify(store.profilesStore.profiles.get(agentPubKey))} -->