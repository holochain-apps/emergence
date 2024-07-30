<script lang="ts">
  import { onMount } from "svelte";
  import { type OsType, type } from "@tauri-apps/plugin-os";
  import { isTauriContext } from "./utils";

  export let os: OsType | OsType[] = [];
  
  $: disabled = (Array.isArray(os) && os.includes(osType))
    || (typeof os === "string" && os === osType);

  let osType;
  onMount(async () => {
    if(isTauriContext()) {
      osType = await type();
    }
  });
</script>

{#if !disabled}
  <slot></slot>
{/if}