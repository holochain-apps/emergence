<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AdminWebsocket, AppWebsocket, type AppClient, setSigningCredentials, type AgentPubKey, type AppWebsocketConnectionOptions, encodeHashToBase64 } from '@holochain/client';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import AllSessions from './emergence/emergence/AllSessions.svelte';
  import AllSpaces from './emergence/emergence/AllSpaces.svelte';
  import SessionCrud from './emergence/emergence/SessionCrud.svelte';
  import SpaceCrud from './emergence/emergence/SpaceCrud.svelte';
  import '@shoelace-style/shoelace/dist/themes/light.css';
  import Fa from 'svelte-fa'
  import { faMap, faUser, faGear, faCalendar, faHome, faSync, faArrowRightFromBracket, faArrowRotateBack } from '@fortawesome/free-solid-svg-icons';

  import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
  import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
  import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
  import "@holochain-open-dev/profiles/dist/elements/my-profile.js";
  import "@holochain-open-dev/profiles/dist/elements/list-profiles.js";
  import "@holochain-open-dev/file-storage/dist/elements/file-storage-context.js";

  import { clientContext, cloneManagerStoreContext, frameContext, storeContext } from './contexts';
  import { DEFAULT_SYNC_TEXT } from './stores/emergence-store';
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
  import { APP_ID, DetailsType, ROLE_NAME, ZOME_NAME } from './emergence/emergence/types';
  import ProxyAgentCrud from './emergence/emergence/ProxyAgentCrud.svelte';
  import AllProxyAgents from './emergence/emergence/AllProxyAgents.svelte';
  import ProxyAgentDetail from './emergence/emergence/ProxyAgentDetail.svelte';
  import { getCookie, deleteCookie } from 'svelte-cookie';
  import { Base64 } from 'js-base64'
  import { WeaveClient, initializeHotReload, isWeaveContext } from '@theweave/api';
  import { appletServices } from './we';
  import { CloneManagerStore } from './stores/clone-manager-store';
  import CloneManagerDialog from './emergence/emergence/CloneManagerDialog.svelte';
  import CloneManagerShareDialog from './emergence/emergence/CloneManagerShareDialog.svelte';
  import SvgIcon from './emergence/emergence/SvgIcon.svelte';
  import CloneManagerActiveButton from './emergence/emergence/CloneManagerActiveButton.svelte';
  import NetworkOnboarding from './emergence/emergence/NetworkOnboarding.svelte';
  import { saveDefaultProfile, clearDefaultProfile } from './emergence/emergence/defaultProfile';

  let client: AppClient | undefined;
  let weClient: WeaveClient

  let cloneManagerStore: CloneManagerStore | undefined;
  let loading = true;
  let error: any = undefined;
  let creds
  let connected = false;
  let initializationError: any = undefined;

  enum RenderType {
    App,
    Session,
  }
  let renderType = RenderType.App
  let wal
  let appPhase: 'loading' | 'onboarding' | 'ready' = 'loading';

  $: needsOnboarding = cloneManagerStore?.needsOnboarding;
  $: store = cloneManagerStore?.activeStore;
  $: prof = $store ? $store.profilesStore.myProfile : undefined
  $: uiProps = $store ? $store.uiProps : undefined
  $: pane = $store ? $uiProps.pane : "sessions"
  $: sitemaps = $store ? $store.maps : undefined
  $: allWindows = $store ? $store.timeWindows : undefined
  $: t = $store ? $store.terms : undefined

  $: loadingText = $store ? $store.syncText : undefined
  $: activeCellInfoNormalized = cloneManagerStore?.activeCellInfoNormalized;

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
    try {
      // We pass '' as url because it will dynamically be replaced in launcher environments
      const adminPort : string = import.meta.env.VITE_ADMIN_PORT
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
      if (!isWeaveContext()) {
      let appPort: string = import.meta.env.VITE_APP_PORT
      console.log("Dev mode admin port:", adminPort)
      url = appPort ? `ws://localhost:${appPort}` : `ws://localhost`
      console.log("URL", url)
      if (adminPort) {
        const url = `ws://localhost:${adminPort}`;
        console.log("connecting to admin port at:", url);
        const adminWebsocket = await AdminWebsocket.connect({url: new URL(url)})
        tokenResp = await adminWebsocket.issueAppAuthenticationToken({
          installed_app_id: APP_ID,
        });

        const cellIds = await adminWebsocket.listCellIds()
        await adminWebsocket.authorizeSigningCredentials(cellIds[0])
      }
      const params: AppWebsocketConnectionOptions = { url: new URL(url), defaultTimeout: 240000 };
      if (tokenResp) params.token = tokenResp.token;

      client = await AppWebsocket.connect(params);
    } else {
      weClient = await WeaveClient.connect(appletServices);
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
              if (!weClient.renderInfo.view.recordInfo) {
                throw new Error(
                  "Emergence does not implement asset views pointing to DNAs instead of Records."
                );
              } else {
                switch (weClient.renderInfo.view.recordInfo.roleName) {
                  case ROLE_NAME:
                    switch (weClient.renderInfo.view.recordInfo.integrityZomeName) {
                      case "emergence_integrity":
                        switch (weClient.renderInfo.view.recordInfo.entryType) {
                          case "session":
                            renderType = RenderType.Session
                            wal = weClient.renderInfo.view.wal
                            break;
                          default:
                            throw new Error("Unknown entry type:"+weClient.renderInfo.view.recordInfo.entryType);
                        }
                        break;
                      default:
                        throw new Error("Unknown integrity zome:"+weClient.renderInfo.view.recordInfo.integrityZomeName);
                    }
                    break;
                  default:
                    throw new Error("Unknown role name:"+weClient.renderInfo.view.recordInfo.roleName);
                }
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
        case "cross-group-view":
          switch (this.weClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the cross-applet main view
              //break;
            case "block":
              //
              //break;
            default:
              throw new Error("Unknown cross-group-view render type.")
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

      cloneManagerStore = new CloneManagerStore(
        client,
        weClient
      );

      // In non-Weave mode, check if we need onboarding (no clone cells yet)
      if (!isWeaveContext()) {
        const hasClones = await cloneManagerStore.hasClones();
        if (!hasClones) {
          // Clear stale data from any previous (wiped) session
          clearDefaultProfile();
          localStorage.removeItem("activeDnaHash");
          appPhase = 'onboarding';
          connected = true;
          return;
        }
      }

      await cloneManagerStore.activeStore.load();
      appPhase = 'ready';
      connected = true;
    } catch (e) {
      initializationError = e;
    }
  });
  let initialSync

  setContext(storeContext, {
    getStore: () => $store,
  });

  setContext(cloneManagerStoreContext, {
    getStore: () => cloneManagerStore,
  });

  setContext(clientContext, {
    getClient: () => client,
  });

  setContext(frameContext, {
    getFrame: () => weClient,
  });

  let createSessionDialog: SessionCrud
  let createSpaceDialog: SpaceCrud
  let cloneManagerDialog: CloneManagerDialog
  let cloneManagerShareDialog: CloneManagerShareDialog

  const doSync=async () => {
    try {
      await $store.sync(undefined);
    } catch (e) {
      console.error("Sync failed, will retry:", e)
    }
  }
  window.addEventListener("beforeunload", function (e) {
  var confirmationMessage = "You are about to leave Emergence!";
  return confirmationMessage;
  });

  const loadStore = async () => {
    if(!$store) return;
    loading = true;

    try {
      await $store.sync()
    } catch (e) {
      console.error("Initial sync failed, continuing:", e)
    }

    // for now everyone is a steward

    if (!isConfigured()) {
      let isSteward = false
      if (!isWeaveContext()) {
        isSteward = true
      } else {
        if (weClient.renderInfo.type === 'applet-view') {
          const toolInstaller = await weClient.toolInstaller(weClient.renderInfo.appletHash);
          if (toolInstaller && encodeHashToBase64(toolInstaller)=== encodeHashToBase64(weClient.renderInfo.appletClient.myPubKey)) {
            isSteward = true
          }
        }
        const accountabilities = await weClient.myAccountabilitiesPerGroup()
        console.log("accountabilities",accountabilities )
      } 
      if (isSteward) {
        $store.setUIprops({amSteward:true})
        await $store.setPane("admin")
      }
    }
    initialSync = setInterval(async ()=>{
      if ($uiProps.amSteward || !isConfigured()) {clearInterval(initialSync)}
      else {
        await doSync()
      }
    }, 10000);
    
    loading = false;
  };

  $: $store, loadStore();

  async function onOnboardingComplete() {
    try {
      await cloneManagerStore.activeCellInfoNormalized.load();
      await cloneManagerStore.activeStore.load();
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }
    appPhase = 'ready';
  }

let sessionSummary = true

</script>

<main>
  {#if connected && appPhase === 'onboarding'}
    <NetworkOnboarding
      cloneManagerStore={cloneManagerStore}
      on:complete={onOnboardingComplete}
    />
  {:else if connected}
    {#if error}
      <span class="notice modal" style="overflow-y:auto;max-height:1000px;max-width:700px;position:absolute; top:60px; left: 0;right: 0;margin: 0 auto; z-index:1000"
      >
        <h3>I'm sorry to say it, but there has been an error ☹️</h3>
        <div style="padding:10px; margin:10px; background:lightcoral;border-radius: 10px;overflow-y:auto;max-height:500px">
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
            Dismiss
          </sl-button>
      </span>
    {/if}
    {#if loading}
    <div class="loading-container">
      <img src="/images/loading.svg" />
      <span class="loading-text">{loadingText ? $loadingText : DEFAULT_SYNC_TEXT}</span>
    </div>
  {:else}
  <profiles-context store="{$store.profilesStore}">
    {#if renderType == RenderType.Session}
      {@const session = $store.getSession(wal.hrl[1])}
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
                on:profile-created={(e) => {
                  if (e.detail?.profile) {
                    saveDefaultProfile({
                      nickname: e.detail.profile.nickname,
                      avatar: e.detail.profile.fields?.avatar,
                    });
                  }
                }}
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
        
        <div class="network-button-overhanging">
          <CloneManagerActiveButton />
        </div>

        <div class="nav">
          <div class="button-group">
            <div id="nav-discover" class="nav-button {pane === "discover" ? "selected":""}"
              title="Discover"
              on:keypress={()=>{$store.setPane('discover')}}
              on:click={()=>{$store.setPane('discover')}}
            >
              <Fa class="nav-icon" icon={faHome} size="2x"/>
              <span class="button-title">Discover</span>
            </div>
            <div id="nav-sessions" class="nav-button {pane.startsWith("sessions")?"selected":""}"
              title="Sessions"
              on:keypress={()=>{$store.setPane('sessions')}}
              on:click={()=>{$store.setPane('sessions')}}
            >
              <Fa class="nav-icon" icon={faCalendar} size="2x"/>
              <span class="button-title">Sessions</span>
            </div>
      
      
            <div id="nav-spaces" class="nav-button {pane.startsWith("spaces")?"selected":""}"
              title={$t?.space.P ?? "Spaces"}
              on:keypress={()=>{$store.setPane('spaces')}}
              on:click={()=>{$store.setPane('spaces')}}
            >
              <Fa class="nav-icon" icon={faMap} size="2x"/>
            <span class="button-title">{$t?.space.P ?? "Spaces"}</span>
            </div>
          </div>
          <div class="button-group">
            <div class="network-button">
                <CloneManagerActiveButton />
            </div>

            {#if $store && $uiProps.amSteward}
              <div id="nav-admin" class="nav-button {pane.startsWith("admin")?"selected":""}"
                title="Admin"
                on:keypress={()=>{$store.setPane('admin')}}
                on:click={()=>{$store.setPane('admin')}}
              >
                <Fa class="nav-icon" icon={faGear} size="2x"/>
              <span class="button-title settings">Settings</span>
              </div>
            {/if}
            <div id="nav-you" class="nav-button {pane=="you"?"selected":""}"
              title="You"
              on:keypress={()=>{$store.setPane('you')}}
              on:dblclick={(e)=>e.stopPropagation()}
              on:click={(e)=>{
                e.stopPropagation()
                if (pane!=="you") $store.setPane('you')
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

        <file-storage-context client={$store.fileStorageClient}>
        {#if store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.ProxyAgent }
        <div class="session-details">
          <ProxyAgentDetail
            on:proxyagent-deleted={()=>$store.closeDetails()}
            on:proxyagent-close={()=>$store.closeDetails()}
            proxyAgentHash={$uiProps.detailsStack[0].hash}>
          </ProxyAgentDetail>
        </div>
        {/if}
        {#if $store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.Space }
        <div class="session-details">
          <SpaceDetail
            on:space-deleted={()=>$store.closeDetails()}
            on:space-close={()=>$store.closeDetails()}
            space={$store.getSpace($uiProps.detailsStack[0].hash)}>
          </SpaceDetail>
        </div>
        {/if}
        {#if $store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.Session }
        <div class="session-details">
          <SessionDetail 
          on:session-deleted={()=>$store.closeDetails()}
          on:session-close={()=>$store.closeDetails()}
          sessionHash={$uiProps.detailsStack[0].hash}></SessionDetail>
        </div>
      {/if}
      {#if $store &&  $uiProps.detailsStack[0] && $uiProps.detailsStack[0].type==DetailsType.Folk }
      <div class="session-details">
          <Folk 
          on:folk-close={()=>$store.closeDetails()}
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
              on:open-slotting={()=>$store.setPane("schedule.slotting")}
            ></ScheduleUpcoming>
          </div>
        {/if}

        {#if pane=="schedule.slotting"}
          <div class="pane">
            <ScheduleSlotting
              on:slotting-close={()=>$store.setPane("admin")}

            ></ScheduleSlotting>
          </div>
        {/if}

        {#if pane=="spaces"}
        <div class="pane sitemap">
          {#if $store.getCurrentSiteMap()}
            <SiteMapDisplay 
              sitemap={$store.getCurrentSiteMap()}
              on:show-all-spaces={()=>$store.setPane("spaces.list")}
              ></SiteMapDisplay>
          {:else}
            <h5>No {$t?.sitemap.S ?? "Site Map"} configured yet</h5>
          {/if}
        </div>
        {/if}

        {#if pane=="spaces.list"}
        <div class="pane spaces">
          <AllSpaces
            on:all-spaces-close={()=>$store.setPane("spaces")}
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
            on:open-slotting={()=>$store.setPane("schedule.slotting")}
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
        {/if}      
        {#if pane=="discover"}
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
  {:else}
    {#if initializationError}
      <div class="init-error">
        <h3>Initialization Error: </h3>
        {initializationError}
      </div>
    {:else}
      <div class="loading"><div class="loader"></div></div>
    {/if}
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

  .network-button {
    height: 100%;
    display: flex;
    align-items: center;
    margin-right: 10px;
  }

  .network-button-overhanging {
    position: absolute;
    bottom: 70px;
    right: 7px;
    z-index: 10;
    border-radius: 15px;
    box-shadow: 0px -10px 15px rgba(0, 0, 0, .15);
  }

@media (min-width: 0px) {
  .network-button {
    display: none;
  }

  .network-button-overhanging {
    display: inline-block;
  }
}

@media (min-width: 480px) {
  .network-button {
    display: flex;
  }

  .network-button-overhanging {
    display: none;
  }
}

@media (min-width: 720px) {
  .event-intro .wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
  }
}

  .init-error {
    display:flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 100px;
  }

  :global(.loading) {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  :global(.loader) {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }
</style>
