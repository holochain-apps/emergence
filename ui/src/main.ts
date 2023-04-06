import './app.css';
import App from './App.svelte';
// import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
// setBasePath('/@shoelace-style/shoelace/dist');

const app = new App({
  target: document.body,
});

export default app;
