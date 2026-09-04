// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // On Linux, default to disabling webkit's accelerated compositing: on some
    // GPU/driver combinations (notably the webkitgtk bundled on ubuntu 22.04, which
    // our AppImage ships) it renders a blank window. Users whose GPU works fine can
    // opt back into hardware-accelerated compositing by setting
    // ENABLE_WEBKIT_COMPOSITING=1 in their environment.
    #[cfg(all(desktop, target_os = "linux"))]
    {
        let enable_compositing = std::env::var("ENABLE_WEBKIT_COMPOSITING")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);
        if !enable_compositing {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    tauri_app_lib::run();
}
