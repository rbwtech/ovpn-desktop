use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};

lazy_static::lazy_static! {
    static ref VPN_PROCESS: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
}

pub struct OpenVpnManager {
    config_dir: PathBuf,
}

impl OpenVpnManager {
    pub fn new() -> Self {
        let config_dir = Self::get_config_dir();
        fs::create_dir_all(&config_dir).ok();

        Self { config_dir }
    }

    #[cfg(target_os = "windows")]
    fn get_config_dir() -> PathBuf {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("RBW VPN").join("configs")
    }

    #[cfg(target_os = "linux")]
    fn get_config_dir() -> PathBuf {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".config").join("RBW VPN").join("configs")
    }

    #[cfg(target_os = "macos")]
    fn get_config_dir() -> PathBuf {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("RBW VPN")
            .join("configs")
    }

    pub fn save_config(&self, name: &str, content: &str) -> Result<()> {
        let config_file = self.config_dir.join(format!("{}.ovpn", name));
        fs::write(&config_file, content)
            .with_context(|| format!("Failed to save config: {}", name))?;
        Ok(())
    }

    pub fn list_configs(&self) -> Result<Vec<crate::commands::VpnConfig>> {
        let mut configs = Vec::new();

        if let Ok(entries) = fs::read_dir(&self.config_dir) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with(".ovpn") {
                        let config_name = name.trim_end_matches(".ovpn").to_string();
                        let parts: Vec<&str> = config_name.split('-').collect();

                        configs.push(crate::commands::VpnConfig {
                            name: config_name,
                            server: parts.get(1).unwrap_or(&"unknown").to_string(),
                            protocol: parts.get(2).unwrap_or(&"udp").to_string(),
                            created_at: entry
                                .metadata()
                                .ok()
                                .and_then(|m| m.created().ok())
                                .map(|t| {
                                    chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
                                })
                                .unwrap_or_default(),
                        });
                    }
                }
            }
        }

        Ok(configs)
    }

    pub fn delete_config(&self, name: &str) -> Result<()> {
        let config_file = self.config_dir.join(format!("{}.ovpn", name));
        fs::remove_file(&config_file)
            .with_context(|| format!("Failed to delete config: {}", name))?;
        Ok(())
    }

    pub fn connect(&self, config_name: &str) -> Result<()> {
        let config_file = self.config_dir.join(format!("{}.ovpn", config_name));

        if !config_file.exists() {
            return Err(anyhow::anyhow!("Config file not found: {}", config_name));
        }

        #[cfg(target_os = "windows")]
        let openvpn_path = r"C:\Program Files\OpenVPN\bin\openvpn.exe";

        #[cfg(not(target_os = "windows"))]
        let openvpn_path = "openvpn";

        let child = Command::new(openvpn_path)
            .arg("--config")
            .arg(&config_file)
            .spawn()
            .context("Failed to start OpenVPN")?;

        let mut process = VPN_PROCESS.lock().unwrap();
        *process = Some(child);

        Ok(())
    }

    pub fn disconnect(&self) -> Result<()> {
        let mut process = VPN_PROCESS.lock().unwrap();

        if let Some(mut child) = process.take() {
            child.kill().context("Failed to kill OpenVPN process")?;
        }

        Ok(())
    }
}