<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import '@shoelace-style/shoelace/dist/components/button/button.js';
  import '@shoelace-style/shoelace/dist/components/input/input.js';
  import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
  import SvgIcon from './SvgIcon.svelte';
  import type { CloneManagerStore } from "../../stores/clone-manager-store";
  import { decodeDnaJoiningInfo } from "./dnaJoiningInfo";
  import { loadDefaultProfile } from "./defaultProfile";
  import { get } from "svelte/store";

  export let cloneManagerStore: CloneManagerStore;

  const dispatch = createEventDispatcher();

  let mode: 'choose' | 'create' | 'join' = 'choose';
  let networkName = "";
  let joiningCode = "";
  let saving = false;
  let error: string | undefined;
  let useDefaultProfile = true;

  $: createValid = networkName.length > 0;
  $: joinValid = joiningCode.length > 0;
  $: hasDefaultProfile = loadDefaultProfile() !== null;

  async function applyDefaultProfile() {
    const dp = loadDefaultProfile();
    if (!dp) return;
    await cloneManagerStore.activeCellInfoNormalized.load();
    await cloneManagerStore.activeStore.load();
    const store = get(cloneManagerStore.activeStore);
    if (!store) return;
    try {
      await store.profilesStore.client.createProfile({
        nickname: dp.nickname,
        fields: {},
      });
    } catch (e) {
      console.error("Failed to apply default profile:", e);
    }
  }

  async function handleCreate() {
    saving = true;
    error = undefined;
    try {
      const cloneCell = await cloneManagerStore.create(networkName);
      cloneManagerStore.activate(cloneCell.cell_id);
      cloneManagerStore.needsOnboarding.set(false);
      if (useDefaultProfile && hasDefaultProfile) {
        await applyDefaultProfile();
      }
      dispatch('complete');
    } catch (e) {
      error = `${e}`;
    }
    saving = false;
  }

  async function handleJoin() {
    saving = true;
    error = undefined;
    try {
      const info = decodeDnaJoiningInfo(joiningCode);
      const cloneCell = await cloneManagerStore.join(info.name, info.networkSeed);
      cloneManagerStore.activate(cloneCell.cell_id);
      cloneManagerStore.needsOnboarding.set(false);
      if (useDefaultProfile && hasDefaultProfile) {
        await applyDefaultProfile();
      }
      dispatch('complete');
    } catch (e) {
      error = `${e}`;
    }
    saving = false;
  }
</script>

<div class="onboarding">
  <div class="logo-area">
    <img src="/android-chrome-512x512.png" alt="Emergence" />
  </div>

  <h2>Welcome to Emergence</h2>
  <p class="subtitle">Get started by creating a new network or joining an existing one.</p>

  {#if mode === 'choose'}
    <div class="choices">
      <div class="choice-card" on:click={() => mode = 'create'} on:keydown={() => mode = 'create'}>
        <SvgIcon icon="faSquarePlus" size="32px" color="#fff"/>
        <h3>Create a Network</h3>
        <p>Start a new collaboration space</p>
      </div>
      <div class="choice-card" on:click={() => mode = 'join'} on:keydown={() => mode = 'join'}>
        <SvgIcon icon="personMail" size="32px" color="#fff"/>
        <h3>Join a Network</h3>
        <p>Enter a joining code from someone else</p>
      </div>
    </div>

  {:else if mode === 'create'}
    <div class="form">
      <div class="form-field">
        <label>Network Name</label>
        <sl-input
          maxlength="60"
          value={networkName}
          placeholder="e.g. My Conference"
          on:input={e => networkName = e.target.value}
        ></sl-input>
      </div>

      {#if hasDefaultProfile}
        <sl-checkbox checked={useDefaultProfile} on:sl-change={e => useDefaultProfile = e.target.checked} style="margin-bottom: 10px; --sl-color-text-primary: #d0d0e0;">
          Use default profile
        </sl-checkbox>
      {/if}

      {#if error}
        <div class="error">Error: {error}</div>
      {/if}

      <div class="controls">
        <sl-button on:click={() => { mode = 'choose'; error = undefined; }}>Back</sl-button>
        <sl-button
          variant="primary"
          disabled={!createValid || saving}
          on:click={handleCreate}
        >
          {#if saving}
            <div class="spinning"><SvgIcon icon="faSpinner" /></div>
          {:else}
            Create
          {/if}
        </sl-button>
      </div>
    </div>

  {:else if mode === 'join'}
    <div class="form">
      <div class="form-field">
        <label>Joining Code</label>
        <sl-input
          value={joiningCode}
          placeholder="Paste your joining code here"
          on:input={e => joiningCode = e.target.value}
        ></sl-input>
      </div>

      {#if hasDefaultProfile}
        <sl-checkbox checked={useDefaultProfile} on:sl-change={e => useDefaultProfile = e.target.checked} style="margin-bottom: 10px; --sl-color-text-primary: #d0d0e0;">
          Use default profile
        </sl-checkbox>
      {/if}

      {#if error}
        <div class="error">Error: {error}</div>
      {/if}

      <div class="controls">
        <sl-button on:click={() => { mode = 'choose'; error = undefined; }}>Back</sl-button>
        <sl-button
          variant="primary"
          disabled={!joinValid || saving}
          on:click={handleJoin}
        >
          {#if saving}
            <div class="spinning"><SvgIcon icon="faSpinner" /></div>
          {:else}
            Join
          {/if}
        </sl-button>
      </div>
    </div>
  {/if}
</div>

<style>
  .onboarding {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #1a1a2e;
    color: #f0f0f0;
    padding: 40px;
  }

  .logo-area {
    margin-bottom: 20px;
    width: 200px;
  }

  .logo-area img {
    width: 100%;
  }

  h2 {
    font-size: 28px;
    margin: 0 0 8px 0;
    color: #ffffff;
  }

  .subtitle {
    font-size: 16px;
    margin: 0 0 40px 0;
    color: #b0b0c0;
  }

  .choices {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .choice-card {
    background: #2a2a4a;
    border: 1px solid #4a4a6a;
    border-radius: 12px;
    padding: 30px;
    width: 220px;
    text-align: center;
    cursor: pointer;
    transition: all 0.25s ease;
  }

  .choice-card:hover {
    background: #3a3a5a;
    border-color: #6a6a9a;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  }

  .choice-card h3 {
    margin: 15px 0 8px 0;
    font-size: 18px;
    color: #ffffff;
  }

  .choice-card p {
    margin: 0;
    font-size: 14px;
    color: #a0a0b8;
  }

  .form {
    background: #2a2a4a;
    border: 1px solid #4a4a6a;
    border-radius: 12px;
    padding: 30px;
    width: 400px;
    max-width: 90vw;
  }

  .form-field {
    margin-bottom: 20px;
  }

  .form-field label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    font-size: 14px;
    color: #d0d0e0;
  }

  .controls {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .error {
    color: #ff6b6b;
    margin-top: 10px;
    font-size: 14px;
  }
</style>
