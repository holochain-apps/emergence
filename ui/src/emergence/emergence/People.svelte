<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import { encodeHashToBase64 } from '@holochain/client';
  import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
  import { DetailsType, sessionInterestToString } from './types';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;

  $: agentSessions = store.agentSessions
  $: allProfiles = store.profilesStore.allProfiles
  $: allPeople = $allProfiles.status=== "complete" ? Array.from($allProfiles.value.entries()) : []
  $: uiProps = store.uiProps
  $: people = allPeople //filteredPeople(allPeople, $uiProps)
  $: error;
  $: tags = store.allTags

  const filteredPeople = (allPeople, uiProps) => {
     const people =  allPeople.filter(p=> true)
    return people
  }
  const sortPeople = (a,b)=>b.timestamp - a.timestamp

  onMount(async () => {
  });

</script>
{#if error}
<span>Error fetching the people: {error.data.data}.</span>
{:else if people.length === 0}
<span>No People!</span>
{:else}
<div class="people">
  {#each people as [agentPubKey, profile]}
    <div class="person card"
    on:click={(e)=>{
      store.openDetails(DetailsType.Folk,agentPubKey)
      e.stopPropagation()
  }}    >
      <div style="display:flex;flex-direction:column;align-items:center;width:75px;">
        <agent-avatar disable-tooltip={true} disable-copy={true} size={50} agent-pub-key="{encodeHashToBase64(agentPubKey)}"></agent-avatar>
        {profile.nickname}
      </div>
      <div style="display:flex;flex-direction:column;align-items: left;">
        {#if profile.fields.location}<span>Location: {profile.fields.location}</span>{/if}
        {#if profile.fields.bio}<span>Bio: {profile.fields.bio}</span>{/if}
      </div>
      <div style="display:flex;flex-direction:row;align-items: left;margin-left:20px">
        {#each $agentSessions.get(agentPubKey) ? Array.from($agentSessions.get(agentPubKey)):  [] as [session, interest] }
          <div style="margin-left:5px">{store.getSession(session).record.entry.title}, </div>
        {/each}
      </div>
      </div>
  {/each}
</div>
{/if}

<style>
  .person{
    margin-bottom: 8px; 
    padding: 10px;
    width:100%; 
    display: flex;
    justify-content: left;
  }

  .people {
    width: 100%;
  }
</style>