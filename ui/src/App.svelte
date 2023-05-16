<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AdminWebsocket, type AppAgentClient } from '@holochain/client';
  import { AppAgentWebsocket } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import AllSessions from './emergence/emergence/AllSessions.svelte';
  import AllSpaces from './emergence/emergence/AllSpaces.svelte';
  import SessionCrud from './emergence/emergence/SessionCrud.svelte';
  import SiteMapCrud from './emergence/emergence/SiteMapCrud.svelte';
  import SpaceCrud from './emergence/emergence/SpaceCrud.svelte';
  import { ProfilesStore, ProfilesClient } from "@holochain-open-dev/profiles";
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import Fa from 'svelte-fa'
  import { faMap, faTicket, faUser, faGear, faCalendar, faPlus, faHome } from '@fortawesome/free-solid-svg-icons';

  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/my-profile.js";
  import "@holochain-open-dev/profiles/dist/elements/list-profiles.js";
  import "@holochain-open-dev/file-storage/dist/elements/file-storage-context.js";
  import { FileStorageClient } from "@holochain-open-dev/file-storage";

  import { clientContext, storeContext } from './contexts';
  import { EmergenceStore } from './emergence-store';
  import { EmergenceClient } from './emergence-client';
  import ScheduleSlotting from './emergence/emergence/ScheduleSlotting.svelte';
  import ScheduleUpcoming from './emergence/emergence/ScheduleUpcoming.svelte';
  import SessionDetail from './emergence/emergence/SessionDetail.svelte';
  import type { Info, Session } from './emergence/emergence/types';
  import You from './emergence/emergence/You.svelte'
  import Admin from './emergence/emergence/Admin.svelte';
  import SiteMapDisplay from './emergence/emergence/SiteMapDisplay.svelte';
  import AllSiteMaps from './emergence/emergence/AllSiteMaps.svelte';
  import Discover from './emergence/emergence/Discover.svelte';

  let client: AppAgentClient | undefined;
  let store: EmergenceStore | undefined;
  let fileStorageClient: FileStorageClient | undefined;
  let loading = true;
  let pane = "sessions"
  let profilesStore: ProfilesStore | undefined
  let creatingMap = false

  $: client, fileStorageClient, store, loading;
  $: prof = profilesStore ? profilesStore.myProfile : undefined
  $: uiProps = store ? store.uiProps : undefined
  onMount(async () => {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    const adminPort : string = import.meta.env.VITE_ADMIN_PORT
    const appPort : string = import.meta.env.VITE_APP_PORT

    client = await AppAgentWebsocket.connect(`ws://localhost:${appPort}`, 'emergence');
    if (adminPort) {
      const adminWebsocket = await AdminWebsocket.connect(`ws://localhost:${adminPort}`)
      //const x = await adminWebsocket.listApps({})
      const cellIds = await adminWebsocket.listCellIds()
      await adminWebsocket.authorizeSigningCredentials(cellIds[0])
    }

    profilesStore = new ProfilesStore(new ProfilesClient(client, 'emergence'), {
      avatarMode: "avatar-optional",
    });

    fileStorageClient = new FileStorageClient(client, 'emergence');

    store = new EmergenceStore(new EmergenceClient(client,'emergence'), profilesStore, fileStorageClient, client.myPubKey)
    store.fetchSiteMaps()
    loading = false;
  });

  setContext(storeContext, {
    getStore: () => store,
  });

  setContext(clientContext, {
    getClient: () => client,
  });
  let createSessionDialog: SessionCrud
  let createSpaceDialog: SpaceCrud
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
    <div style="text-align:center">
      <h1>Hello.</h1>
      <p><b>Emergence</b> is a decentralized hApp for discovery, scheduling, connecting and remembering </p>
      <p>Harness the power of the decentralized web technology for local, ofline collaboration.</p>
      <p>Continue with a nickname and optional avatar, both of which can be changed later.</p>
    </div>
    {/if}

    <profile-prompt>
      <file-storage-context client={fileStorageClient}>
    {#if store &&  $uiProps.sessionDetails}
      <div class="session-details" style="height:100vh">
        <SessionDetail 
        on:session-deleted={()=>store.setUIprops({sessionDetails:undefined})}
        on:session-close={()=>store.setUIprops({sessionDetails:undefined})}
        sessionHash={$uiProps.sessionDetails}></SessionDetail>
      </div>
    {/if}
    <div id="content" style="display: flex; flex-direction: column; flex: 1;">

      {#if pane=="sessions"}
      <div class="pane">
        <AllSessions></AllSessions>
        <div class="create-session" on:click={() => {createSessionDialog.open(undefined)} } >
          <div class="summary">
            <div class="slot">
              <div class="slot-wrapper">
                +
              </div>
            </div>
            <div class="info">
              <div class="top-area">
                <div class="left-side">
                  <span><strong>Create a session</strong></span>
                  <p>What are you excited to share with this community? What special insights and wisdom are you ready to share?</p>
                </div>
                <div class="right-side"></div>
              </div>
            </div>
          </div>
        </div>

          <SessionCrud
            bind:this={createSessionDialog}
            on:session-created={() => {} }
            ></SessionCrud>
      </div>
      {/if}

      {#if pane=="schedule"}
        <div class="pane">
          <ScheduleUpcoming
            on:open-slotting={()=>pane="schedule.slotting"}
          ></ScheduleUpcoming>
        </div>
      {/if}

      {#if pane=="schedule.slotting"}
        <div class="pane">
          <ScheduleSlotting
            on:slotting-close={()=>pane="admin"}

          ></ScheduleSlotting>
        </div>
      {/if}

      {#if pane=="spaces"}
      <div class="pane">
        {#if store.getCurrentSiteMap()}
          <SiteMapDisplay 
            sitemap={store.getCurrentSiteMap()}
            on:show-all-spaces={()=>pane= "spaces.list"}
            ></SiteMapDisplay>
        {:else}
          <h5>No Sitemap configured yet</h5>
        {/if}
      </div>
      {/if}

      {#if pane=="spaces.list"}
      <div class="pane">
        <AllSpaces
          on:all-spaces-close={()=>pane= "spaces"}
        ></AllSpaces>
        {#if $uiProps.amSteward}
          Create Space:
          <sl-button on:click={() => {createSpaceDialog.open(undefined) } } circle>
            <Fa icon={faPlus} />
          </sl-button>
        {/if}
    
          <SpaceCrud
            bind:this={createSpaceDialog}
            on:space-created={() => {} }
            ></SpaceCrud>
      </div>
      {/if}

      {#if pane=="you"}
      <div class="pane">
        <You></You>
      </div>
      {/if}
      {#if pane=="admin"}
      <div class="pane">
        <Admin
          on:open-sitemaps={()=>pane = 'admin.sitemaps'}
          on:open-slotting={()=>pane="schedule.slotting"}
        ></Admin>
      </div>
      {/if}
      {#if pane=="admin.sitemaps"}
      <div class="pane">
        {#if creatingMap}
          <div class="modal">
              <SiteMapCrud
              on:sitemap-created={() => {creatingMap = false;} }
              on:edit-canceled={() => { creatingMap = false; } }
              ></SiteMapCrud>
          </div>
        {/if}
        <AllSiteMaps
        on:sitemaps-close={()=>pane = 'admin'}
        ></AllSiteMaps>
        Create Sitemap:
        <sl-button on:click={() => {creatingMap = true; } } circle>
          <Fa icon={faPlus} />
        </sl-button>
      </div>
      {/if}
      {#if pane=="discover"}
      <div class="pane">
        <Discover></Discover>
      </div>
      {/if}

      <div class="nav">
        <div class="nav-button {pane === "discover" ? "selected":""}"
          title="Discover"
          on:keypress={()=>{pane='discover'}}
          on:click={()=>{pane='discover'}}
        >
           <Fa icon={faHome} size="2x"/>
           <span class="button-title">Discover</span>
        </div>
        <div class="nav-button {pane.startsWith("sessions")?"selected":""}"
          title="Sessions"
          on:keypress={()=>{pane='sessions'}}
          on:click={()=>{pane='sessions'}}
        >
          <Fa icon={faCalendar} size="2x"/>
           <span class="button-title">Sessions</span>
        </div>


        <div class="nav-button {pane.startsWith("spaces")?"selected":""}"
          title="Spaces"
          on:keypress={()=>{pane='spaces'}}
          on:click={()=>{pane='spaces'}}
        >
          <Fa icon={faMap} size="2x"/>
         <span class="button-title">Spaces</span>
        </div>
        <div class="nav-button {pane=="you"?"selected":""}"
          title="You"
          on:keypress={()=>{pane='you'}}
          on:click={()=>{pane='you'}}
        >
           <Fa icon={faUser} size="2x"/>
           <span class="button-title">You</span>
        </div>
        {#if store && $uiProps.amSteward}
          <div class="nav-button {pane.startsWith("admin")?"selected":""}"
            title="Admin"
            on:keypress={()=>{pane='admin'}}
            on:click={()=>{pane='admin'}}
          >
            <Fa icon={faGear} size="2x"/>
           <span class="button-title">Settings</span>
          </div>
        {/if}
      </div>
    </div>
    </file-storage-context>
    </profile-prompt>
  </profiles-context>
  {/if}
</main>

<style>
  main {
    padding: 0em;
    max-width: 100%;
    margin: 0 auto;
  }
  body {
    background-color: #fff;
  }
  .pane {
    position: relative;
  }

  :global(sl-dialog) {
    z-index: 10000000;
    position: relative;
    display: block;
  }

  :global(.modal) {
    background-color: white;
    padding: 10px;
    position: absolute;
    top: 5px;

    border: solid 1px;
    display: flex; flex-direction: column;
    max-height: 100%;
    overflow: auto;
  }
  :global(.pane-contents) {
    display: flex; flex-direction: column;
  }
  :global(.pane){
    width: 100%;
  }
  :global(.pane-header){
    display: flex; 
    flex-direction: column;
    justify-content:space-between; 
    align-items: left;
    padding: .5em;
    margin-bottom: 1em;
  }
  :global(.flex-center) {
        display: flex;
        justify-content: center;
    }
  .nav {
    display: flex; flex-direction: row; flex: 1;
    padding-left: 10px;
    padding-right: 10px;
    width: 100%;
    margin: auto;
    justify-content: center;
  }

  .nav-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 50px;
    max-width: 50px;
    border-radius: 50%;
    padding: 5px;
    margin: 5px;
    background-color: transparent;
    color: rgba(86, 94, 109, 1);
    transition: color .25s ease;
  }

  .nav-button .button-title {
    font-size: 9px;
    padding-top: 5px;
  }

  .create-session {
   max-width: 720px;
   border: 1px solid rgba(239, 240, 243, 1.0);
   display: flex;
   background-color: rgba(243, 243, 245, 1.0);
   width: 100%;
   opacity: .6;
    transition: all .25s ease;

  }

  .create-session:hover {
    opacity: 1;
    cursor: pointer;
  }

  .summary {
    display: flex;
    flex-direction: row;
    width: 100%;
  }

   .slot {
     width: 95px;
     display: flex;
     align-items: center;
     justify-content: center;
   }

   .slot-wrapper {
    height: 50px;
    width: 50px;
    font-size: 24px;
    font-weight: bold;
    border: 3px solid rgba(116, 116, 122, 1.0);
    color: rgba(116, 116, 122, 1.0);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: .5;
   }

  .info {
    width: 100%;
    flex-stretch: 1;
    background-color: #fff;
  }

  .left-side {
    padding: 10px;
  }

  .left-side p {
    opacity: .5;
    font-size: 12px;
  }

  .selected {
    color: rgba(22, 26, 30, 1);
    background-color: transparent;
  }

  .nav-button.selected .button-title {
    font-weight: bold;
  }

  .nav-button:hover {
    color: rgba(22, 26, 30, 1);
    cursor: pointer;
  }

  .nav-button:active {
    background-color: #4f2f39;
    color: #fceed7;
    cursor: pointer;
  }

  .pane {
    width: 100vw;
  }

  #content {
    height: 100vh;
  }

  /* @media (min-width: 500px) {
    main {
      max-width: 500px;
    }
  } */


  .session-details {
    background-color: white;
    position: absolute;

    border: solid 1px;
    display: flex; flex-direction: column;
    max-height: 100%;
    overflow: auto;
    z-index: 1000;
  }
</style>
