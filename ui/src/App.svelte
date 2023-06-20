<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AdminWebsocket, AppAgentWebsocket, type AppAgentClient, setSigningCredentials } from '@holochain/client15';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import AllSessions from './emergence/emergence/AllSessions.svelte';
  import AllSpaces from './emergence/emergence/AllSpaces.svelte';
  import SessionCrud from './emergence/emergence/SessionCrud.svelte';
  import SpaceCrud from './emergence/emergence/SpaceCrud.svelte';
  import { ProfilesStore, ProfilesClient } from "@holochain-open-dev/profiles";
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import Fa from 'svelte-fa'
  import { faMap, faUser, faGear, faCalendar, faHome, faSync, faArrowRightFromBracket, faArrowRotateBack } from '@fortawesome/free-solid-svg-icons';

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
  import { getCookie, deleteCookie } from 'svelte-cookie';
  import { Base64 } from 'js-base64'

  let client: AppAgentClient | undefined;
  let store: EmergenceStore | undefined;
  let fileStorageClient: FileStorageClient | undefined;
  let loading = true;
  let profilesStore: ProfilesStore | undefined
  let error: any = undefined;
  let creds

  $: error
  $: client, fileStorageClient, store, loading;
  $: prof = profilesStore ? profilesStore.myProfile : undefined
  $: uiProps = store ? store.uiProps : undefined
  $: pane = store ? $uiProps.pane : "sessions"
  $: sitemaps = store ? store.maps : undefined


  const base64ToUint8 = (b64:string)=> Base64.toUint8Array(b64);

  const jsonToCreds = (json:string)=> {
    const creds = JSON.parse(json)
    creds.creds.capSecret = base64ToUint8(creds.creds.capSecret)
    creds.creds.keyPair.publicKey = base64ToUint8(creds.creds.keyPair.publicKey)
    creds.creds.keyPair.privateKey = base64ToUint8(creds.creds.keyPair.privateKey)
    creds.creds.signingKey = base64ToUint8(creds.creds.signingKey)
    return creds
  };

  onMount(async () => {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    const adminPort : string = import.meta.env.VITE_ADMIN_PORT
    let installed_app_id = "emergence"
    const credsJson = getCookie("creds")
    if (credsJson) {
      creds = jsonToCreds(credsJson)
      installed_app_id = creds.installed_app_id
    }
    window.onunhandledrejection = (e) => {
      if (typeof e.reason == "object") {
        if (e instanceof TypeError) {
          error = e.message
        } else {
          if (e.reason.message) {
            error = e.reason.message
          } else {
            error = JSON.stringify(e.reason)
          }
        }
      } else {
        error = e.reason
      }
    }
    let url
    if (creds) {
      console.log("CREDS", creds)
      url = new URL(`${window.location.protocol == "https:" ? "wss:" : "ws:"}//${window.location.host}/${creds.appPath}`)
      client = await AppAgentWebsocket.connect(url, installed_app_id);
      const appInfo = await client.appInfo()
      console.log("appInfo", appInfo)
      const { cell_id } = appInfo.cell_info["emergence"][0]["provisioned"]
      await setSigningCredentials(cell_id, creds.creds)
    } else {
      let appPort: string = import.meta.env.VITE_APP_PORT
      url = appPort ? new URL(`ws://localhost:${appPort}`) : ""
      client = await AppAgentWebsocket.connect(url, installed_app_id);
      console.log("Dev mode admin port:", adminPort)
      if (adminPort) {
        const adminWebsocket = await AdminWebsocket.connect(new URL(`ws://localhost:${adminPort}`))
        const cellIds = await adminWebsocket.listCellIds()
        await adminWebsocket.authorizeSigningCredentials(cellIds[0])
      }
    }
  

    profilesStore = new ProfilesStore(new ProfilesClient(client, 'emergence'), {
      avatarMode: "avatar-optional",
      minNicknameLength: 3,
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
    store = new EmergenceStore(new EmergenceClient(url,installed_app_id, client,'emergence'), profilesStore, fileStorageClient, client.myPubKey)
    await store.sync(undefined)
    initialSync = setInterval(async ()=>{
      if ($uiProps.amSteward || ($sitemaps && $sitemaps.length > 0)) {clearInterval(initialSync)}
      else {
        await doSync()
      }
    }, 10000);

    loading = false;
  });
  let initialSync

  setContext(storeContext, {
    getStore: () => store,
  });

  setContext(clientContext, {
    getClient: () => client,
  });
  let createSessionDialog: SessionCrud
  let createSpaceDialog: SpaceCrud

  const doSync=async () => {
        await store.sync(undefined);
  }
  let clickCount = 0
  const adminCheck = () => { 
    clickCount += 1
    if (clickCount == 5) {
      clickCount = 0
      const amSteward = $uiProps.amSteward
      store.setUIprops({amSteward:!amSteward}) 
    }
  }
</script>

<main>
  {#if error}
    <span class="notice modal" style="max-width:700px;position:absolute; top:60px; left: 0;right: 0;margin: 0 auto; z-index:1000"
    >
      <h3>I'm sorry to say it, but there has been an error ☹️</h3>
      <div style="padding:10px; margin:10px; background:lightcoral;border-radius: 10px;">
        {error}
      </div>
      {#if creds}
        <div>You are signed in to the holochain multiplexer with reg key: <strong>{creds.regkey}</strong></div>
        <sl-button style="margin-left: 8px;" on:click={() => {
          deleteCookie("creds")
          window.location.assign("/")
          }}>
          <Fa icon={faArrowRightFromBracket} /> Logout
        </sl-button>
        {/if}
        <sl-button style="margin-left: 8px;" on:click={() => error=undefined}>
          Ignore
        </sl-button>
        <sl-button style="margin-left: 8px;" on:click={() => window.location.assign("/")}>
          <Fa icon={faArrowRotateBack} /> Reload
        </sl-button>
    </span>
  {/if}
  {#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
      <sl-spinner
 />
    </div>
  {:else}
  <profiles-context store="{profilesStore}">

    {#if $prof && ($prof.status!=="complete" || $prof.value===undefined)}
      <div class="event-intro">
        <div class="wrapper">
          <div class="about-event">
            <img class="dweb-camp" src="/images/dweb-camp.png" 
            on:click={()=>adminCheck()}/>
            <p style="color:black">Welcome to camp! Create a profile to discover sessions, find people and take notes {#if $uiProps.amSteward}!{/if}</p>
          </div>
          {#if $prof.status=="complete" && $prof.value == undefined}
          <div class="create-profile">
            <create-profile
              on:profile-created={()=>{}}
            ></create-profile>
          </div>
          {/if}
        </div>
      </div>
    {:else }
      {#if (!sitemaps || $sitemaps.length==0) && !$uiProps.amSteward}
      <div class="event-intro">
        <div class="wrapper">
          <div class="about-event">

            <img class="dweb-camp" src="/images/dweb-camp.png" 
        on:click={()=>adminCheck()}/>
        <p>Either your node hasn't synchronized yet with the network, or the conference data hasn't yet been set up. Please be patient! </p>
        <div style="display:flex;justify-items:center;width:100%">
        <sl-button on:click={() => doSync()}>
          <span class:spinning={true}> <Fa  icon={faArrowRotateBack} /> </span>Reload
        </sl-button></div>
        {#if $uiProps && $uiProps.syncing}<span class:spinning={true}> <Fa  icon={faSync} /></span>{/if}
      </div></div></div>
      {:else}
      <div class="nav">
        <div class="button-group">
          <div id="nav-discover" class="nav-button {pane === "discover" ? "selected":""}"
            title="Discover"
            on:keypress={()=>{store.setPane('discover')}}
            on:click={()=>{store.setPane('discover')}}
          >
            <Fa class="nav-icon" icon={faHome} size="2x"/>
            <span class="button-title">Discover</span>
          </div>
          <div id="nav-sessions" class="nav-button {pane.startsWith("sessions")?"selected":""}"
            title="Sessions"
            on:keypress={()=>{store.setPane('sessions')}}
            on:click={()=>{store.setPane('sessions')}}
          >
            <Fa class="nav-icon" icon={faCalendar} size="2x"/>
            <span class="button-title">Sessions</span>
          </div>
    
    
          <div id="nav-spaces" class="nav-button {pane.startsWith("spaces")?"selected":""}"
            title="Spaces"
            on:keypress={()=>{store.setPane('spaces')}}
            on:click={()=>{store.setPane('spaces')}}
          >
            <Fa class="nav-icon" icon={faMap} size="2x"/>
          <span class="button-title">Spaces</span>
          </div>
        </div>
        <div class="button-group settings">
          {#if store && $uiProps.amSteward}
            <div id="nav-admin" class="nav-button {pane.startsWith("admin")?"selected":""}"
              title="Admin"
              on:keypress={()=>{store.setPane('admin')}}
              on:click={()=>{store.setPane('admin')}}
            >
              <Fa class="nav-icon" icon={faGear} size="2x"/>
            <span class="button-title settings">Settings</span>
            </div>
          {/if}
          <div id="nav-you" class="nav-button {pane=="you"?"selected":""}"
            title="You"
            on:keypress={()=>{store.setPane('you')}}
            on:dblclick={(e)=>e.stopPropagation()}
            on:click={(e)=>{
              e.stopPropagation()
              if (pane=="you") adminCheck()
              else store.setPane('you')
              }}
          >
            <Fa class="nav-icon" icon={faUser} size="2x"/>
            <span class="button-title you">You</span>
          </div>

          <div id="nav-sync" class="nav-button"
            title="Sync"
            on:keypress={()=>{doSync()}}
            on:click={()=>{doSync()}}
          >
            <span
            class:spinning={$uiProps && $uiProps.syncing}
            >
            <Fa 
              class="nav-icon "
              icon={faSync} size="2x"/></span>
            <span class="button-title sync">Sync</span>
          </div>
          {#if getCookie("creds")}
            <div id="nav-logout" class="nav-button"
              title="Logout"
              on:click={()=>{
                window.location.assign("/reset")
              }}
            >
              <Fa class="nav-icon" icon={faArrowRightFromBracket} size="2x"/>
            <span class="button-title">Logout</span>
            </div>
          {/if}
        </div>
      </div>

      <file-storage-context client={fileStorageClient}>
      {#if store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.ProxyAgent }
      <div class="session-details">
        <ProxyAgentDetail
          on:proxyagent-deleted={()=>store.closeDetails()}
          on:proxyagent-close={()=>store.closeDetails()}
          proxyAgentHash={$uiProps.detailsStack[0].hash}>
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
      <div class="pane sitemap">
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
        <AllSiteMaps
        on:sitemaps-close={()=>pane = 'admin'}
        ></AllSiteMaps>
      </div>
      {/if}
      {#if pane=="admin.proxyagents"}
      <div class="pane">
              <ProxyAgentCrud
              on:proxyagent-created={() => {} }
              ></ProxyAgentCrud>

              <AllProxyAgents
        on:proxyagents-close={()=>pane = 'admin'}
        ></AllProxyAgents>
      </div>
      {/if}      {#if pane=="discover"}
      <div class="pane">
        <Discover></Discover>
      </div>
      {/if}
    </div>
    </file-storage-context>
    {/if}
    {/if}
  </profiles-context>
  {/if}
</main>

<style>
  .app-info {
    display:flex; justify-content:center; align-items:center; flex-direction: column;
    max-width: 320px;
    margin:0 auto;
    text-align: center;
    margin-bottom: 30px;
  }

  .event-intro {
    width: 100vw;
    display: block;
    height: 100vh;
    background-image: url(/images/dweb-background.jpg);
    background-size: cover;
    overflow-y: scroll;
  }

  .event-intro .wrapper {
    display: block;
    height: 100%;
    max-width: 320px;
    margin: 0 auto;
  }

  .app-info p {
    opacity: .6;
    padding-top: 30px;
  }

  .sitemap {
    display: flex;
    flex-direction: row;
  }

  .notice {
    display: block;
    text-align: center;
    max-width: 1000px;
    padding: 25px;
    border: 1px solid;
    border-radius: 20px;
    margin: auto;
  }

  .about-event {
    padding: 20px;

  }

  .about-event p {
    font-size: 14px;
    text-align: center;
    margin-top: 15px;
    margin-bottom: 0;
  }

  .dweb-camp {
    max-width: 50vw;
    margin: 0 auto;
    display: block;
  }
  
@media (min-width: 720px) {
  .event-intro .wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
  }
}
</style>
