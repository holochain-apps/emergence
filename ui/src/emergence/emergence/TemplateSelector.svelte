<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import type SlDialog from '@shoelace-style/shoelace/dist/components/dialog/dialog';
import { DateInput } from 'date-picker-svelte';
import { templates, computeWindowTimestamps, type Template } from './templates';

const dispatch = createEventDispatcher();

let dialog: SlDialog;
let selectedTemplate: Template | null = null;
let startDate: Date = new Date();

onMount(() => {
  startDate.setHours(0, 0, 0, 0);
});

export const open = () => {
  selectedTemplate = null;
  startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  dialog.show();
};

const selectTemplate = (template: Template) => {
  selectedTemplate = template;
};

const applyTemplate = () => {
  if (!selectedTemplate || !startDate) return;

  const importData = computeWindowTimestamps(selectedTemplate, startDate);
  const data = {
    maps: importData.maps,
    windows: importData.windows,
    spaces: selectedTemplate.spaces ?? [],
    sessions: selectedTemplate.sessions ?? [],
    notes: selectedTemplate.notes ?? [],
    sessionTypes: selectedTemplate.sessionTypes,
    amenities: selectedTemplate.amenities,
    spaceTerm: selectedTemplate.spaceTerm,
    sitemapTerm: selectedTemplate.sitemapTerm,
  };

  dispatch('apply-template', data);
  dialog.hide();
};
</script>

<sl-dialog bind:this={dialog} label="Choose Event Template">
  <div class="template-selector">
    {#if !selectedTemplate}
      <div class="templates-list">
        {#each templates as template}
          <button
            class="template-card"
            on:click={() => selectTemplate(template)}
          >
            <h4>{template.name}</h4>
            <p>{template.description}</p>
            <div class="template-details">
              <span>{template.windows.length} time slots</span>
              <span>{template.maps.length} site map{template.maps.length !== 1 ? 's' : ''}</span>
            </div>
          </button>
        {/each}
      </div>
    {:else}
      <button class="template-card selected" on:click={() => selectedTemplate = null}>
        <h4>{selectedTemplate.name}</h4>
        <p>{selectedTemplate.description}</p>
        <div class="template-details">
          <span>{selectedTemplate.windows.length} time slots</span>
          <span>{selectedTemplate.maps.length} site map{selectedTemplate.maps.length !== 1 ? 's' : ''}</span>
          <span class="change-link">Change</span>
        </div>
      </button>
      <div class="date-section">
        <label>Event Start Date:</label>
        <DateInput
          format="yyyy-MM-dd"
          placeholder="Select start date"
          closeOnSelection={true}
          bind:value={startDate}
        />
      </div>
    {/if}

    <div class="actions">
      <sl-button on:click={() => dialog.hide()}>Cancel</sl-button>
      <sl-button
        variant="primary"
        disabled={!selectedTemplate || !startDate}
        on:click={applyTemplate}
      >Apply Template</sl-button>
    </div>
  </div>
</sl-dialog>

<style>
  .template-selector {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 128px;
  }

  .templates-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .template-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .template-card:hover {
    border-color: #888;
  }

  .template-card.selected {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .template-card h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
  }

  .template-card p {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: #666;
  }

  .template-details {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #888;
  }

  .change-link {
    margin-left: auto;
    color: #3b82f6;
    text-decoration: underline;
  }

  .date-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .date-section label {
    font-weight: 500;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
</style>
