<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AdminWebsocket, decodeHashFromBase64, type AppAgentClient, encodeHashToBase64 } from '@holochain/client';
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
  import { faMap, faUser, faGear, faCalendar, faPlus, faHome, faSync } from '@fortawesome/free-solid-svg-icons';

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
  import { DetailsType } from './emergence/emergence/types';
  import ProxyAgentCrud from './emergence/emergence/ProxyAgentCrud.svelte';
  import AllProxyAgents from './emergence/emergence/AllProxyAgents.svelte';
  import ProxyAgentDetail from './emergence/emergence/ProxyAgentDetail.svelte';

  let client: AppAgentClient | undefined;
  let store: EmergenceStore | undefined;
  let fileStorageClient: FileStorageClient | undefined;
  let loading = true;
  let profilesStore: ProfilesStore | undefined
  let creatingMap = false
  let creatingProxyAgent = false
  let syncing = false
  let error: any = undefined;

  $: error
  $: client, fileStorageClient, store, loading;
  $: prof = profilesStore ? profilesStore.myProfile : undefined
  $: uiProps = store ? store.uiProps : undefined
  $: pane = store ? $uiProps.pane : "sessions"
  onMount(async () => {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    const adminPort : string = import.meta.env.VITE_ADMIN_PORT
    const appPort : string = import.meta.env.VITE_APP_PORT

    try {
      client = await AppAgentWebsocket.connect(`ws://localhost:${appPort}`, 'emergence');
      if (adminPort) {
        const adminWebsocket = await AdminWebsocket.connect(`ws://localhost:${adminPort}`)
        //const x = await adminWebsocket.listApps({})
        const cellIds = await adminWebsocket.listCellIds()
        await adminWebsocket.authorizeSigningCredentials(cellIds[0])
      }
    }
    catch(e) {
      error =e
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

  const doSync=async () => {
        syncing = true;
        console.log("start sync", new Date);
        await store.sync(undefined);
        console.log("end sync", new Date);
        syncing=false 
    }
</script>

<main>

  {#if error}
    <span class="notice">{error}</span>
  {:else if loading}
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
            on:keypress={()=>{store.setPane('discover')}}
            on:click={()=>{store.setPane('discover')}}
          >
            <Fa class="nav-icon" icon={faHome} size="2x"/>
            <span class="button-title">Discover</span>
          </div>
          <div class="nav-button {pane.startsWith("sessions")?"selected":""}"
            title="Sessions"
            on:keypress={()=>{store.setPane('sessions')}}
            on:click={()=>{store.setPane('sessions')}}
          >
            <Fa class="nav-icon" icon={faCalendar} size="2x"/>
            <span class="button-title">Sessions</span>
          </div>
    
    
          <div class="nav-button {pane.startsWith("spaces")?"selected":""}"
            title="Spaces"
            on:keypress={()=>{store.setPane('spaces')}}
            on:click={()=>{store.setPane('spaces')}}
          >
            <Fa class="nav-icon" icon={faMap} size="2x"/>
          <span class="button-title">Spaces</span>
          </div>
        </div>
        <div class="button-group settings">
          <div class="nav-button {pane=="you"?"selected":""}"
            title="You"
            on:keypress={()=>{store.setPane('you')}}
            on:click={()=>{store.setPane('you')}}
          >
            <Fa class="nav-icon" icon={faUser} size="2x"/>
            <span class="button-title you">You</span>
          </div>
          {#if store && $uiProps.amSteward}
            <div class="nav-button {pane.startsWith("admin")?"selected":""}"
              title="Admin"
              on:keypress={()=>{store.setPane('admin')}}
              on:click={()=>{store.setPane('admin')}}
            >
              <Fa class="nav-icon" icon={faGear} size="2x"/>
            <span class="button-title settings">Settings</span>
            </div>
          {/if}
          <div class="nav-button"
            class:spinning={syncing}
            title="Sync"
            on:keypress={()=>{doSync()}}
            on:click={()=>{doSync()}}
          >
            <Fa 
              class="nav-icon "
              icon={faSync} size="2x"/>
            <span class="button-title sync">Sync</span>
          </div>
        </div>
      </div>

      <file-storage-context client={fileStorageClient}>
      {#if store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.ProxyAgent }
      <div class="session-details">
        <ProxyAgentDetail
          on:proxyagent-deleted={()=>store.closeDetails()}
          on:proxyagent-close={()=>store.closeDetails()}
          proxyAgent={store.getProxyAgent($uiProps.detailsStack[0].hash)}>
        </ProxyAgentDetail>
      </div>
      {/if}
      {#if store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.Space }
      <div class="session-details">
        <SpaceDetail
          on:space-deleted={()=>store.closeDetails()}
          on:space-close={()=>store.closeDetails()}
          space={store.getSpace($uiProps.detailsStack[0].hash)}>
        </SpaceDetail>
      </div>
      {/if}
      {#if store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.Session }
      <div class="session-details">
        <SessionDetail 
        on:session-deleted={()=>store.closeDetails()}
        on:session-close={()=>store.closeDetails()}
        sessionHash={$uiProps.detailsStack[0].hash}></SessionDetail>
      </div>
    {/if}
    {#if store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.Folk }
    <div class="session-details">
        <Folk 
        on:folk-close={()=>store.closeDetails()}
        agentPubKey={$uiProps.detailsStack[0].hash}></Folk>
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
            on:open-slotting={()=>store.setPane("schedule.slotting")}
          ></ScheduleUpcoming>
        </div>
      {/if}

      {#if pane=="schedule.slotting"}
        <div class="pane">
          <ScheduleSlotting
            on:slotting-close={()=>store.setPane("admin")}

          ></ScheduleSlotting>
        </div>
      {/if}

      {#if pane=="spaces"}
      <div class="pane">
        {#if store.getCurrentSiteMap()}
          <SiteMapDisplay 
            sitemap={store.getCurrentSiteMap()}
            on:show-all-spaces={()=>store.setPane("spaces.list")}
            ></SiteMapDisplay>
        {:else}
          <h5>No Sitemap configured yet</h5>
        {/if}
      </div>
      {/if}

      {#if pane=="spaces.list"}
      <div class="pane spaces">
        {#if $uiProps.amSteward}
          <div class="pill-button" on:click={() => {createSpaceDialog.open(undefined) } }>
            <span>+</span> Create
          </div>
        {/if}
        <AllSpaces
          on:all-spaces-close={()=>store.setPane("spaces")}
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
          on:open-proxyagents={()=>pane = 'admin.proxyagents'}
          on:open-slotting={()=>store.setPane("schedule.slotting")}
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
      {#if pane=="admin.proxyagents"}
      <div class="pane">
        {#if creatingProxyAgent}
          <div class="modal">
              <ProxyAgentCrud
              on:proxyagent-created={() => {creatingProxyAgent = false;} }
              on:edit-canceled={() => { creatingProxyAgent = false; } }
              ></ProxyAgentCrud>
          </div>
        {/if}
        <AllProxyAgents
        on:proxyagents-close={()=>pane = 'admin'}
        ></AllProxyAgents>
        Create Proxy Agent:
        <sl-button on:click={() => {creatingProxyAgent = true; } } circle>
          <Fa icon={faPlus} />
        </sl-button>
      </div>
      {/if}      {#if pane=="discover"}
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

</style>
