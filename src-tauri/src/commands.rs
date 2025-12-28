use crate::api::{ApiClient, GenerateRequest};
use crate::openvpn::OpenVpnManager;
use crate::state::{AppState, VpnConnection};
use serde::{Deserialize, Serialize};
use tauri::State;

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
    let servers = client.list_servers().map_err(|e| e.to_string())?;

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
    server_code: String,
    protocol: String,
    expiry_days: Option<i32>,
) -> Result<VpnConfig, String> {
    let api_key = state.get_api_key().ok_or("API key not set")?;
    let client = ApiClient::new();

    let request = GenerateRequest {
        username: username.clone(),
        password,
        server_code: server_code.clone(),
        protocol: protocol.clone(),
        expiry_days,
    };

    let config_content = client
        .generate_config(&api_key, &request)
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
pub async fn connect_vpn(
    state: State<'_, AppState>,
    config_name: String,
) -> Result<(), String> {
    let manager = OpenVpnManager::new();
    manager
        .connect(&config_name)
        .map_err(|e| e.to_string())?;

    state.set_connection(Some(VpnConnection {
        config_name,
        server: "unknown".to_string(),
        connected_at: chrono::Utc::now().to_rfc3339(),
        bytes_sent: 0,
        bytes_received: 0,
    }));

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
    Ok(state.get_connection())
}