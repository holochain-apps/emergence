{
  description = "Flake for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.6";
    p2p-shipyard.url = "github:darksoil-studio/tauri-plugin-holochain/main-0.6.1";

    nixpkgs.follows = "holonix/nixpkgs";
    p2p-shipyard.inputs.holonix.follows = "holonix";
  };

  outputs = inputs @ { ... }:
    inputs.holonix.inputs.flake-parts.lib.mkFlake { inherit inputs; }
    {
      systems = builtins.attrNames inputs.holonix.devShells;

      perSystem =
        { inputs', pkgs, system, ... }: {
          devShells.default = pkgs.mkShell {
            inputsFrom = [
              inputs'.p2p-shipyard.devShells.holochainTauriDev
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
              inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
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
