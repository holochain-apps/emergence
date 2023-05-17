<script lang="ts">
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import type SlTabGroup from  '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

    import Fa from 'svelte-fa'
    import { faCircleArrowLeft } from '@fortawesome/free-solid-svg-icons';

    import type { AgentPubKey } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import NoteDetail from './NoteDetail.svelte';
    import SessionSummary from './SessionSummary.svelte';
    import Avatar from './Avatar.svelte';
    import Feed from './Feed.svelte';
    import Profile from './Profile.svelte';
    import Sync from './Sync.svelte';
    import { slide } from 'svelte/transition';

    const dispatch = createEventDispatcher();
    export let agentPubKey: AgentPubKey

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let showDeletedSession = false

    onMount(async () => {
        await store.fetchAgentStuff(agentPubKey)
        tabs.show($uiProps.youPanel)
    });

    $: profile = store.profilesStore.profiles.get(agentPubKey)
    $: agentNotes = store.agentNotes
    $: agentSessions = store.agentSessions
    $: uiProps = store.uiProps
    let tabs : SlTabGroup

</script>
{#if $profile.status === "complete"  && $profile.value}
    <div transition:slide={{ axis: 'x', duration: 400 }} class="pane-header">
        <div class="controls">
            <sl-button size=small on:click={() => { dispatch('folk-close') } } circle>
              <Fa icon={faCircleArrowLeft} />
            </sl-button>
        </div>
      
        
        <Profile agentPubKey={agentPubKey}></Profile>

     
        <div style="display: flex; flex-direction: row; align-self:center">
            <div style="margin-left: 8px;">
                <Sync agentPubKey={agentPubKey}></Sync>
            </div>
        </div>
    </div>

<div  class="pane-content flex-center">
    <sl-tab-group
        bind:this={tabs}
        on:sl-tab-show={(e)=>store.setUIprops({youPanel:e.detail.name})}
    >
            <sl-tab slot="nav" panel="sessions">Sessions
            </sl-tab>
            <sl-tab slot="nav" panel="notes">Notes
            </sl-tab>
            <sl-tab slot="nav" panel="updates">Updates</sl-tab>
        <sl-tab-panel name="sessions">
            {#if $agentSessions.get(agentPubKey).size == 0}
                No sessions created or going/interested 
            {/if}

            {#each Array.from($agentSessions.get(agentPubKey).keys()).map(s =>store.getSession(s)) as session}
                {#if !session.record.entry.trashed || showDeletedSession}
                <SessionSummary 
                showTags={true} showSlot={true} allowSetIntention={true} session={session}></SessionSummary>
                {/if}
            {/each}


        </sl-tab-panel>
        <sl-tab-panel name="notes">
            {#if $agentNotes.get(agentPubKey).length == 0}
                You haven't created any notes yet.. 
            {/if}
            {#each $agentNotes.get(agentPubKey) as note}
                <NoteDetail showDeleted={false} showFrame={true} noteHash={note}></NoteDetail>
            {/each}
            
          
        </sl-tab-panel>
        <sl-tab-panel name="updates">
            <Feed forAgent={agentPubKey}></Feed>
        </sl-tab-panel>
    </sl-tab-group>

</div>
{:else}<sl-spinner></sl-spinner>
{/if}
<style>
  
  </style>
  