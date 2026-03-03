use holochain_types::prelude::AppBundle;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Listener, Manager, Runtime};
use tauri_plugin_holochain::{HolochainExt, HolochainPluginConfig, NetworkConfig, vec_to_locked};
use url2::Url2;

const APP_ID: &str = "emergence";
pub const HAPP_BUNDLE_BYTES: &[u8] = include_bytes!("../../workdir/emergence.happ");

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserNetworkConfig {
    bootstrap_url: Option<Url2>,
    relay_url: Option<Url2>,
}

pub fn happ_bundle() -> anyhow::Result<AppBundle> {
    AppBundle::unpack(HAPP_BUNDLE_BYTES).map_err(|e| anyhow::anyhow!(e))
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
        .plugin(tauri_plugin_holochain::async_init(
            vec_to_locked(vec![]),
            HolochainPluginConfig::new(holochain_dir(), network_config())
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            let handle_fail = app.handle().clone();
            app.handle()
                .listen("holochain://setup-failed", move |_event| {
                    handle_fail.exit(1);
                });
            app.handle()
                .listen("holochain://setup-completed", move |_event| {
                    let handle = handle.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = setup(handle.clone()).await {
                            eprintln!("Failed to setup: {:?}", e);
                            return;
                        }

                        let main_window = async {
                            let mut window = handle
                                .holochain()
                                .map_err(|e| anyhow::anyhow!("{e:?}"))?
                                .main_window_builder(
                                    String::from("main"),
                                    false,
                                    Some(String::from("emergence")),
                                    None,
                                )
                                .await
                                .map_err(|e| anyhow::anyhow!("{e:?}"))?;

                            #[cfg(desktop)]
                            {
                                window = window
                                    .title(String::from("Emergence"))
                                    .inner_size(1200.0, 880.0);
                            }

                            window.build().map_err(|e| anyhow::anyhow!("{e:?}"))?;
                            Ok::<(), anyhow::Error>(())
                        }.await;

                        match main_window {
                            Ok(()) => {
                                #[cfg(desktop)]
                                {
                                    if let Some(splashscreen) = handle.get_webview_window("splashscreen") {
                                        let _ = splashscreen.close();
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to open main window: {:?}", e);
                            }
                        }
                    });
                });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Very simple setup for now:
// - On app start, list installed apps:
//   - If our hApp is not installed, this is the first time the app is opened: install our hApp
//   - If our hApp **is** installed:
//     - Check if it's necessary to update the coordinators for our hApp
//       - And do so if it is
async fn setup(handle: AppHandle) -> anyhow::Result<()> {
    let admin_ws = handle.holochain()?.admin_websocket().await?;

    let installed_apps = admin_ws
        .list_apps(None)
        .await
        .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

    if installed_apps
        .iter()
        .find(|app| app.installed_app_id.as_str().eq(APP_ID))
        .is_none()
    {
        handle
            .holochain()?
            .install_app(
                String::from(APP_ID),
                happ_bundle()?,
                None,
                None,
                None,
            )
            .await?;
    } else {
        handle.holochain()?.update_app_if_necessary(
            String::from(APP_ID),
            happ_bundle()?
        ).await?;
    }

    Ok(())
}

fn network_config() -> NetworkConfig {
    let mut network_config = NetworkConfig::default();

    let user_config = read_user_network_config().ok().flatten();

    // In dev mode, default to local bootstrap server started by npm scripts
    // (user config can still override this below)
    if tauri::is_dev() {
        let port = std::env::var("BOOTSTRAP_PORT").unwrap_or_else(|_| "8888".to_string());
        network_config.bootstrap_url = Url2::parse(format!("http://127.0.0.1:{}", port));
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

    // Don't hold any slice of the DHT in mobile
    if cfg!(mobile) {
        network_config.target_arc_factor = 0;
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
