use anyhow::Result;
use serde::{Deserialize, Serialize};
use base64::{Engine as _, engine::general_purpose};

const API_BASE: &str = "https://ovpn.rbwtech.io/api";

fn default_server() -> String {
    "sg".to_string()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub username: String,
    #[serde(default = "default_server")]
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
    client: reqwest::Client,
}

impl ApiClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    pub async fn verify_api_key(&self, api_key: &str) -> Result<VerifyResponse> {
        let auth = format!("{}:{}", "rbwadmin", "rbw4dm1n0vpn");
        let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(&auth));
        
        let response = self.client
            .get(format!("{}/v1/app/verify", API_BASE))
            .header("X-API-KEY", api_key)
            .header("Authorization", auth_header)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            Err(anyhow::anyhow!("Invalid API key"))
        }
    }

    pub async fn list_servers(&self) -> Result<Vec<Server>> {
        let auth = format!("{}:{}", "rbwadmin", "rbw4dm1n0vpn");
        let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(&auth));
        
        let response = self.client
            .get(format!("{}/servers", API_BASE))
            .header("Authorization", auth_header)
            .send()
            .await?;

        Ok(response.json().await?)
    }

    pub async fn generate_config(
        &self,
        api_key: &str,
        request: &GenerateRequest,
    ) -> Result<String> {
        let auth = format!("{}:{}", "rbwadmin", "rbw4dm1n0vpn");
        let auth_header = format!("Basic {}", general_purpose::STANDARD.encode(&auth));
        
        let response = self.client
            .post(format!("{}/generate", API_BASE))
            .header("X-API-KEY", api_key)
            .header("Authorization", auth_header)
            .json(request)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.text().await?)
        } else {
            Err(anyhow::anyhow!("Failed to generate config"))
        }
    }
}