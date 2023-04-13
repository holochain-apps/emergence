<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
    import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
    import '@shoelace-style/shoelace/dist/components/tab/tab.js';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import Fa from 'svelte-fa'
    import { faEdit } from '@fortawesome/free-solid-svg-icons';

    import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
  import NoteDetail from './NoteDetail.svelte';
  import SessionSummary from './SessionSummary.svelte';
  
    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
  
    onMount(async () => {
        store.fetchFeed()
    });
    let tab = "notes"
    let editProfile = false
    $: myProfile = store.profilesStore.myProfile
    $: myNotes = store.myNotes
    $: mySessions = store.mySessions

</script>
{#if $myProfile.status === "complete"  && $myProfile.value}
    <div class="header"><h3>{$myProfile.value.nickname}</h3>
        <sl-button style="margin-left: 8px;" size=small on:click={() => editProfile=true} circle>
            <Fa icon={faEdit} />
        </sl-button>
    </div>
    {#if editProfile}
        <p><b>Emergence</b> is a decentralized hApp for discovery, scheduling, connecting and remembering </p>
        <update-profile on:cancel-edit-profile={()=>editProfile = false} on:profile-updated={()=>editProfile = false}></update-profile>
    {:else}
    <sl-tab-group>
        <sl-tab slot="nav" panel="notes">SynapShots
        </sl-tab>
        <sl-tab slot="nav" panel="sessions">Sessions
        </sl-tab>
        <sl-tab slot="nav" panel="updates">Updates</sl-tab>
    
        <sl-tab-panel name="notes">
            {#each $myNotes as note}
            <NoteDetail noteHash={note}></NoteDetail>
            {/each}
            
        </sl-tab-panel>
        <sl-tab-panel name="sessions">

            {#each Array.from($mySessions.keys()) as session}
            <SessionSummary session={store.getSession(session)}></SessionSummary>
            {/each}


        </sl-tab-panel>
        <sl-tab-panel name="updates">
            TBD

        </sl-tab-panel>
    </sl-tab-group>
    {/if}
{:else}
    <sl-spinner></sl-spinner>
{/if}
<style>
    .header{
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: solid 1px;
    }
</style>