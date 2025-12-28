#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod openvpn;
mod commands;
mod state;

use state::AppState;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        let manager = crate::openvpn::OpenVpnManager::new();
                        let _ = manager.disconnect();
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::verify_api_key,
            commands::list_servers,
            commands::generate_config,
            commands::save_credentials,
            commands::load_credentials,
            commands::install_openvpn,
            commands::import_config,
            commands::list_configs,
            commands::delete_config,
            commands::connect_vpn,
            commands::disconnect_vpn,
            commands::get_vpn_status,
            commands::get_vpn_logs,
            commands::check_openvpn,
            commands::get_speed_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}