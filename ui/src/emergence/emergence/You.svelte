<script lang="ts">
    import { onMount, getContext, createEventDispatcher } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
    import type SlCheckbox from '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
    import Fa from 'svelte-fa'
    import { faEdit } from '@fortawesome/free-solid-svg-icons';

    import type {  Record } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import NoteDetail from './NoteDetail.svelte';
    import SessionSummary from './SessionSummary.svelte';
    import Avatar from './Avatar.svelte';
    import Feed from './Feed.svelte';

    const dispatch = createEventDispatcher();

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    let steward: SlCheckbox

    onMount(async () => {
        store.fetchMyStuff()
    });
    let tab = "notes"

    $: myProfile = store.profilesStore.myProfile
    $: myNotes = store.myNotes
    $: mySessions = store.mySessions
    $: amSteward = store.amSteward
    let dialog
</script>

{#if $myProfile.status === "complete"  && $myProfile.value}
    <div class="pane-header"><h3><Avatar agentPubKey={store.myPubKey}></Avatar></h3>
        <sl-checkbox
        bind:this={steward}
        checked={$amSteward}
        on:sl-change={e => { store.setSelfSteward(steward.checked)} }
    >Steward</sl-checkbox>
        <sl-button style="margin-left: 8px;" size=small on:click={() => dialog.show()} circle>
            <Fa icon={faEdit} />
        </sl-button>
    </div>
{/if}

<div class="pane-content">
{#if $myProfile.status === "complete"  && $myProfile.value}

    
        <sl-dialog style="--width: 375px;" bind:this={dialog} label="Edit Profile">
            <update-profile on:cancel-edit-profile={()=>dialog.hide()} on:profile-updated={()=>dialog.hide()}></update-profile>
        </sl-dialog>
    
    <sl-tab-group>
        <sl-tab slot="nav" panel="sessions">Sessions
        </sl-tab>
        <sl-tab slot="nav" panel="notes">Notes
        </sl-tab>
        <sl-tab slot="nav" panel="updates">Updates</sl-tab>
    
        <sl-tab-panel name="sessions">
            {#if $mySessions.size == 0}
                You haven't created or marked interest in any sessions yet.. 
            {/if}

            {#each Array.from($mySessions.keys()) as session}
            <SessionSummary 
                on:session-selected={(event)=>{dispatch('session-selected', event.detail)}} 
            showTags={true} showSlot={true} allowSetIntention={true} session={store.getSession(session)}></SessionSummary>
            {/each}


        </sl-tab-panel>
        <sl-tab-panel name="notes">
            {#if $myNotes.length == 0}
                You haven't created any notes yet.. 
            {/if}
            {#each $myNotes as note}
                <NoteDetail noteHash={note}></NoteDetail>
            {/each}
            
        </sl-tab-panel>
        <sl-tab-panel name="updates">
            <Feed forMe={true}></Feed>
        </sl-tab-panel>
    </sl-tab-group>
   
{:else}
    <sl-spinner></sl-spinner>
{/if}
</div>

<style>
</style>