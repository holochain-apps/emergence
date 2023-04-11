<script lang="ts">
  import { encodeHashToBase64, type AgentPubKey } from "@holochain/client";
  import "@holochain-open-dev/profiles/elements/agent-avatar.js";


  export let agentPubKey: AgentPubKey
  export let size = "32"

  $:agentPubKey

</script>

<agent-avatar size={size} agent-pub-key="{encodeHashToBase64(agentPubKey)}"></agent-avatar>
