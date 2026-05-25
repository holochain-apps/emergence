{
  description = "Flake for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.6";

    # Dev shell comes from our own android-service-runtime flake (the repo that
    # also provides the in-process tauri-plugin-holochain this app links against),
    # not from darksoil's p2p-shipyard. Keep its holonix in lockstep with ours so
    # there is a single holochain toolchain.
    #
    # Absolute path: a relative `path:../...` escapes the git-flake store path and
    # nix rejects it. This is a local cross-repo dev link (same as the Cargo path
    # dep) on the test branch, not something to merge to main.
    android-service-runtime.url = "path:/home/eric/code/metacurrency/holochain/android-service-runtime";

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

          # Android builds use the same shell (it bundles the Android SDK/NDK and
          # cargo-ndk). NOTE: the ANDROID_HOME / NDK env vars are set by the
          # android-service-runtime shell's own shellHook, which Nix does not
          # propagate through `inputsFrom`; for `tauri android` builds, run them
          # from the android-service-runtime dev shell.
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
