use holochain::prelude::{AppBundleSource, InstallAppPayload};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Listener, Manager, Runtime};
use tauri_plugin_holochain::{
    init, vec_to_locked, HolochainExt, HolochainPluginConfig, NetworkConfig, WindowOptions,
    EVENT_READY, EVENT_SETUP_FAILED,
};
use url2::Url2;

const APP_ID: &str = "emergence";
pub const HAPP_BUNDLE_BYTES: &[u8] = include_bytes!("../../workdir/emergence.happ");

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserNetworkConfig {
    bootstrap_url: Option<Url2>,
    relay_url: Option<Url2>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_user_network_config,
            default_user_network_config,
            set_user_network_config,
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
            HolochainPluginConfig::new(holochain_dir(), network_config()),
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            let handle_fail = app.handle().clone();
            app.handle().listen(EVENT_SETUP_FAILED, move |_event| {
                handle_fail.exit(1);
            });
            app.handle().listen(EVENT_READY, move |_event| {
                let handle = handle.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = setup_and_open(handle).await {
                        eprintln!("Failed to setup: {:?}", e);
                    }
                });
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// On EVENT_READY: install + enable the hApp if needed, then open the main window
// over direct Tauri IPC. With use_app_websocket left at its default (false), the
// plugin injects __HC_TAURI_HOLOCHAIN__ and routes the App API + zome-call signing
// over Tauri IPC — so we do NOT need `setup_app`'s `ensure_app_websocket` step
// (which would attach an unused app-websocket interface); we install/enable
// directly instead.
async fn setup_and_open(handle: AppHandle) -> anyhow::Result<()> {
    let plugin = handle.holochain().map_err(|e| anyhow::anyhow!("{e:?}"))?;
    let rt = plugin.runtime();

    if !rt
        .is_app_installed(APP_ID.into())
        .await
        .map_err(|e| anyhow::anyhow!("{e:?}"))?
    {
        rt.install_app(InstallAppPayload {
            source: AppBundleSource::Bytes(HAPP_BUNDLE_BYTES.to_vec().into()),
            agent_key: None,
            installed_app_id: Some(APP_ID.into()),
            network_seed: None,
            roles_settings: Some(HashMap::new()),
            ignore_genesis_failure: false,
        })
        .await
        .map_err(|e| anyhow::anyhow!("{e:?}"))?;

        rt.enable_app(APP_ID.into())
            .await
            .map_err(|e| anyhow::anyhow!("{e:?}"))?;
    }

    let mut window = plugin
        .main_window_builder(
            "main",
            APP_ID.to_string(),
            WindowOptions {
                title: Some("Emergence".into()),
                ..Default::default()
            },
        )
        .await
        .map_err(|e| anyhow::anyhow!("{e:?}"))?;

    #[cfg(desktop)]
    {
        window = window.inner_size(1200.0, 880.0);
    }

    window.build().map_err(|e| anyhow::anyhow!("{e:?}"))?;

    #[cfg(desktop)]
    if let Some(splashscreen) = handle.get_webview_window("splashscreen") {
        let _ = splashscreen.close();
    }

    Ok(())
}

fn network_config() -> NetworkConfig {
    let mut network_config = NetworkConfig::default();

    let user_config = read_user_network_config().ok().flatten();

    // In dev mode, point both the bootstrap server AND the iroh relay at the local
    // kitsune2-bootstrap-srv started by the npm scripts, so dev never reaches out to
    // the public bootstrap/relay servers (and doesn't stall startup probing them).
    // The bootstrap-srv serves bootstrap and the iroh relay on the same address —
    // this matches hc-spin/moss dev, which parse one host:port and use it for both
    // `--bootstrap` and the `quic` relay. (User config can still override below.)
    if tauri::is_dev() {
        let port = std::env::var("BOOTSTRAP_PORT").unwrap_or_else(|_| "8888".to_string());
        let local = format!("http://127.0.0.1:{}", port);
        network_config.bootstrap_url = Url2::parse(&local);
        network_config.relay_url = Url2::parse(&local);
        // The local kitsune2-bootstrap-srv serves the iroh relay over plaintext
        // http://; the iroh transport rejects non-TLS relay URLs unless explicitly
        // allowed. Same opt-in hc sandbox / hc-spin use for local dev.
        network_config.advanced = Some(serde_json::json!({
            "irohTransport": {
                "relayAllowPlainText": true
            }
        }));
    }

    // User-persisted config takes highest priority
    if let Some(user_config) = user_config {
        if let Some(bootstrap_url) = user_config.bootstrap_url {
            network_config.bootstrap_url = bootstrap_url;
        }
        if let Some(relay_url) = user_config.relay_url {
            network_config.relay_url = relay_url;
        }
    }

    network_config
}

// --- User Network Config ---

fn user_network_config_path() -> PathBuf {
    // In dev mode, store config alongside the per-instance holochain dir;
    // in production, store in the shared UserData dir.
    if tauri::is_dev() {
        holochain_dir().join("user-network-config.json")
    } else {
        app_dirs2::app_root(
            app_dirs2::AppDataType::UserData,
            &app_dirs2::AppInfo {
                name: APP_ID,
                author: std::env!("CARGO_PKG_AUTHORS"),
            },
        )
        .expect("Could not get app root")
        .join("user-network-config.json")
    }
}

fn read_user_network_config() -> anyhow::Result<Option<UserNetworkConfig>> {
    let path = user_network_config_path();
    if !path.exists() {
        return Ok(None);
    }
    let contents = std::fs::read_to_string(path)?;
    let config: UserNetworkConfig = serde_json::from_str(&contents)?;
    Ok(Some(config))
}

fn write_user_network_config(config: &UserNetworkConfig) -> anyhow::Result<()> {
    let path = user_network_config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let contents = serde_json::to_string(config)?;
    std::fs::write(path, contents)?;
    Ok(())
}

#[tauri::command]
fn get_user_network_config() -> Result<Option<UserNetworkConfig>, String> {
    read_user_network_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn default_user_network_config() -> UserNetworkConfig {
    let defaults = NetworkConfig::default();
    UserNetworkConfig {
        bootstrap_url: Some(defaults.bootstrap_url),
        relay_url: Some(defaults.relay_url),
    }
}

#[tauri::command]
fn set_user_network_config<R: Runtime>(
    app: AppHandle<R>,
    bootstrap_url: Url2,
    relay_url: Url2,
) -> Result<(), String> {
    let config = UserNetworkConfig {
        bootstrap_url: Some(bootstrap_url),
        relay_url: Some(relay_url),
    };
    write_user_network_config(&config).map_err(|e| e.to_string())?;
    app.restart();
}

// --- Holochain Directory ---

fn holochain_dir() -> PathBuf {
    static DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();
    DIR.get_or_init(holochain_dir_inner).clone()
}

fn holochain_dir_inner() -> PathBuf {
    let app_data_type = if tauri::is_dev() {
        app_dirs2::AppDataType::UserCache
    } else {
        app_dirs2::AppDataType::UserData
    };

    let base = app_dirs2::app_root(
        app_data_type,
        &app_dirs2::AppInfo {
            name: APP_ID,
            author: std::env!("CARGO_PKG_AUTHORS"),
        },
    )
    .expect("Could not get app root");

    if tauri::is_dev() {
        // Each dev instance gets its own numbered directory (0, 1, 2, ...)
        // determined by which lock files are already held by running instances
        use fs2::FileExt;
        for i in 0..10 {
            let dir = base.join(format!("holochain-{}", i));
            let lock_path = dir.join(".lock");
            std::fs::create_dir_all(&dir).expect("Could not create holochain dir");
            let lock_file = std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .open(&lock_path)
                .expect("Could not open lock file");
            if lock_file.try_lock_exclusive().is_ok() {
                // Keep the lock file handle alive for the lifetime of the process
                std::mem::forget(lock_file);
                return dir;
            }
        }
        // Fallback if all slots taken
        base.join("holochain")
    } else {
        base.join("holochain")
    }
}
