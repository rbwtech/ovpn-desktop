use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnConnection {
    pub config_name: String,
    pub server: String,
    pub connected_at: String,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub api_key: Arc<Mutex<Option<String>>>,
    pub current_connection: Arc<Mutex<Option<VpnConnection>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            api_key: Arc::new(Mutex::new(None)),
            current_connection: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_api_key(&self, key: String) {
        if let Ok(mut api_key) = self.api_key.lock() {
            *api_key = Some(key);
        }
    }

    pub fn get_api_key(&self) -> Option<String> {
        self.api_key.lock().ok()?.clone()
    }

    pub fn set_connection(&self, conn: Option<VpnConnection>) {
        if let Ok(mut current) = self.current_connection.lock() {
            *current = conn;
        }
    }

    pub fn get_connection(&self) -> Option<VpnConnection> {
        self.current_connection.lock().ok()?.clone()
    }
}