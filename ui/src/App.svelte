<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AdminWebsocket, AppWebsocket, type AppClient, setSigningCredentials, type AgentPubKey, type AppWebsocketConnectionOptions } from '@holochain/client';
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

  import { clientContext, frameContext, storeContext } from './contexts';
  import { DEFAULT_SYNC_TEXT, EmergenceStore } from './emergence-store';
  import { EmergenceClient } from './emergence-client';
  import ScheduleSlotting from './emergence/emergence/ScheduleSlotting.svelte';
  import ScheduleUpcoming from './emergence/emergence/ScheduleUpcoming.svelte';
  import SessionDetail from './emergence/emergence/SessionDetail.svelte';
  import SessionSummary from './emergence/emergence/SessionSummary.svelte';
  import You from './emergence/emergence/You.svelte'
  import Admin from './emergence/emergence/Admin.svelte';
  import SiteMapDisplay from './emergence/emergence/SiteMapDisplay.svelte';
  import AllSiteMaps from './emergence/emergence/AllSiteMaps.svelte';
  import Discover from './emergence/emergence/Discover.svelte';
  import Folk from './emergence/emergence/Folk.svelte';
  import SpaceDetail from './emergence/emergence/SpaceDetail.svelte';
  import { DetailsType, ROLE_NAME, ZOME_NAME } from './emergence/emergence/types';
  import ProxyAgentCrud from './emergence/emergence/ProxyAgentCrud.svelte';
  import AllProxyAgents from './emergence/emergence/AllProxyAgents.svelte';
  import ProxyAgentDetail from './emergence/emergence/ProxyAgentDetail.svelte';
  import { getCookie, deleteCookie } from 'svelte-cookie';
  import { Base64 } from 'js-base64'
  import blake2b from "blake2b";
import { ed25519 } from "@noble/curves/ed25519";
import {Buffer} from "buffer"
  import { WeClient, initializeHotReload, isWeContext } from '@lightningrodlabs/we-applet';
  import { appletServices } from './we';
  import { getMyDna } from './emergence/emergence/utils';

  let client: AppClient | undefined;
  let weClient: WeClient

  let store: EmergenceStore | undefined;
  let fileStorageClient: FileStorageClient | undefined;
  let loading = true;
  let profilesStore: ProfilesStore | undefined
  let error: any = undefined;
  let creds

  enum RenderType {
    App,
    Session,
  }
  let renderType = RenderType.App
  let wal

  $: error
  $: client, fileStorageClient, store, loading;
  $: prof = profilesStore ? profilesStore.myProfile : undefined
  $: uiProps = store ? store.uiProps : undefined
  $: pane = store ? $uiProps.pane : "sessions"
  $: sitemaps = store ? store.maps : undefined
  $: allWindows = store ? store.timeWindows : undefined

  $: loadingText = store ? store.syncText : undefined

  const base64ToUint8 = (b64:string)=> Base64.toUint8Array(b64);

//   const jsonToCreds = (json:string)=> {
//     const creds = JSON.parse(json)
//     creds.creds.capSecret = base64ToUint8(creds.creds.capSecret)
//     creds.creds.keyPair.publicKey = base64ToUint8(creds.creds.keyPair.publicKey)
//     creds.creds.keyPair.privateKey = base64ToUint8(creds.creds.keyPair.privateKey)
//     creds.creds.signingKey = base64ToUint8(creds.creds.signingKey)
//     return creds
//   };

//   const uint8ToBase64 = (arr: Uint8Array) => Buffer.from(arr).toString("base64");

// const deriveSigningKeys = async (
//   seed: string
// ): Promise<[KeyPair, AgentPubKey]> => {
//   //const interim = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
//   //  const privateKey = await blake2b(interim.length).update(Buffer.from(seed)).digest('binary')
//   //  const publicKey = await ed25519.getPublicKeyAsync(privateKey);
//   //  const keyPair = { privateKey, publicKey };

//   const interim = Buffer.from([
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0,
//   ]);
//   const privateKey = blake2b(interim.length)
//     .update(Buffer.from(seed))
//     .digest("binary");

//   const publicKey = ed25519.getPublicKey(privateKey);

//   const signingKey = new Uint8Array(
//     [132, 32, 36].concat(...publicKey).concat(...[0, 0, 0, 0])
//   );
//   return [{ privateKey, publicKey }, signingKey];
// };

//   const genCredsForPass = async (regkey: string, password: string) => {
//   const [keyPair, signingKey] = await deriveSigningKeys(
//     `${regkey}-${password}`
//   );
//   const interim = Buffer.from([
//     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
//     0, 0, 0, 0, 0, 0, 0,
//   ]);
//   const regKeyHash = await blake2b(interim.length)
//     .update(Buffer.from(regkey))
//     .digest("binary");
//   const capSecret = Buffer.concat([regKeyHash, regKeyHash]);
//   const creds = {
//     capSecret,
//     keyPair,
//     signingKey,
//   };
//   return creds;
// };


  const isConfigured = (): boolean => {
    return $sitemaps && $sitemaps.length > 0 && $allWindows && $allWindows.length > 0
  }

  onMount(async () => {
    // We pass '' as url because it will dynamically be replaced in launcher environments
    const adminPort : string = import.meta.env.VITE_ADMIN_PORT
    let installed_app_id = "emergence"
    // const credsJson = getCookie("creds")
    // if (credsJson) {
    //   creds = jsonToCreds(credsJson)
    //   installed_app_id = creds.installed_app_id
    // }

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
    // if (import.meta.env.VITE_URL) {
    //   const screds = await genCredsForPass("Funky1","monkey")
    //   creds = {
    //     installed_app_id:"emergence-Funky1",
    //     regkey:"Funky1",
    //     appPath: `appWebsocket0`,
    //     creds: screds
    //     }
    //   }
    // if (creds) {
    //   console.log("CREDS", creds)
    //   if (import.meta.env.VITE_URL) {
    //     url = `wss://${import.meta.env.VITE_URL}/${creds.appPath}`
    //   }
    //   else {
    //     url = new URL(`${window.location.protocol == "https:" ? "wss:" : "ws:"}//${window.location.host}/${creds.appPath}`)
    //   }
    //   console.log("URL", url)
    //   client = await AppWebsocket.connect(creds.installed_app_id, {url});
    //   const appInfo = await client.appInfo()
    //   console.log("appInfo", appInfo)
    //   const { cell_id } = appInfo.cell_info["emergence"][0]["provisioned"]
    //   await setSigningCredentials(cell_id, creds.creds)
    // } else 

    let profilesClient
    if ((import.meta as any).env.DEV) {
      try {
        await initializeHotReload();
      } catch (e) {
        console.warn("Could not initialize applet hot-reloading. This is only expected to work in a We context in dev mode.")
      }
    }

    let tokenResp;
    if (!isWeContext()) {
      let appPort: string = import.meta.env.VITE_APP_PORT
      console.log("Dev mode admin port:", adminPort)
      url = appPort ? `ws://localhost:${appPort}` : `ws://localhost`
      console.log("URL", url)
      if (adminPort) {
        const url = `ws://localhost:${adminPort}`;
        console.log("connecting to admin port at:", url);
        const adminWebsocket = await AdminWebsocket.connect({url: new URL(url)})
        tokenResp = await adminWebsocket.issueAppAuthenticationToken({
          installed_app_id: installed_app_id,
        });

        const cellIds = await adminWebsocket.listCellIds()
        await adminWebsocket.authorizeSigningCredentials(cellIds[0])
      }
      const params: AppWebsocketConnectionOptions = { url: new URL(url) };
      if (tokenResp) params.token = tokenResp.token;

      client = await AppWebsocket.connect(params);
      profilesClient = new ProfilesClient(client, installed_app_id);
    } else {
      weClient = await WeClient.connect(appletServices);
      switch (weClient.renderInfo.type) {
        case "applet-view":
          switch (weClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the main view
              break;
            case "block":
              switch(weClient.renderInfo.view.block) {
                default:
                  throw new Error("Unknown applet-view block type:"+weClient.renderInfo.view.block);
              }
              break;
            case "asset":
              switch (weClient.renderInfo.view.roleName) {
                case ROLE_NAME:
                  switch (weClient.renderInfo.view.integrityZomeName) {
                    case "emergence_integrity":
                      switch (weClient.renderInfo.view.entryType) {
                        case "session":
                          renderType = RenderType.Session
                          wal = weClient.renderInfo.view.wal
                          break;
                        default:
                          throw new Error("Unknown entry type:"+weClient.renderInfo.view.entryType);
                      }
                      break;
                    default:
                      throw new Error("Unknown integrity zome:"+weClient.renderInfo.view.integrityZomeName);
                  }
                  break;
                default:
                  throw new Error("Unknown role name:"+weClient.renderInfo.view.roleName);
              }
              break;
            // case "creatable":
            //   switch (weClient.renderInfo.view.name) {
            //     case "board":
            //       renderType = RenderType.CreateBoard
            //       createView = weClient.renderInfo.view
            //   }              
            //   break;
            default:
              throw new Error("Unsupported applet-view type");
          }
          break;
        case "cross-applet-view":
          switch (this.weClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the cross-applet main view
              //break;
            case "block":
              //
              //break;
            default:
              throw new Error("Unknown cross-applet-view render type.")
          }
          break;
        default:
          throw new Error("Unknown render view type");

      }

      //@ts-ignore
      client = weClient.renderInfo.appletClient;
      //@ts-ignore
      profilesClient = weClient.renderInfo.profilesClient;
    }
  
    profilesStore = new ProfilesStore(profilesClient, {
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

    fileStorageClient = new FileStorageClient(client, ROLE_NAME);
    store = new EmergenceStore(new EmergenceClient(url,installed_app_id, client, ROLE_NAME), profilesStore, fileStorageClient, client.myPubKey)
    store.dnaHash = await getMyDna(ROLE_NAME, client)

    await store.sync(undefined)

    // for now everyone is a steward

    if (!isConfigured()) {
      store.setUIprops({amSteward:true})
      await store.setPane("admin")
     }

    initialSync = setInterval(async ()=>{
      if ($uiProps.amSteward || !isConfigured()) {clearInterval(initialSync)}
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

  setContext(frameContext, {
    getFrame: () => weClient,
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
  window.addEventListener("beforeunload", function (e) {
  var confirmationMessage = "You are about to leave Emergence!";
  return confirmationMessage;
  });
let sessionSummary = true

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
    <div class="loading-container">
      <img src="/images/loading.svg" />
      <span class="loading-text">{loadingText ? $loadingText : DEFAULT_SYNC_TEXT}</span>
    </div>
  {:else}
  <profiles-context store="{profilesStore}">
    {#if renderType == RenderType.Session}
      {@const session = store.getSession(wal.hrl[1])}
      <div style="margin:5px;"
      >
        {#if session}
          {#if sessionSummary}
            <div
              on:click={()=>sessionSummary = !sessionSummary}
              >
            <SessionSummary 
              showSlot={true}
              showLeaders={true}
              showTags={true}
              session={session}></SessionSummary>
            </div>
          {:else}
            <SessionDetail 
            on:session-close={()=>sessionSummary = true}
              sessionHash={wal.hrl[1]}></SessionDetail>
          {/if}
        {:else}
          Not Found
        {/if}
      </div>
    {:else}
      {#if $prof && ($prof.status!=="complete" || $prof.value===undefined)}
        <div class="event-intro">
          <div class="wrapper">
            <div class="about-event">
              <img class="emergence-welcome" src="/android-chrome-512x512.png" 
              />
              <p style="color:black">Welcome to Emergence! Create a profile to discover sessions, find people and take notes {#if $uiProps.amSteward}!{/if}</p>
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

              <img class="emergence-welcome" src="/android-chrome-512x512.png" 
          />
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
                if (pane!=="you") store.setPane('you')
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

  .emergence-welcome {
    width: 300px;
    margin: 0 auto;
    display: block;
  }

  .loading-container {
    display: flex; flex: 1; align-items: center; justify-content: center; position: absolute;
    top: 0; left: 0; width: 100%; height: 100%; flex-direction: column;
  }

  .loading-text {
    font-size: 11px;
    padding-top: 10px;
    opacity: .6;
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
