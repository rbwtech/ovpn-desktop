#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod openvpn;
mod commands;
mod state;

use state::AppState;

#[cfg(windows)]
fn is_elevated() -> bool {
    use winapi::um::processthreadsapi::{GetCurrentProcess, OpenProcessToken};
    use winapi::um::securitybaseapi::GetTokenInformation;
    use winapi::um::winnt::{TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use std::mem;

    unsafe {
        let mut token = std::ptr::null_mut();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }

        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let size = mem::size_of::<TOKEN_ELEVATION>() as u32;
        let mut ret_size = 0;

        GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            size,
            &mut ret_size,
        );

        elevation.TokenIsElevated != 0
    }
}

fn main() {
    #[cfg(windows)]
    {
        if !is_elevated() {
            use std::process::Command;
            let exe = std::env::current_exe().unwrap();
            let _ = Command::new("powershell")
                .arg("-Command")
                .arg(format!("Start-Process '{}' -Verb RunAs", exe.display()))
                .spawn();
            std::process::exit(0);
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::verify_api_key,
            commands::list_servers,
            commands::generate_config,
            commands::save_credentials,
            commands::import_config,
            commands::list_configs,
            commands::delete_config,
            commands::connect_vpn,
            commands::disconnect_vpn,
            commands::get_vpn_status,
            commands::get_vpn_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}