<script lang="ts">
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import type SlTabGroup from  '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
    import Fa from 'svelte-fa'
    import { faEdit, faPowerOff } from '@fortawesome/free-solid-svg-icons';

    import type {  Record } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import NoteDetail from './NoteDetail.svelte';
    import SessionSummary from './SessionSummary.svelte';
    import Avatar from './Avatar.svelte';
    import Feed from './Feed.svelte';
    import { getCookie, setCookie, deleteCookie } from 'svelte-cookie';

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let steward: SlCheckbox
    let debuging: SlCheckbox
    let sensing: SlCheckbox
    let showDeletedSession = false

    onMount(async () => {
        await store.fetchAgentStuff(store.myPubKey)
        tabs.show($uiProps.youPanel)
    });

    $: myProfile = store.profilesStore.myProfile
    $: agentNotes = store.agentNotes
    $: agentSessions = store.agentSessions
    $: uiProps = store.uiProps
    let dialog: SlDialog
    let tabs : SlTabGroup

</script>
<sl-dialog style="--width: 375px;" bind:this={dialog} label="Edit Profile">
    <update-profile on:cancel-edit-profile={()=>dialog.hide()} on:profile-updated={()=>dialog.hide()}></update-profile>
</sl-dialog>


        <!-- <div style="display: flex; flex-direction: row; align-self:center">
            <sl-checkbox
                bind:this={steward}
                checked={$uiProps.amSteward}
                on:sl-change={e => { store.setUIprops({amSteward:steward.checked})} }
                >Steward
            </sl-checkbox>
            <sl-checkbox
                bind:this={debuging}
                checked={$uiProps.debuggingEnabled}
                on:sl-change={e => { store.setUIprops({debuggingEnabled:debuging.checked})} }
                >Enable Debugging
            </sl-checkbox>
        </div> -->

<div class="pane-content flex-center">
    
    {#if $myProfile.status === "complete"  && $myProfile.value}
    {:else}<sl-spinner></sl-spinner>
    {/if}
    
    <sl-tab-group
        bind:this={tabs}
        on:sl-tab-show={(e)=>store.setUIprops({youPanel:e.detail.name})}
    >
        <sl-tab slot="nav" panel="profile">Profile</sl-tab>
        <sl-tab slot="nav" panel="activity">Activity</sl-tab>
        <sl-tab slot="nav" panel="notes">Notes</sl-tab>
        <sl-tab slot="nav" panel="sessions">Sessions</sl-tab>
        <sl-tab-panel name="sessions">
            {#if $agentSessions.get(store.myPubKey).size == 0}
                You haven't created or marked interest in any sessions yet.. 
            {/if}
            {#each Array.from($agentSessions.get(store.myPubKey).keys()).map(s =>store.getSession(s)) as session}
                {#if session && (!session.record.entry.trashed || showDeletedSession)}
                <SessionSummary 
                showTags={true} showSlot={true} allowSetIntention={true} session={session}></SessionSummary>
                {/if}
            {/each}


        </sl-tab-panel>
        <sl-tab-panel name="notes">
            <div class="wrapper">
            {#if $agentNotes.get(store.myPubKey).length == 0}
                You haven't created any notes yet.. 
            {/if}
            {#each $agentNotes.get(store.myPubKey) as note}
                <NoteDetail showDeleted={false} showFrame={true} noteHash={note}></NoteDetail>
            {/each}
            </div>
        </sl-tab-panel>
        <sl-tab-panel name="activity">
            <Feed forAgent={store.myPubKey}></Feed>
        </sl-tab-panel>
        <sl-tab-panel name="profile" class="profile">
            <h3><Avatar agentPubKey={store.myPubKey}></Avatar></h3>
            <sl-button style="margin-left: 8px;" on:click={() => dialog.show()} circle>
                <Fa icon={faEdit} />
            </sl-button>
        </sl-tab-panel>
    </sl-tab-group>

</div>

<style>
    sl-checkbox {
      margin-right:15px;
    }

    :global(sl-tab-group) {
        text-align: center;
        max-width: 720px;
        margin: 0 auto;
    }
    sl-tab-group {
        max-width: 100%;
    }
    
    .pane-content {
        padding-top: 0;
    }

    .activity {
        padding: 0 10px;
    }
    .wrapper {
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
    }
    sl-tab-group {
        --track-color: white;
        max-width: 100%;
    }
    sl-tab[aria-selected="true"] {
        border: 1px solid red;
    }


    sl-tab-group::part(active-tab-indicator) {
        border: 1px solid rgba(66, 118, 217, .4);
    }

    sl-tab::part(active-tab) { 
        color: white;
        background: linear-gradient(129.46deg, #5833CC 8.45%, #397ED9 93.81%);
    }

    sl-tab-group::part(nav) {
    background: linear-gradient(180deg, rgba(86, 94, 109, 0.05) 0%, rgba(86, 94, 109, 0.26) 100%);
    border-bottom: none;
    }

  </style>
  