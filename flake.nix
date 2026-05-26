{
  description = "Flake for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.6";

    # Dev shell composes our own android-service-runtime flake (which also provides
    # the in-process tauri-plugin-holochain this app links against). That shell
    # carries the holochain/rust/android toolchain *and* the GTK/webkit runtime +
    # webkitgtk pin needed for `tauri dev` to render, so we just inherit it here.
    android-service-runtime.url = "github:holochain/android-service-runtime/feat/holochain-0.6-and-unified-plugin";

    nixpkgs.follows = "holonix/nixpkgs";
    android-service-runtime.inputs.holonix.follows = "holonix";
  };

  outputs = inputs @ { ... }:
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; }
    {
      systems = builtins.attrNames inputs.holonix.devShells;

      perSystem =
        { inputs', pkgs, system, ... }: {
          devShells.default = pkgs.mkShell {
            inputsFrom = [
              inputs'.android-service-runtime.devShells.default
              inputs'.holonix.devShells.default
            ];

            packages = with pkgs; [
              nodejs_22
              yarn
              binaryen
              typescript
            ];

            shellHook = ''
              export PS1='\[\033[1;34m\][holonix:\w]\$\[\033[0m\] '
            '';
          };

          devShells.androidDev = pkgs.mkShell {
            inputsFrom = [
              inputs'.android-service-runtime.devShells.default
              inputs'.holonix.devShells.default
            ];

            packages = with pkgs; [
              nodejs_22
              yarn
              binaryen
              typescript
            ];
          };
        };
    };
}
