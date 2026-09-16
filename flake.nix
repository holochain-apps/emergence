{
  description = "Flake for Emergence (Holochain 0.7) development";

  # holonix main-0.7 supplies the Holochain toolchain. runtime-tauri supplies the
  # Tauri shells Emergence builds on: Rust with the wasm32 and Android targets,
  # the holonix tools, nix-provided webkit/GTK (a host webkit mixed with the nix
  # compiler fails to link), and for Android the SDK/NDK, JDK and cargo-ndk.
  #
  #   nix develop               zomes, UI and the desktop app  (npm run start:tauri)
  #   nix develop .#androidDev  the same plus Android           (npm run start:android)
  inputs = {
    holonix.url = "github:holochain/holonix?ref=main-0.7";

    runtime-tauri = {
      # SSH while runtime-tauri is private; github:holochain/runtime-tauri once public.
      url = "git+ssh://git@github.com/holochain/runtime-tauri";
      inputs.holonix.follows = "holonix";
    };

    nixpkgs.follows = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";
  };

  outputs = inputs@{ flake-parts, ... }: flake-parts.lib.mkFlake { inherit inputs; } {
    systems = builtins.attrNames inputs.holonix.devShells;
    perSystem = { inputs', pkgs, ... }:
      let
        # On top of runtime-tauri's shells, which already provide holochain, hc,
        # lair-keystore, kitsune2-bootstrap-srv, Rust and binaryen (wasm-opt).
        emergencePackages = (with inputs'.holonix.packages; [
          hc-scaffold
          hcterm
          hn-introspect
        ]) ++ (with pkgs; [
          nodejs_24 # For UI development
          typescript
        ]);

        mkEmergenceShell = base: prompt: pkgs.mkShell {
          inputsFrom = [ base ];
          packages = emergencePackages;
          shellHook = ''
            export PS1='\[\033[1;34m\][${prompt}:\w]\$\[\033[0m\] '
          '';
        };
      in
      {
        formatter = pkgs.nixpkgs-fmt;

        devShells.default =
          mkEmergenceShell inputs'.runtime-tauri.devShells.tauriDev "emergence-0.7";
        devShells.androidDev =
          mkEmergenceShell inputs'.runtime-tauri.devShells.tauriAndroidDev "emergence-0.7-android";
      };
  };
}
