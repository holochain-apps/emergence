<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
  import { encodeHashToBase64, type AgentPubKey, type Record } from '@holochain/client';
  import { storeContext } from '../../contexts';
  import type { EmergenceStore } from '../../emergence-store';
  import FeedElemDetail from './FeedElemDetail.svelte';

  let store: EmergenceStore = (getContext(storeContext) as any).getStore();

  let error: any = undefined;
  export let forAgent: AgentPubKey| undefined = undefined

  $: agentSessions = store.agentSessions
  $: sessions = forAgent ? $agentSessions.get(forAgent) : undefined
  $: agentSessionsb64 = Array.from(sessions ? sessions : []).map(([s,_])=> encodeHashToBase64(s))
  $: fullFeed = store.feed
  $: uiProps = store.uiProps
  $: agentB64 = forAgent ? encodeHashToBase64(forAgent) : undefined
  $: feed = !forAgent ? $fullFeed.filter(f=>store.filterFeedElem(f,$uiProps.feedFilter)) : $fullFeed.filter(f=> {
      encodeHashToBase64(f.author) == agentB64 ||
      agentSessionsb64.includes(encodeHashToBase64(f.about))
     }
    )
  $: error;

  onMount(async () => {
    await store.fetchFeed();
    if (forAgent)
      await store.fetchAgentStuff(forAgent);
  });

</script>
{#if error}
<span>Error fetching the feed: {error.data.data}.</span>
{:else if feed.length === 0}
<span>No Activity</span>
{:else}
<div class="activity">
  {#each feed.sort((a,b)=>b.timestamp - a.timestamp) as f}
    <div class="feed-item card">
      <FeedElemDetail feedElem={f}></FeedElemDetail>
    </div>
  {/each}
</div>
{/if}

<style>
  .feed-item{
    margin-bottom: 8px; 
    width:100%; 
    display: flex;
    justify-content: left;
  }

  .activity {
    width: 100%;
  }
</style>