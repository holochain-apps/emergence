<script lang="ts">
    import { onMount, getContext, createEventDispatcher, } from 'svelte';
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
    import Feed from './Feed.svelte';
    import { slide } from 'svelte/transition';
    import Avatar from './Avatar.svelte';

    const dispatch = createEventDispatcher();
    export let agentPubKey: AgentPubKey

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let showDeletedSession = false

    onMount(async () => {
        if (agentPubKey === undefined) {
            throw new Error(`The agentPubKey is required for the Folk element`);
        }
        await store.fetchAgentStuff(agentPubKey)
        if (tabs)
            tabs.show($uiProps.youPanel)
    });

    $: profile = store.profilesStore.profiles.get(agentPubKey)
    $: agentNotes = store.agentNotes
    $: agentSessions = store.agentSessions
    $: uiProps = store.uiProps
    let tabs : SlTabGroup

</script>
{#if $profile.status === "complete"  && $profile.value && $agentSessions.get(agentPubKey)}
    <div transition:slide={{ axis: 'x', duration: 400 }} class="pane-header">
        <div class="controls">
            <sl-button on:click={() => { dispatch('folk-close') } } circle>
              <Fa icon={faCircleArrowLeft} />
            </sl-button>
        </div>

    </div>

<div  class="pane-content flex-center card">
          
    <div class="folk-profile">
        <Avatar agentPubKey={agentPubKey} ></Avatar>
        {#if $profile.value.entry.fields.location}<div class="location">{$profile.value.entry.fields.location}</div>{/if}
        {#if $profile.value.entry.fields.bio}<div class="bio">{$profile.value.entry.fields.bio}</div>{/if}
    </div>
    <sl-tab-group
        bind:this={tabs}
        on:sl-tab-show={(e)=>store.setUIprops({youPanel:e.detail.name})}
    >
        <sl-tab slot="nav" panel="updates">Updates</sl-tab>
        <sl-tab slot="nav" panel="notes">Notxes</sl-tab>
        <sl-tab slot="nav" panel="sessions">Sessions</sl-tab>
        <sl-tab-panel name="sessions">
            <div class="wrapper">
                {#if $agentSessions.get(agentPubKey).size == 0}
                    No sessions created or going/interested 
                {/if}

                {#each Array.from($agentSessions.get(agentPubKey).keys()).map(s =>store.getSession(s)) as session}
                    {#if session && (!session.record.entry.trashed || showDeletedSession)}
                    <SessionSummary 
                    showTags={true} showSlot={true} allowSetIntention={true} session={session}></SessionSummary>
                    {/if}
                {/each}
            </div>
        </sl-tab-panel>
        <sl-tab-panel name="notes">
            <div class="wrapper">
                {#if $agentNotes.get(agentPubKey).length == 0}
                    No notes created
                {/if}
                {#each $agentNotes.get(agentPubKey) as note}
                    <NoteDetail showDeleted={false} showFrame={true} noteHash={note}></NoteDetail>
                {/each}
            </div>
        </sl-tab-panel>
        <sl-tab-panel name="updates">
            <div class="wrapper">
                <Feed forAgent={agentPubKey}></Feed>
            </div>
        </sl-tab-panel>
    </sl-tab-group>

</div>
{:else}<sl-spinner></sl-spinner>
{/if}
<style>

.folk-profile {
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    min-width: 200px;
}  

sl-tab-group {
    width: 100%;
}

.card {
    flex-direction: column;
}

.pane-header {
    padding-top: 10px;
    padding-bottom: 10px;
    position: sticky;
    top: 0;
}

.pane-content {
    padding-bottom: 0;
    margin-bottom: 100px;
}

.wrapper {
    padding: 15px;
}

.location {
    opacity: .6;
    font-size: 12px;
}
</style>
  