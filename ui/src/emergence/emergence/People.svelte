<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import "@holochain-open-dev/file-storage/dist/elements/show-image.js";
  import { DetailsType, type Info, type ProxyAgent } from './types';
  import { faSearch } from '@fortawesome/free-solid-svg-icons';
  import Fa from 'svelte-fa';
  import PersonSummary from './PersonSummary.svelte';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;

  $: allProfiles = store.profilesStore.allProfiles
  $: allPeople = $allProfiles.status=== "complete" ? Array.from($allProfiles.value.entries()) : []
  $: uiProps = store.uiProps
  $: proxyAgents = store.proxyAgents
  $: people = filteredPeople(allPeople, $proxyAgents, $uiProps)
  $: error;

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
<span>Error fetching the people: {error}.</span>
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
    {#each people as person}
      <PersonSummary
        person={person}
        on:person-selected={()=>{
          store.openDetails(
          person.type == "ProxyAgent" ? DetailsType.ProxyAgent : DetailsType.Folk,
          person.hash
        );
  }}
      ></PersonSummary>
    {/each}
  </div>
  {/if}
{/if}

<style>

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