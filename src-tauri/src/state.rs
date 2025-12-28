use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};

pub struct AppState {
    api_key: Arc<RwLock<Option<String>>>,
    connection: Arc<RwLock<Option<VpnConnection>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnConnection {
    pub config_name: String,
    pub server: String,
    pub server_ip: String,
    pub server_port: u16,
    pub protocol: String,
    pub private_ipv4: String,
    pub private_ipv6: String,
    pub connected_at: String,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub speed_up: u64,   
    pub speed_down: u64,  
}

impl AppState {
    pub fn new() -> Self {
        Self {
            api_key: Arc::new(RwLock::new(None)),
            connection: Arc::new(RwLock::new(None)),
        }
    }

    pub fn set_api_key(&self, key: String) {
        *self.api_key.write().unwrap() = Some(key);
    }

    pub fn get_api_key(&self) -> Option<String> {
        self.api_key.read().unwrap().clone()
    }

    pub fn set_connection(&self, conn: Option<VpnConnection>) {
        *self.connection.write().unwrap() = conn;
    }

    pub fn get_connection(&self) -> Option<VpnConnection> {
        self.connection.read().unwrap().clone()
    }
}