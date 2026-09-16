use holochain::prelude::{AppBundleSource, InstallAppPayload};
use std::collections::HashMap;
use tauri::{AppHandle, Listener, Manager};
use tauri_plugin_hc::{
    init, vec_to_locked, AppPaths, HolochainExt, HolochainPluginConfig, NetworkConfig,
    UserNetworkConfig, UserNetworkConfigPath, WindowOptions, EVENT_SETUP_FAILED,
};

const APP_ID: &str = "emergence";
pub const HAPP_BUNDLE_BYTES: &[u8] = include_bytes!("../../workdir/emergence.happ");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let paths = tauri_plugin_hc::app_paths(APP_ID, env!("CARGO_PKG_AUTHORS"))
        .expect("Could not set up the app's data directory");

    tauri::Builder::default()
        .manage(UserNetworkConfigPath(paths.user_network_config.clone()))
        .invoke_handler(tauri::generate_handler![
            tauri_plugin_hc::get_user_network_config,
            tauri_plugin_hc::default_user_network_config,
            tauri_plugin_hc::set_user_network_config,
        ])
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(init(
            vec_to_locked(vec![]),
            HolochainPluginConfig::new(paths.holochain_dir.clone(), network_config(&paths)),
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            app.handle().listen(EVENT_SETUP_FAILED, move |_event| {
                handle.exit(1);
            });
            tauri_plugin_hc::on_ready(app.handle(), setup_and_open);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Once the conductor is up: install + enable the hApp if needed, then open the main
// window over direct Tauri IPC. With use_app_websocket left at its default (false),
// the plugin injects __HC_TAURI_HOLOCHAIN__ and routes the App API + zome-call
// signing over Tauri IPC, so no app websocket is attached.
async fn setup_and_open(handle: AppHandle) -> anyhow::Result<()> {
    let plugin = handle.holochain()?;

    plugin
        .runtime()
        .install_app_if_missing(
            InstallAppPayload {
                source: AppBundleSource::Bytes(HAPP_BUNDLE_BYTES.to_vec().into()),
                agent_key: None,
                installed_app_id: Some(APP_ID.into()),
                network_seed: None,
                roles_settings: Some(HashMap::new()),
                ignore_genesis_failure: false,
                restore_from_dht: false,
            },
            true,
        )
        .await?;

    let mut window = plugin
        .main_window_builder(
            "main",
            Some(APP_ID.to_string()),
            WindowOptions {
                title: Some("Emergence".into()),
                ..Default::default()
            },
        )
        .await?;

    #[cfg(desktop)]
    {
        window = window.inner_size(1200.0, 880.0);
    }

    window.build()?;

    #[cfg(desktop)]
    if let Some(splashscreen) = handle.get_webview_window("splashscreen") {
        let _ = splashscreen.close();
    }

    Ok(())
}

fn network_config(paths: &AppPaths) -> NetworkConfig {
    // In dev mode, use the local kitsune2-bootstrap-srv the npm scripts start as
    // both bootstrap server and iroh relay, so dev never reaches the public servers.
    // INTERNAL_IP / BOOTSTRAP_PORT select it (see tauri_plugin_hc::dev_network_url!,
    // which also covers why Android bakes them in at compile time).
    let mut network_config = if tauri::is_dev() {
        tauri_plugin_hc::dev_network_config(&tauri_plugin_hc::dev_network_url!())
    } else {
        NetworkConfig::default()
    };

    // URLs the user saved from the admin screen take priority.
    UserNetworkConfig::apply_saved(&paths.user_network_config, &mut network_config);

    network_config
}
