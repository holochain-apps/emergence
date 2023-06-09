<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import type { EntryHash } from '@holochain/client';
    import type { DownloadedFile } from './types';



    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    export let fileHash: EntryHash
    let loading = true;
    let file: DownloadedFile | undefined
    let img: HTMLImageElement | undefined;

    onMount(async () => {
        file = await store.downloadFile(fileHash);


        loading = false
    });
    const showFile = () => {
        return `fileType:${file.file.type}, fileName:${file.file.name}`
    }
</script>

{#if loading}
    <div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <sl-spinner></sl-spinner>
    </div>
{:else}
    <div>
        {#if file}
        <div >
            {#if file.file.type.startsWith("image/")}
                <img style="width:100%" bind:this={img} src="data:{file.file.type};base64,{file.data}">
            {:else if file.file.type.startsWith("video/")}
                <video style="width:100%" src="data:{file.file.type};base64,{file.data}" controls></video>
            {:else if file.file.type.startsWith("audio/")}
                <audio style="width:100%" src="data:{file.file.type};base64,{file.data}" controls></audio>
            {:else if file.file.type.startsWith("text/")}
                <div>{file.data}</div>
            {:else}
                <div>No preview for file-type</div>
            {/if}
        </div>
        {/if}
        {showFile()}
    </div>
{/if}
<style>

</style>  