use crate::api::{ApiClient, GenerateRequest};
use crate::openvpn::OpenVpnManager;
use crate::state::{AppState, VpnConnection};
use serde::{Deserialize, Serialize};
use tauri::{State, Emitter};

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub username: String,
    pub server_location: String,
}

#[derive(Debug, Serialize)]
pub struct Server {
    pub code: String,
    pub name: String,
    pub ip: String,
    pub udp_port: u16,
    pub tcp_port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VpnConfig {
    pub name: String,
    pub server: String,
    pub protocol: String,
    pub created_at: String,
}

#[tauri::command]
pub async fn verify_api_key(
    state: State<'_, AppState>,
    api_key: String,
) -> Result<VerifyResponse, String> {
    let client = ApiClient::new();
    let response = client
        .verify_api_key(&api_key)
        .await
        .map_err(|e| e.to_string())?;

    state.set_api_key(api_key);

    Ok(VerifyResponse {
        valid: response.valid,
        username: response.username,
        server_location: response.server_location,
    })
}

#[tauri::command]
pub async fn list_servers() -> Result<Vec<Server>, String> {
    let client = ApiClient::new();
    let servers = client.list_servers().await.map_err(|e| e.to_string())?;

    Ok(servers
        .into_iter()
        .map(|s| Server {
            code: s.code,
            name: s.name,
            ip: s.ip,
            udp_port: s.udp_port,
            tcp_port: s.tcp_port,
        })
        .collect())
}

#[tauri::command]
pub async fn generate_config(
    state: State<'_, AppState>,
    username: String,
    password: String,
    email: Option<String>,
    server_code: String,
    protocol: String,
    expiry_days: Option<i32>,
) -> Result<VpnConfig, String> {
    let api_key = state.get_api_key().ok_or("API key not set")?;
    let client = ApiClient::new();

    let request = GenerateRequest {
        username: username.clone(),
        password,
        email,
        server_code: server_code.clone(),
        protocol: protocol.clone(),
        expiry_days,
    };

    let config_content = client
        .generate_config(&api_key, &request)
        .await
        .map_err(|e| e.to_string())?;

    let manager = OpenVpnManager::new();
    let config_name = format!("{}-{}-{}", username, server_code, protocol);
    manager
        .save_config(&config_name, &config_content)
        .map_err(|e| e.to_string())?;

    Ok(VpnConfig {
        name: config_name,
        server: server_code,
        protocol,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn import_config(name: String, content: String) -> Result<VpnConfig, String> {
    let manager = OpenVpnManager::new();
    manager
        .save_config(&name, &content)
        .map_err(|e| e.to_string())?;

    Ok(VpnConfig {
        name,
        server: "imported".to_string(),
        protocol: "unknown".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[cfg(target_os = "windows")]
fn get_system_architecture() -> String {
    use std::process::Command;
    
    if let Ok(arch) = std::env::var("PROCESSOR_ARCHITECTURE") {
        match arch.as_str() {
            "AMD64" => return "x64".to_string(),
            "ARM64" => return "arm64".to_string(),
            "x86" => return "x86".to_string(),
            _ => {}
        }
    }
    
    let output = Command::new("wmic")
        .args(&["cpu", "get", "architecture"])
        .output();
    
    if let Ok(output) = output {
        let result = String::from_utf8_lossy(&output.stdout);
        if result.contains("9") {
            return "x64".to_string();
        } else if result.contains("12") {
            return "arm64".to_string();
        } else if result.contains("0") {
            return "x86".to_string();
        }
    }
    
    "x64".to_string()
}

#[tauri::command]
pub async fn install_openvpn(window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        window.emit("install-progress", "Detecting system architecture...").ok();
        
        let arch = get_system_architecture();
        
        window.emit("install-progress", format!("System: {}", arch)).ok();
        
        let installer_name = match arch.as_str() {
            "x64" => "OpenVPN-2.6.17-I001-amd64.msi",
            "arm64" => "OpenVPN-2.6.17-I001-arm64.msi",
            "x86" => "OpenVPN-2.6.17-I001-x86.msi",
            _ => "OpenVPN-2.6.17-I001-amd64.msi",
        };
        
        let msi_path = std::env::current_exe()
            .ok()
            .and_then(|exe| exe.parent().map(|p| p.join("resources").join(installer_name)))
            .unwrap_or_else(|| std::path::PathBuf::from(format!("resources/{}", installer_name)));
        
        if !msi_path.exists() {
            return Err(format!("OpenVPN installer for {} not found", arch));
        }
        
        window.emit("install-progress", "Installing OpenVPN...").ok();
        
        let status = Command::new("msiexec")
            .args(&["/i", &msi_path.to_string_lossy(), "/qn", "/norestart"])
            .status()
            .map_err(|e| e.to_string())?;
        
        if !status.success() {
            return Err("Installation failed".to_string());
        }
        
        std::thread::sleep(std::time::Duration::from_secs(5));
        window.emit("install-progress", "Complete!").ok();
        
        Ok(())
    }
    
    #[cfg(not(target_os = "windows"))]
    Ok(())
}

#[tauri::command]
pub async fn list_configs() -> Result<Vec<VpnConfig>, String> {
    let manager = OpenVpnManager::new();
    manager.list_configs().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_config(name: String) -> Result<(), String> {
    let manager = OpenVpnManager::new();
    manager.delete_config(&name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_credentials(config_name: String, credentials: String) -> Result<(), String> {
    let manager = OpenVpnManager::new();
    manager.save_credentials(&config_name, &credentials).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_credentials(config_name: String) -> Result<String, String> {
    let manager = OpenVpnManager::new();
    manager.load_credentials(&config_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_vpn(
    state: State<'_, AppState>,
    config_name: String,
) -> Result<(), String> {
    let manager = OpenVpnManager::new();
    manager.connect(&config_name).map_err(|e| e.to_string())?;

    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    
    if manager.is_connected() {
        let (ipv4, ipv6, srv_ip, srv_port, proto) = manager
            .get_connection_details(&config_name)
            .unwrap_or_default();
        
        state.set_connection(Some(VpnConnection {
            config_name,
            server: "unknown".to_string(),
            server_ip: srv_ip,
            server_port: srv_port,
            protocol: proto,
            private_ipv4: ipv4,
            private_ipv6: ipv6,
            connected_at: chrono::Utc::now().to_rfc3339(),
            bytes_sent: 0,
            bytes_received: 0,
            speed_up: 0,
            speed_down: 0,
        }));
        Ok(())
    } else {
        Err("Failed to connect - OpenVPN process not running".to_string())
    }
}

#[tauri::command]
pub async fn check_openvpn() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let openvpn_path = r"C:\Program Files\OpenVPN\bin\openvpn.exe";
        if !std::path::Path::new(openvpn_path).exists() {
            return Err("OpenVPN not installed".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn disconnect_vpn(state: State<'_, AppState>) -> Result<(), String> {
    let manager = OpenVpnManager::new();
    manager.disconnect().map_err(|e| e.to_string())?;

    state.set_connection(None);

    Ok(())
}

#[tauri::command]
pub async fn get_vpn_status(state: State<'_, AppState>) -> Result<Option<VpnConnection>, String> {
    let manager = OpenVpnManager::new();
    
    if !manager.is_connected() {
        state.set_connection(None);
        return Ok(None);
    }
    
    if let Some(mut conn) = state.get_connection() {
        if let Ok((sent, recv)) = manager.get_stats() {
            let prev_sent = conn.bytes_sent;
            let prev_recv = conn.bytes_received;
            
            conn.speed_up = if sent > prev_sent { 
                (sent - prev_sent) / 3 
            } else { 0 };
            
            conn.speed_down = if recv > prev_recv {
                (recv - prev_recv) / 3
            } else { 0 };
            
            conn.bytes_sent = sent;
            conn.bytes_received = recv;
        }
        
        if let Ok((ipv4, ipv6, srv_ip, srv_port, proto)) = manager.get_connection_details(&conn.config_name) {
            if !ipv4.is_empty() {
                conn.private_ipv4 = ipv4;
            }
            if !ipv6.is_empty() {
                conn.private_ipv6 = ipv6;
            }
            if !srv_ip.is_empty() {
                conn.server_ip = srv_ip;
                conn.server_port = srv_port;
                conn.protocol = proto;
            }
        }
        
        state.set_connection(Some(conn.clone()));
        return Ok(Some(conn));
    }
    
    Ok(state.get_connection())
}

#[tauri::command]
pub async fn get_speed_history() -> Result<Vec<(u64, u64)>, String> {
    Ok(vec![])
}

#[tauri::command]
pub async fn get_vpn_logs() -> Result<String, String> {
    let manager = OpenVpnManager::new();
    manager.get_logs().map_err(|e| e.to_string())
}