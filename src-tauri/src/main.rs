#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod openvpn;
mod commands;
mod state;
mod storage;

use state::AppState;
use tauri::Manager;

#[cfg(windows)]
fn is_elevated() -> bool {
    use std::os::windows::process::CommandExt;
    use std::process::Command;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    Command::new("net")
        .args(&["session"])
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(windows)]
fn show_admin_error() {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use winapi::um::winuser::{MessageBoxW, MB_OK, MB_ICONERROR};
    
    let title: Vec<u16> = OsStr::new("Administrator Required")
        .encode_wide()
        .chain(Some(0))
        .collect();
    
    let message: Vec<u16> = OsStr::new(
        "RBW-Tech VPN requires Administrator privileges.\n\n\
         Please right-click the application and select 'Run as administrator'."
    )
    .encode_wide()
    .chain(Some(0))
    .collect();
    
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            message.as_ptr(),
            title.as_ptr(),
            MB_OK | MB_ICONERROR
        );
    }
}

fn main() {
    #[cfg(windows)]
    {
        if !is_elevated() {
            show_admin_error();
            std::process::exit(1);
        }
    }

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
            commands::get_speed_history,
            commands::get_config_ip,
            commands::save_api_key_to_disk,      
            commands::load_api_key_from_disk,    
            commands::delete_api_key_from_disk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}