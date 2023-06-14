<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { encodeHashToBase64 } from '@holochain/client';
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import { DetailsType, sessionInterestToString, type Info, type ProxyAgent } from './types';
  import { faInfoCircle, faSearch } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;

  $: agentSessions = store.agentSessions
  $: allProfiles = store.profilesStore.allProfiles
  $: allPeople = $allProfiles.status=== "complete" ? Array.from($allProfiles.value.entries()) : []
  $: uiProps = store.uiProps
  $: proxyAgents = store.proxyAgents
  $: people = filteredPeople(allPeople, $proxyAgents, $uiProps)
  $: error;
  $: allSessions = store.sessions;

  const filteredPeople = (allPeople, proxyAgents: Array<Info<ProxyAgent>>, uiProps) => {
    const detailedPeople = allPeople.map(([key,profile])=> {
      return {type:'Agent', hash: key, nickname: profile.nickname, bio: profile.fields.bio, location: profile.fields.location}
    })

    for (const p of proxyAgents) {
      const e = p.record.entry
      detailedPeople.unshift({
        type:'ProxyAgent', 
        hash: p.original_hash, 
        nickname: e.nickname, 
        bio: e.bio, 
        location: e.location,
        avatarImage: e.pic
      })
    }

    const people =  detailedPeople.filter(p=> store.filterPeople(p,uiProps.peopleFilter)).sort(sortPeople)
    return people
  }
  const sortPeople = (b,a)=>{
            if (a.nickname > b.nickname) {
                return -1;
            }
            if (b.nickname > a.nickname) {
                return 1;
            }
            return 0;
        }

  onMount(async () => {
  });

</script>
{#if error}
<span>Error fetching the people: {error.data.data}.</span>
{:else}
  <div class="center-row search-bar">
    <span class="search-icon"><Fa icon={faSearch} /></span>
    <sl-input
      value={$uiProps.peopleFilter.keyword}
      placeholder="Search by name, attribute, interest, description"
      on:input={e => { store.setUIprops({peopleFilter: {keyword:e.target.value}})}}
    ></sl-input>
  </div> 

  {#if people.length === 0}
  <span>No People!</span>
  {:else}

  <div class="people">
    {#each people as {type, hash, bio, location, nickname, avatarImage}}
      <div class="person card clickable"
      on:click={(e)=>{
        store.openDetails(type == "ProxyAgent" ? DetailsType.ProxyAgent : DetailsType.Folk, hash)
        e.stopPropagation()
    }}    >
        <div class="details">
          {#if type == "ProxyAgent"}
            <div style="margin-right:10px">
              {#if avatarImage}
                <show-image style={`width:50px`} image-hash={encodeHashToBase64(avatarImage)}></show-image>
              {:else}
                <holo-identicon disable-tooltip={true} disable-copy={true} size={50} hash={hash}></holo-identicon>
              {/if}
            </div>
          {:else}
              <agent-avatar disable-tooltip={true} disable-copy={true} size={50} agent-pub-key="{encodeHashToBase64(hash)}"></agent-avatar>
              
            <div class="info">
              <div class="name">{nickname}</div>
              <div class="location">{#if location}<span>{location}</span>{/if}</div>
            </div>
          {/if}
          {#if type == "ProxyAgent"}
            <sl-tooltip >
              <div slot="content" style="color:white">
                This person is a proxy agent, i.e. they don't have an account on the system and were added by administrators, likely because they are a session leader.
              </div>
              <span style="display:flex; align-items:center; font-weight:bold" title="Proxy agent">{nickname} <Fa style="margin-left:5px" icon={faInfoCircle}/></span>
            </sl-tooltip>
          {/if}
        </div>
        <div style="display:flex;flex-direction:row;align-items: left;margin-left:20px;">
          <!-- {#if type== "ProxyAgent"} -->
            <span style="font-weight:strong">Hosting:</span>
            {#each $allSessions.filter((s) =>
              s.record.entry.leaders.find(
                (l) =>
                  encodeHashToBase64(l.hash) ==
                  encodeHashToBase64(hash)
              )
            ) as session}
             <div style="margin-left:5px">{ session.record.entry.title} </div>

            {/each}

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
    {/each}
  </div>
  {/if}
{/if}

<style>
  .person{
    margin-bottom: 8px; 
    padding: 10px;
    width:100%; 
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
    opacity: .5;
  }

  .info {
    display: flex;
    flex-direction: column;
    padding-left: 10px;
    justify-content: left;
    text-align: left;
  }

  .search-bar {
    width: 100%;
    max-width: 720px;
    margin: 10px auto 20px auto;
    position: relative;
  }

  .search-bar sl-input {
    width: 100%;
  }

  sl-input {
    margin-left: 15px;
  }
</style>