<script lang="ts">
    import { onMount, getContext } from 'svelte';
    import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
    import { storeContext } from '../../contexts';
    import type { EmergenceStore } from '../../emergence-store';
    import type { EntryHash } from '@holochain/client';
    import { fromUint8Array } from "js-base64";

    let store: EmergenceStore = (getContext(storeContext) as any).getStore();
    export let fileHash: EntryHash
    let loading = true;
    let file: File | undefined
    let picB64: string | undefined
    let videoB64: string | undefined
    let audioB64: string | undefined
    let plainText: string | undefined
    let img: HTMLImageElement | undefined;

    onMount(async () => {
        file = await store.downloadFile(fileHash);
        const data = await file.arrayBuffer();
        switch (file.type) {
            case "image/jpeg":
            case "image/png":
            case "image/gif":
            case "image/bmp":
            case "image/svg":
                picB64 = fromUint8Array(new Uint8Array(data))
                break;
            case "video/mp4":
            case "video/mp4":
                videoB64 = fromUint8Array(new Uint8Array(data))
                break;
            case "audio/mpeg":
            case "audio/x-aiff":
                audioB64 = fromUint8Array(new Uint8Array(data))

                break
            case "text/plain":
                var enc = new TextDecoder("utf-8");
                plainText = enc.decode(data)
                break;
        }

        loading = false
    });
    const showFile = () => {
        return `fileType:${file.type}, fileName:${file.name}`
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
            {#if picB64}
                <img style="width:100%" bind:this={img} src="data:{file.type};base64,{picB64}">
            {:else if videoB64}
                <video style="width:100%" src="data:{file.type};base64,{videoB64}" controls></video>
            {:else if audioB64}
                <audio style="width:100%" src="data:{file.type};base64,{audioB64}" controls></audio>
            {:else if plainText}
                <div>{plainText}</div>
            {/if}
        </div>
        {/if}
        {showFile()}
    </div>
{/if}
<style>

</style>  