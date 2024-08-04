<script lang="ts">
  import { createEventDispatcher, onMount, getContext } from "svelte";
  import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import { storeContext } from "../../contexts";
  import type {
     PersonData,
  } from "./types";
  import type { Snackbar } from "@material/mwc-snackbar";
  import "@material/mwc-snackbar";
  import type { EmergenceStore } from "../../stores/emergence-store";
  import { encodeHashToBase64 } from "@holochain/client";
  import Fa from "svelte-fa";
  import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
  import SessionLink from "./SessionLink.svelte";

  const dispatch = createEventDispatcher();

  export let person: PersonData;

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let loading = true;
  let error: any = undefined;

  let errorSnackbar: Snackbar;

  $: error, loading, person;
  $: allSessions = store.sessions;
  $: agentSessions = store.agentSessions
  $: hostedSessions =  $allSessions.filter( (s) => s.record.entry.leaders.find((l) => encodeHashToBase64(l.hash) == encodeHashToBase64(person.hash)) )

  onMount(async () => {
    if (person === undefined) {
      throw new Error(
        `The person input is required for the PersonSummary element`
      );
    }
    loading = false;
  });
</script>

<mwc-snackbar bind:this={errorSnackbar} leading />

{#if loading}
  <div
    style="display: flex; flex: 1; align-items: center; justify-content: center"
  >
    <sl-spinner />
  </div>
{:else if error}
  <span>Error: {error}</span>
{:else}
  <div
    class="person card clickable"
    on:click={(e) => {
      dispatch('person-selected')
      e.stopPropagation();
    }}
  >
    <div class="details">
      {#if person.type == "ProxyAgent"}
        <div style="margin-right:10px">
          {#if person.avatarImage}
            <show-image
              style={`width:50px`}
              image-hash={encodeHashToBase64(person.avatarImage)}
            />
          {:else}
            <holo-identicon
              disable-tooltip={true}
              disable-copy={true}
              size={50}
              hash={person.hash}
            />
          {/if}
        </div>
      {:else}
        <agent-avatar
          disable-tooltip={true}
          disable-copy={true}
          size={50}
          agent-pub-key={encodeHashToBase64(person.hash)}
        />

        <div class="info">
          <div class="name">{person.nickname}</div>
          <div class="location">
            {#if location}<span>{person.location}</span>{/if}
          </div>
        </div>
      {/if}
      {#if person.type == "ProxyAgent"}
        <sl-tooltip>
          <div slot="content" style="color:white">
            This person is a proxy agent, i.e. they don't have an account on the
            system and were added by administrators, likely because they are a
            session leader.
          </div>
          <span
            style="display:flex; align-items:center; font-weight:bold"
            title="Proxy agent"
            >{person.nickname}
            <Fa style="margin-left:5px" icon={faInfoCircle} /></span
          >
        </sl-tooltip>
      {/if}
    </div>
    <div
      style="display:flex;flex-direction:row;align-items: left; justify-content: center; align-items: center;margin-left:20px;"
    >
      <!-- {#if type== "ProxyAgent"} -->
      {#if hostedSessions.length > 0}
        <span style="font-weight:strong">Hosting</span>
        <div style="margin-left:5px"><SessionLink sessionHash={hostedSessions[0].original_hash}></SessionLink></div>
        {#if hostedSessions.length > 1}
          and {hostedSessions.length - 1} other{#if hostedSessions.length>2}s{/if}
        {/if}
      {/if}

      <!-- {:else}
            {#each $agentSessions.get(hash) ? Array.from($agentSessions.get(hash)):  [] as [session, interest] }
              {#if !store.getSession(session)} &lt;unknown Session&gt;
              {:else}
                <div style="margin-left:5px">{sessionInterestToString(interest)}: { store.getSession(session).record.entry.title}, </div>
              {/if}
            {/each}
          {/if} -->
    </div>
  </div>
{/if}

<style>
  .person {
    margin-bottom: 8px;
    padding: 10px;
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .details {
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .people {
    width: 100%;
  }

  .name {
    font-size: 16px;
    font-weight: bold;
  }

  .location {
    font-size: 12px;
    font-weight: normal;
    opacity: 0.5;
  }

  .info {
    display: flex;
    flex-direction: column;
    padding-left: 10px;
    justify-content: left;
    text-align: left;
  }
</style>
