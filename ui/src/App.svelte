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
  import { faMap, faUser, faGear, faCalendar, faPlus, faHome } from '@fortawesome/free-solid-svg-icons';

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
  import You from './emergence/emergence/You.svelte'
  import Admin from './emergence/emergence/Admin.svelte';
  import SiteMapDisplay from './emergence/emergence/SiteMapDisplay.svelte';
  import AllSiteMaps from './emergence/emergence/AllSiteMaps.svelte';
  import Discover from './emergence/emergence/Discover.svelte';
  import Folk from './emergence/emergence/Folk.svelte';
  import SpaceDetail from './emergence/emergence/SpaceDetail.svelte';

  let client: AppAgentClient | undefined;
  let store: EmergenceStore | undefined;
  let fileStorageClient: FileStorageClient | undefined;
  let loading = true;
  let profilesStore: ProfilesStore | undefined
  let creatingMap = false

  $: client, fileStorageClient, store, loading;
  $: prof = profilesStore ? profilesStore.myProfile : undefined
  $: uiProps = store ? store.uiProps : undefined
  $: pane = store ? $uiProps.pane : "sessions"
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
      additionalFields: [
        {
          name: "location",
          label: "Location",
          required: false, 
        },
        {
          name: "bio",
          label: "Bio",
          required: false,
        }
      ], 
    });

    fileStorageClient = new FileStorageClient(client, 'emergence');

    store = new EmergenceStore(new EmergenceClient(client,'emergence'), profilesStore, fileStorageClient, client.myPubKey)
    await store.sync(undefined)
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

  const setPane = (pane) => {
    closeSessionDetails()
    closeSpaceDetails()
    closeFolk()
    store.setUIprops({pane})
  }
  const closeSessionDetails = () => {
    store.setUIprops({sessionDetails:undefined})
  }
  const closeSpaceDetails = () => {
    store.setUIprops({spaceDetails:undefined})
  }
  const closeFolk = () => {
    store.setUIprops({folk:undefined})
  }

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

      <div class="nav">
        <div class="button-group">
          <div class="nav-button {pane === "discover" ? "selected":""}"
            title="Discover"
            on:keypress={()=>{setPane('discover')}}
            on:click={()=>{setPane('discover')}}
          >
            <Fa class="nav-icon" icon={faHome} size="2x"/>
            <span class="button-title">Discover</span>
          </div>
          <div class="nav-button {pane.startsWith("sessions")?"selected":""}"
            title="Sessions"
            on:keypress={()=>{setPane('sessions')}}
            on:click={()=>{setPane('sessions')}}
          >
            <Fa class="nav-icon" icon={faCalendar} size="2x"/>
            <span class="button-title">Sessions</span>
          </div>
    
    
          <div class="nav-button {pane.startsWith("spaces")?"selected":""}"
            title="Spaces"
            on:keypress={()=>{setPane('spaces')}}
            on:click={()=>{setPane('spaces')}}
          >
            <Fa class="nav-icon" icon={faMap} size="2x"/>
          <span class="button-title">Spaces</span>
          </div>
        </div>
        <div class="button-group settings">
          <div class="nav-button {pane=="you"?"selected":""}"
            title="You"
            on:keypress={()=>{setPane('you')}}
            on:click={()=>{setPane('you')}}
          >
            <Fa class="nav-icon" icon={faUser} size="2x"/>
            <span class="button-title you">You</span>
          </div>
          {#if store && $uiProps.amSteward}
            <div class="nav-button {pane.startsWith("admin")?"selected":""}"
              title="Admin"
              on:keypress={()=>{setPane('admin')}}
              on:click={()=>{setPane('admin')}}
            >
              <Fa class="nav-icon" icon={faGear} size="2x"/>
            <span class="button-title settings">Settings</span>
            </div>
          {/if}
        </div>
      </div>

      <file-storage-context client={fileStorageClient}>
      {#if store &&  $uiProps.spaceDetails}
      <div class="session-details" style="height:100vh">
        <SpaceDetail
          on:space-deleted={()=>closeSpaceDetails()}
          on:space-close={()=>closeSpaceDetails()}
          space={store.getSpace($uiProps.spaceDetails)}>
        </SpaceDetail>
      </div>
      {/if}
    {#if store &&  $uiProps.sessionDetails}
      <div class="session-details" style="height:100vh">
        <SessionDetail 
        on:session-deleted={()=>closeSessionDetails()}
        on:session-close={()=>closeSessionDetails()}
        sessionHash={$uiProps.sessionDetails}></SessionDetail>
      </div>
    {/if}
    {#if store &&  $uiProps.folk}
      <div class="session-details" style="height:100vh">
        <Folk 
        on:folk-close={()=>closeFolk()}
        agentPubKey={$uiProps.folk}></Folk>
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
            on:open-slotting={()=>setPane("schedule.slotting")}
          ></ScheduleUpcoming>
        </div>
      {/if}

      {#if pane=="schedule.slotting"}
        <div class="pane">
          <ScheduleSlotting
            on:slotting-close={()=>setPane("admin")}

          ></ScheduleSlotting>
        </div>
      {/if}

      {#if pane=="spaces"}
      <div class="pane">
        {#if store.getCurrentSiteMap()}
          <SiteMapDisplay 
            sitemap={store.getCurrentSiteMap()}
            on:show-all-spaces={()=>setPane("spaces.list")}
            ></SiteMapDisplay>
        {:else}
          <h5>No Sitemap configured yet</h5>
        {/if}
      </div>
      {/if}

      {#if pane=="spaces.list"}
      <div class="pane spaces">
        {#if $uiProps.amSteward}
          <div class="create" on:click={() => {createSpaceDialog.open(undefined) } }>
            <span>+</span> Create
          </div>
        {/if}
        <AllSpaces
          on:all-spaces-close={()=>setPane("spaces")}
        ></AllSpaces>
    
          <SpaceCrud
            bind:this={createSpaceDialog}
            on:space-created={() => {} }
            ></SpaceCrud>
      </div>
      {/if}

      {#if pane=="you"}
      <div class="pane you">
        <You></You>
      </div>
      {/if}
      {#if pane=="admin"}
      <div class="pane">
        <Admin
          on:open-sitemaps={()=>pane = 'admin.sitemaps'}
          on:open-slotting={()=>setPane("schedule.slotting")}
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

   .button-group {
    display: flex;
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



  .session-details {
    background-color: white;
    position: absolute;
    border: solid 1px;
    display: flex; flex-direction: column;
    height: calc(100vh - 76px);
    overflow: auto;
    z-index: 100;
  }
@media (min-width: 720px) {
  .create-session {
    display: none;
  }
}
</style>
