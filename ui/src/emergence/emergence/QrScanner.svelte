<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import jsQR from "jsqr";
  import { tryDecodeDnaJoiningInfo } from "./dnaJoiningInfo";

  // Reads a QR code holding a network joining code. Two paths:
  //  - live: the rear camera via getUserMedia, sampled every 200ms. Needs a
  //    secure context, so it is unavailable when the UI is served over plain
  //    http (the Android dev build).
  //  - photo: a file input with `capture`, which on a phone opens the native
  //    camera app and returns a still. Works in any context and is the
  //    fallback when live video is unavailable or the user prefers it.
  // Dispatches `scan` with the raw code string once one is found, or `cancel`
  // if the user gives up. The camera is released either way, and on unmount.
  const dispatch = createEventDispatcher<{ scan: string; cancel: void }>();

  const hasLiveCamera = !!navigator.mediaDevices?.getUserMedia;
  // On a phone the file input's `capture` opens the camera app; on a desktop
  // it is ignored and a file picker opens instead, so label it honestly.
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const photoLabel = isMobile ? "Take a Photo" : "Use a Photo";

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let fileInput: HTMLInputElement;
  let stream: MediaStream | null = null;
  let timer: number | undefined;
  let error = "";
  let decodingPhoto = false;

  onMount(() => {
    if (hasLiveCamera) startLive();
  });
  onDestroy(stopLive);

  // Prefer the rear camera on a phone, but accept any camera. A desktop webcam
  // has no facing mode, and WebKitGTK (the Linux Tauri webview) rejects the
  // constraint with OverconstrainedError rather than ignoring it, so retry
  // without it.
  async function openCamera(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
    } catch (e) {
      if ((e as DOMException)?.name !== "OverconstrainedError") throw e;
      return await navigator.mediaDevices.getUserMedia({ video: true });
    }
  }

  async function startLive() {
    try {
      stream = await openCamera();
      video.srcObject = stream;
      await video.play();
      timer = window.setInterval(scanFrame, 200);
    } catch (e) {
      error = `Could not start camera: ${e}`;
    }
  }

  function stopLive() {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  // Draw a source onto the hidden canvas, scaled down if wider than maxWidth,
  // and look for a QR code in it. Returns the code text or undefined.
  function decodeSource(source: CanvasImageSource, width: number, height: number, maxWidth: number): string | undefined {
    const scale = Math.min(1, maxWidth / width);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data;
  }

  // Accept the code if it is a joining code; otherwise report and return false.
  function accept(code: string | undefined, notFoundMessage: string): boolean {
    if (!code) {
      error = notFoundMessage;
      return false;
    }
    if (!tryDecodeDnaJoiningInfo(code)) {
      error = "That QR code is not a network joining code";
      return false;
    }
    stopLive();
    dispatch("scan", code);
    return true;
  }

  function scanFrame() {
    if (!stream || !video || video.videoWidth === 0) return;
    const code = decodeSource(video, video.videoWidth, video.videoHeight, Infinity);
    // Keep scanning silently while no code is in view.
    if (code === undefined) return;
    accept(code, "");
  }

  async function decodePhoto(file: File) {
    decodingPhoto = true;
    error = "";
    try {
      const bitmap = await createImageBitmap(file);
      try {
        // Camera stills are several thousand pixels wide; downscale for speed.
        accept(decodeSource(bitmap, bitmap.width, bitmap.height, 1200), "No QR code found in that photo");
      } finally {
        bitmap.close();
      }
    } catch (e) {
      error = `Could not read that photo: ${e}`;
    }
    decodingPhoto = false;
  }

  const onPhotoChosen = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (file) decodePhoto(file);
  };

  const cancel = () => {
    stopLive();
    dispatch("cancel");
  };
</script>

<div class="scanner">
  {#if hasLiveCamera}
    <div class="video-container">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video bind:this={video} autoplay playsinline muted></video>
      <div class="scanner-overlay"></div>
    </div>
  {:else}
    <p class="hint">{isMobile ? "Take a photo of the QR code to join." : "Choose a picture of the QR code to join."}</p>
  {/if}
  <canvas bind:this={canvas}></canvas>
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    capture="environment"
    style="display: none;"
    on:change={onPhotoChosen}
  />
  {#if error}
    <div class="error">{error}</div>
  {/if}
  <div class="controls">
    <sl-button on:click={cancel}>Cancel</sl-button>
    <sl-button variant="primary" disabled={decodingPhoto} on:click={() => fileInput.click()}>
      {#if decodingPhoto}
        Reading photo...
      {:else if hasLiveCamera}
        {photoLabel} Instead
      {:else}
        {photoLabel}
      {/if}
    </sl-button>
  </div>
</div>

<style>
  .scanner {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .video-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
  }
  video {
    width: 100%;
    height: auto;
    display: block;
  }
  canvas {
    display: none;
  }
  .scanner-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    aspect-ratio: 1;
    border: 3px solid #00ff00;
    border-radius: 8px;
    pointer-events: none;
  }
  .hint {
    font-weight: normal;
    margin: 0 0 10px 0;
  }
  .error {
    margin-top: 10px;
    color: #c62828;
    font-weight: normal;
  }
  .controls {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
</style>
