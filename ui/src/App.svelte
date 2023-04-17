<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AdminWebsocket, type ActionHash, type AppAgentClient } from '@holochain/client';
  import { AppAgentWebsocket } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import TimeWindows from './emergence/emergence/TimeWindows.svelte';
  import AllSessions from './emergence/emergence/AllSessions.svelte';
  import AllSpaces from './emergence/emergence/AllSpaces.svelte';
  import SessionCrud from './emergence/emergence/SessionCrud.svelte';
  import SpaceCrud from './emergence/emergence/SpaceCrud.svelte';
  import { ProfilesStore, ProfilesClient } from "@holochain-open-dev/profiles";
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import Fa from 'svelte-fa'
  import { faMap, faTicket, faUser, faGear, faRss, faCalendar, faPlus } from '@fortawesome/free-solid-svg-icons';

  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/my-profile.js";
  import "@holochain-open-dev/profiles/dist/elements/list-profiles.js";
  import "@holochain-open-dev/file-storage/dist/elements/file-storage-context.js";
  import { FileStorageClient } from "@holochain-open-dev/file-storage";

  import { clientContext, storeContext } from './contexts';
  import CreateTimeWindow from './emergence/emergence/CreateTimeWindow.svelte';
  import { EmergenceStore } from './emergence-store';
  import { EmergenceClient } from './emergence-client';
  import Feed from './emergence/emergence/Feed.svelte';
  import Schedule from './emergence/emergence/Schedule.svelte';
  import SessionDetail from './emergence/emergence/SessionDetail.svelte';
  import type { Info, Session } from './emergence/emergence/types';
  import You from './emergence/emergence/You.svelte'

  let client: AppAgentClient | undefined;
  let store: EmergenceStore | undefined;
  let fileStorageClient: FileStorageClient | undefined;
  let loading = true;
  let pane = "sessions"
  let profilesStore: ProfilesStore | undefined
  let creatingSpace = false
  let creatingSession = false
  let selectedSession: Info<Session>|undefined = undefined

  $: client, fileStorageClient, store, loading, creatingSession, creatingSpace;
  $: prof = profilesStore ? profilesStore.myProfile : undefined

  onMount(async () => {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    const adminPort : string = import.meta.env.VITE_ADMIN_PORT
    const appPort : string = import.meta.env.VITE_APP_PORT

    client = await AppAgentWebsocket.connect(`ws://localhost:${appPort}`, 'emergence');
    if (adminPort) {
      const adminWebsocket = await AdminWebsocket.connect(`ws://localhost:${adminPort}`)
      const x = await adminWebsocket.listApps({})
      const cellIds = await adminWebsocket.listCellIds()
      await adminWebsocket.authorizeSigningCredentials(cellIds[0])
    }

    profilesStore = new ProfilesStore(new ProfilesClient(client, 'emergence'), {
      avatarMode: "avatar-optional",
    });

    fileStorageClient = new FileStorageClient(client, 'emergence');

    store = new EmergenceStore(new EmergenceClient(client,'emergence'), profilesStore, client.myPubKey)
    loading = false;
  });

  setContext(storeContext, {
    getStore: () => store,
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
    {#if $prof && ($prof.status!=="complete" || $prof.value===undefined)}
    <h1>Hello.</h1>
    <p><b>Emergence</b> is a decentralized hApp for discovery, scheduling, connecting and remembering </p>
    <p>Harness the power of the decentralized web technology for local, ofline collaboration.</p>
    <p> Continue with a nickname and optional avatar, both of which can be changed later.</p>
    {/if}

    <profile-prompt>
      <file-storage-context client={fileStorageClient}>
    <div id="content" style="display: flex; flex-direction: column; flex: 1;">
      {#if pane=="sessions"}
      <div class="pane">
        <AllSessions on:session-selected={(event)=>{pane="sessions.detail"; selectedSession = event.detail}}></AllSessions>
        Create Session:
        <sl-button on:click={() => {creatingSession = true; } } circle>
          <Fa icon={faPlus} />
        </sl-button>

        {#if creatingSession}
          <div class="modal"><SessionCrud
            on:session-created={() => {creatingSession = false;} }
            on:edit-canceled={() => { creatingSession = false; } }
            ></SessionCrud></div>
        #{/if}
      </div>
      {/if}

      {#if pane==="sessions.detail"}
        <div class="pane">
          <SessionDetail 
          on:session-deleted={()=>pane= "sessions"}
          on:session-close={()=>pane= "sessions"}
          sessionHash={selectedSession.original_hash}></SessionDetail>
        </div>
      {/if}

      {#if pane=="spaces"}
      <div class="pane">
        <AllSpaces></AllSpaces>
        Create Space:
        <sl-button on:click={() => {creatingSpace = true; } } circle>
          <Fa icon={faPlus} />
        </sl-button>
    
        {#if creatingSpace}
          <div class="modal"><SpaceCrud
            on:space-created={() => {creatingSpace = false;} }
            on:edit-canceled={() => { creatingSpace = false; } }
            ></SpaceCrud></div>
        {/if}
      </div>
      {/if}

      {#if pane=="you"}
      <div class="pane">
        <You></You>
      </div>
      {/if}
      {#if pane=="admin"}
      <div class="pane">
        <h3>TimeWindows</h3>
        <TimeWindows></TimeWindows>
        <CreateTimeWindow></CreateTimeWindow>
      </div>
      {/if}
      {#if pane=="feed"}
      <div class="pane">
        <Feed></Feed>
      </div>
      {/if}

      {#if pane=="schedule"}
      <div class="pane">
        <Schedule></Schedule>
      </div>
      {/if}

      <div class="nav">
        <div class="nav-button {pane === "feed" ? "selected":""}"
          title="Activity"
          on:keypress={()=>{pane='feed'}}
          on:click={()=>{pane='feed'}}
        >
           <Fa icon={faRss} size="2x"/>
        </div>
        <div class="nav-button {pane.startsWith("sessions")?"selected":""}"
          title="Sessions"
          on:keypress={()=>{pane='sessions'}}
          on:click={()=>{pane='sessions'}}
        >
          <Fa icon={faTicket} size="2x"/>
        </div>
        <div class="nav-button {pane=="schedule"?"selected":""}"
          title="Schedule"
          on:keypress={()=>{pane='schedule'}}
          on:click={()=>{pane='schedule'}}
        >
          <Fa icon={faCalendar} size="2x"/>

        </div>


        <div class="nav-button {pane=="spaces"?"selected":""}"
          title="Spaces"
          on:keypress={()=>{pane='spaces'}}
          on:click={()=>{pane='spaces'}}
        >
          <Fa icon={faMap} size="2x"/>
        </div>
        <div class="nav-button {pane=="you"?"selected":""}"
          title="You"
          on:keypress={()=>{pane='you'}}
          on:click={()=>{pane='you'}}
        >
           <Fa icon={faUser} size="2x"/>
        </div>
        <!-- <div class="nav-button {pane=="admin"?"selected":""}"
          title="Admin"
          on:keypress={()=>{pane='admin'}}
          on:click={()=>{pane='admin'}}
        >
           <Fa icon={faGear} size="2x"/>
        </div> -->
      </div>
    </div>
    </file-storage-context>
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
  .pane {
    position: relative;
  }
  :global(.modal) {
    background-color: white;
    padding: 10px;
    position: absolute;
    top: 5px;

    border: solid 1px;
    display: flex; flex-direction: column
  }
  :global(.pane-contents) {
    display: flex; flex-direction: column;
  }
  :global(.pane-header){
    display: flex; flex-direction: row; justify-content:space-around; align-items: center;
  }


  .nav {
    display: flex; flex-direction: row; flex: 1;
  }
  .nav-button {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 50px;
    padding: 5px;
    margin: 5px;
    background-color: lightgray;
    color:white
  }
  .selected {
    background-color:gray;
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
