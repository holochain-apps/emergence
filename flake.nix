{
  description = "Flake for Emergence (Holochain 0.7) development";

  # Holochain 0.7 dev shell, modeled on the ASR repo's self-contained recipe.
  # We build against the ASR `tauri-plugin-holochain` (a path dep in src-tauri), and
  # holonix `main` (0.7) supplies the whole Holochain toolchain — holochain, hc,
  # lair-keystore, hc-scaffold and kitsune2-bootstrap-srv. Everything else (Rust
  # toolchain via ./rust-toolchain.toml, Tauri desktop libs) is composed here.
  inputs = {
    holonix.url = "github:holochain/holonix/main";

    # holonix main's craneLib pins rust 1.95.0, but the rust-overlay it locks does
    # not yet carry that stable release. Override it (and our own) with the latest
    # oxalica overlay so both the holonix package builds and our dev-shell toolchain
    # resolve 1.95.0.
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
    holonix.inputs.rust-overlay.follows = "rust-overlay";

    # webkitgtk pin for the desktop dev shell. holonix's nixpkgs ships webkitgtk
    # 2.52.x, which aborts with "Could not create default EGL display:
    # EGL_BAD_PARAMETER" and renders a blank Tauri webview on non-NixOS GPUs during
    # `tauri dev`. This nixpkgs rev provides webkitgtk 2.42.5, which renders
    # correctly. Dev-shell only: production bundles link the system/CI webkit.
    webkitnixpkgs.url = "github:nixos/nixpkgs/ed4db9c6c75079ff3570a9e3eb6806c8f692dc26";

    nixpkgs.follows = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { system, inputs', ... }:
        let
          pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [ (import inputs.rust-overlay) ];
          };

          # Rust toolchain. Channel, components, and targets all come from
          # ./rust-toolchain.toml so nix and rustup users stay in sync.
          rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;

          # GTK/webkit stack from the pinned (older, working) nixpkgs — see the
          # `webkitnixpkgs` input comment. Sourced here rather than from `pkgs` so
          # `tauri dev` renders instead of aborting on EGL.
          webkitPkgs = inputs.webkitnixpkgs.legacyPackages.${system};

          # System libraries to build/run a Tauri v2 desktop app on Linux.
          tauriDeps = (with webkitPkgs; [
            webkitgtk_4_1
            gtk3
            gdk-pixbuf
            glib
            glib-networking
            librsvg
            libsoup_3
            dbus
          ]) ++ (with pkgs; [ openssl ]);
        in
        {
          devShells.default = pkgs.mkShell {
            # Tools placed on PATH.
            packages = (with inputs'.holonix.packages; [
              holochain
              hc
              hc-scaffold
              lair-keystore
              bootstrap-srv
            ]) ++ [
              rust
            ] ++ (with pkgs; [
              nodejs_22
              pkg-config
              binaryen # wasm-opt, for building hApp/zome wasm
              typescript
            ]) ++ (with webkitPkgs; [
              shared-mime-info
              gsettings-desktop-schemas
            ]);

            # GTK app wrapper hook: wires GSETTINGS / GIO / GDK-pixbuf / XDG paths at
            # shell entry so the webview finds its resources.
            nativeBuildInputs = [ webkitPkgs.wrapGAppsHook ];

            # Libraries to compile/link against (exposed via pkg-config).
            buildInputs = tauriDeps;

            shellHook = ''
              # GTK/webkit runtime so `tauri dev` renders (see the webkitnixpkgs input).
              export GIO_MODULE_DIR=${webkitPkgs.glib-networking}/lib/gio/modules/
              export GIO_EXTRA_MODULES=${webkitPkgs.glib-networking}/lib/gio/modules
              # Force software compositing by default so the webview renders on finicky
              # GPUs/drivers. Set ENABLE_WEBKIT_COMPOSITING=1 before `nix develop` to
              # keep hardware-accelerated compositing instead.
              if [ -z "$ENABLE_WEBKIT_COMPOSITING" ]; then
                export WEBKIT_DISABLE_COMPOSITING_MODE=1
              fi
              export XDG_DATA_DIRS=${webkitPkgs.shared-mime-info}/share:${webkitPkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${webkitPkgs.gsettings-desktop-schemas.name}:${webkitPkgs.gtk3}/share/gsettings-schemas/${webkitPkgs.gtk3.name}:$XDG_DATA_DIRS

              export PS1='\[\033[1;34m\][emergence-0.7:\w]\$\[\033[0m\] '
            '';
          };
        };
    };
}
