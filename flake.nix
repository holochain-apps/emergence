{
  description = "Flake for Emergence (Holochain 0.7) development";

  # Holochain 0.7 dev shell. holonix main-0.7 supplies the whole Holochain
  # toolchain — holochain, hc, lair-keystore, hc-scaffold and
  # kitsune2-bootstrap-srv — plus the Rust toolchain with the wasm32 target.
  #
  # The June 2026 port carried a self-contained Tauri dev shell here (webkitgtk
  # pin, rust-overlay override, p2p-shipyard removal). Tauri is deferred to
  # Phase F of the 0.7 upgrade, and src-tauri is excluded from the cargo
  # workspace, so that machinery is dropped for now: it was pure eval risk for a
  # target nothing in Phases A-E builds.
  inputs = {
    holonix.url = "github:holochain/holonix?ref=main-0.7";

    nixpkgs.follows = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";
  };

  outputs = inputs@{ flake-parts, ... }: flake-parts.lib.mkFlake { inherit inputs; } {
    systems = builtins.attrNames inputs.holonix.devShells;
    perSystem = { inputs', pkgs, ... }: {
      formatter = pkgs.nixpkgs-fmt;

      devShells.default = pkgs.mkShell {
        inputsFrom = [ inputs'.holonix.devShells.default ];

        packages = (with inputs'.holonix.packages; [
          holochain
          bootstrap-srv
          lair-keystore
          hc
          hn-introspect
          rust # Rust with the wasm32-unknown-unknown target for zome builds
        ]) ++ (with pkgs; [
          nodejs_24 # For UI development
          binaryen # wasm-opt, for the optimised canonical zome build
          typescript
        ]);

        shellHook = ''
          export PS1='\[\033[1;34m\][emergence-0.7:\w]\$\[\033[0m\] '
        '';
      };
    };
  };
}
