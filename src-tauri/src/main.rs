// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod openvpn;
mod commands;
mod state;

use state::AppState;

fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::verify_api_key,
            commands::list_servers,
            commands::generate_config,
            commands::import_config,
            commands::list_configs,
            commands::delete_config,
            commands::connect_vpn,
            commands::disconnect_vpn,
            commands::get_vpn_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}