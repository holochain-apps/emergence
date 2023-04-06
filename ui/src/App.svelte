<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type { ActionHash, AppAgentClient } from '@holochain/client';
  import { AppAgentWebsocket } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import AllSessions from './emergence/emergence/AllSessions.svelte';
  import AllSpaces from './emergence/emergence/AllSpaces.svelte';
  import CreateSession from './emergence/emergence/CreateSession.svelte';
  import CreateSpace from './emergence/emergence/CreateSpace.svelte';
  import { ProfilesStore, ProfilesClient } from "@holochain-open-dev/profiles";
  import '@shoelace-style/shoelace/dist/themes/light.css';

  import "@holochain-open-dev/profiles/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/elements/my-profile.js";

  import { clientContext } from './contexts';

  let client: AppAgentClient | undefined;
  let loading = true;
  let pane = "sessions"
  let profilesStore: ProfilesStore | undefined

  $: client, loading;

  onMount(async () => {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    client = await AppAgentWebsocket.connect('', 'emergence');
    profilesStore = new ProfilesStore(new ProfilesClient(client, 'emergence'), {
      avatarMode: "avatar-optional",
    });
    loading = false;
  });

  setContext(clientContext, {
    getClient: () => client,
  });
</script>

<main>
  {#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
      <sl-spinner
 />
    </div>
  {:else}
  <profiles-context store="{profilesStore}">
    <profile-prompt>

    <div id="content" style="display: flex; flex-direction: column; flex: 1;">
      {#if pane=="sessions"}
      <div class="pane">
        <h3>Sessions List</h3>
        <AllSessions></AllSessions>
        <div style="width:300px; border:solid 1px;padding:20px"><CreateSession></CreateSession></div>
      </div>
      {/if}
      {#if pane=="spaces"}
      <div class="pane">
        <h3>Spaces List</h3>
        <AllSpaces></AllSpaces>
        <div style="width:300px; border:solid 1px;padding:20px"><CreateSpace></CreateSpace></div>
      </div>
      {/if}
      {#if pane=="you"}
      <div class="pane">
        <h3>You</h3>
        <my-profile></my-profile>
      </div>
      {/if}


      <div class="nav">
        <div class="nav-button {pane=="spaces"?"selected":""}"
        on:keypress={()=>{pane='spaces'}}
        on:click={()=>{pane='spaces'}}
        >
          Spaces
        </div>
        <div class="nav-button {pane=="sessions"?"selected":""}"
          on:keypress={()=>{pane='sessions'}}
          on:click={()=>{pane='sessions'}}
        >
          Sessions
        </div>
        <div class="nav-button {pane=="you"?"selected":""}"
          on:keypress={()=>{pane='you'}}
          on:click={()=>{pane='you'}}
        >
          You
        </div>
      </div>
    </div>
    </profile-prompt>
  </profiles-context>
  {/if}
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }
  .nav {
    display: flex; flex-direction: row; flex: 1;
  }
  .nav-button {
    height: 50px;
    padding: 5px;
    margin: 5px;
    background-color: gray;
    color: white;
  }
  .selected {
    background-color:green;
  }
  .pane {
    width: 600px;
    border: solid 1px;
    padding: 10px;
    margin: 10px;
  }
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
