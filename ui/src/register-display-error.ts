// This file ensures display-error is registered only once
// Import this before any other modules that might import display-error

// Patch customElements.define to prevent duplicate registrations
const originalDefine = customElements.define.bind(customElements);
customElements.define = function(name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions) {
  if (customElements.get(name)) {
    console.warn(`Custom element '${name}' is already defined, skipping duplicate registration`);
    return;
  }
  return originalDefine(name, constructor, options);
};

// Import will register the element (static import ensures it loads synchronously)
import "@holochain-open-dev/elements/dist/elements/display-error.js";

