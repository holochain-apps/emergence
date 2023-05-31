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

    <div class="pane-header">
        {#if $myProfile.status === "complete"  && $myProfile.value}
        <h3><Avatar agentPubKey={store.myPubKey}></Avatar></h3>
        {:else}<sl-spinner></sl-spinner>
        {/if}
        <div style="display: flex; flex-direction: row; align-self:center">
            <sl-button style="margin-left: 8px;" on:click={() => dialog.show()} circle>
                <Fa icon={faEdit} />
            </sl-button>
        </div>
        <div style="display: flex; flex-direction: row; align-self:center">
            <sl-button style="margin-left: 8px;" on:click={() => deleteCookie("creds")} circle>
                <Fa icon={faPowerOff} />
            </sl-button>
        </div>
        <div style="display: flex; flex-direction: row; align-self:center">
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
        </div>
    </div>

<div class="pane-content flex-center">
    
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
            {#if $agentNotes.get(store.myPubKey).length == 0}
                You haven't created any notes yet.. 
            {/if}
            {#each $agentNotes.get(store.myPubKey) as note}
                <NoteDetail showDeleted={false} showFrame={true} noteHash={note}></NoteDetail>
            {/each}
            
        </sl-tab-panel>
        <sl-tab-panel name="updates">
            <Feed forAgent={store.myPubKey}></Feed>
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
  </style>
  