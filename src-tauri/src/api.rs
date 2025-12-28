use anyhow::Result;
use serde::{Deserialize, Serialize};

const API_BASE: &str = "https://ovpn.rbwtech.io/api";

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub username: String,
    pub server_location: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Server {
    pub code: String,
    pub name: String,
    pub ip: String,
    pub udp_port: u16,
    pub tcp_port: u16,
}

#[derive(Debug, Serialize)]
pub struct GenerateRequest {
    pub username: String,
    pub password: String,
    pub server_code: String,
    pub protocol: String,
    pub expiry_days: Option<i32>,
}

pub struct ApiClient {
    client: reqwest::blocking::Client,
}

impl ApiClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::blocking::Client::new(),
        }
    }

    pub fn verify_api_key(&self, api_key: &str) -> Result<VerifyResponse> {
        let response = self.client
            .get(format!("{}/v1/app/verify", API_BASE))
            .header("X-API-KEY", api_key)
            .send()?;

        if response.status().is_success() {
            Ok(response.json()?)
        } else {
            Err(anyhow::anyhow!("Invalid API key"))
        }
    }

    pub fn list_servers(&self) -> Result<Vec<Server>> {
        let response = self.client
            .get(format!("{}/servers", API_BASE))
            .send()?;

        Ok(response.json()?)
    }

    pub fn generate_config(
        &self,
        api_key: &str,
        request: &GenerateRequest,
    ) -> Result<String> {
        let response = self.client
            .post(format!("{}/generate", API_BASE))
            .header("X-API-KEY", api_key)
            .json(request)
            .send()?;

        if response.status().is_success() {
            Ok(response.text()?)
        } else {
            Err(anyhow::anyhow!("Failed to generate config"))
        }
    }
}