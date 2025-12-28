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

    pub fn load_credentials(&self, config_name: &str) -> Result<String> {
    let creds_file = self.config_dir.join(format!("{}.creds", config_name));
    if creds_file.exists() {
        let content = fs::read_to_string(&creds_file)
            .with_context(|| format!("Failed to load credentials: {}", config_name))?;
        Ok(content)
    } else {
        Err(anyhow::anyhow!("Credentials not found"))
    }
}

    pub fn save_credentials(&self, config_name: &str, credentials: &str) -> Result<()> {
        let creds_file = self.config_dir.join(format!("{}.creds", config_name));
        fs::write(&creds_file, credentials)
            .with_context(|| format!("Failed to save credentials: {}", config_name))?;
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
                            name: config_name.clone(),
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
        let creds_file = self.config_dir.join(format!("{}.creds", config_name));

        if !config_file.exists() {
            return Err(anyhow::anyhow!("Config file not found: {}", config_name));
        }

        #[cfg(target_os = "windows")]
        let openvpn_path = r"C:\Program Files\OpenVPN\bin\openvpn.exe";

        #[cfg(not(target_os = "windows"))]
        let openvpn_path = "openvpn";

        // Check if OpenVPN binary exists
        #[cfg(target_os = "windows")]
        if !std::path::Path::new(openvpn_path).exists() {
            // Try to install bundled OpenVPN
            let msi_path = std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().map(|p| p.join("resources").join("OpenVPN-2.6.17-I001-amd64.msi")))
                .unwrap_or_else(|| std::path::PathBuf::from("resources/OpenVPN-2.6.17-I001-amd64.msi"));
            
            if msi_path.exists() {
                // Install OpenVPN silently
                let install = Command::new("msiexec")
                    .args(&["/i", &msi_path.to_string_lossy(), "/quiet", "/norestart"])
                    .status();
                
                if install.is_ok() {
                    // Wait for installation
                    std::thread::sleep(std::time::Duration::from_secs(10));
                    
                    if !std::path::Path::new(openvpn_path).exists() {
                        return Err(anyhow::anyhow!("OpenVPN installation failed"));
                    }
                } else {
                    return Err(anyhow::anyhow!("Failed to install OpenVPN"));
                }
            } else {
                return Err(anyhow::anyhow!(
                    "OpenVPN not installed and installer not found. Please install manually from https://openvpn.net/community-downloads/"
                ));
            }
        }

        use std::process::Stdio;
        use std::fs::OpenOptions;
        
        let log_file = self.config_dir.join("openvpn.log");
        let log_output = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&log_file)
            .context("Failed to create log file")?;
        
        let mut cmd = Command::new(openvpn_path);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        cmd.arg("--config").arg(&config_file);
        cmd.arg("--config").arg(&config_file);
        cmd.stdout(Stdio::from(log_output.try_clone()?));
        cmd.stderr(Stdio::from(log_output));
        
        // Add credentials if file exists
        if creds_file.exists() {
            cmd.arg("--auth-user-pass").arg(&creds_file);
        }

        let child = cmd.spawn()
            .with_context(|| format!("Failed to start OpenVPN. Make sure OpenVPN is installed."))?;

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

    pub fn is_connected(&self) -> bool {
        let mut process = VPN_PROCESS.lock().unwrap();
        
        if let Some(child) = process.as_mut() {
            // Check if process is still running
            match child.try_wait() {
                Ok(Some(_)) => {
                    // Process has exited
                    *process = None;
                    false
                }
                Ok(None) => {
                    // Process is still running
                    true
                }
                Err(_) => {
                    // Error checking process
                    false
                }
            }
        } else {
            false
        }
    }

    pub fn get_logs(&self) -> Result<String> {
        use std::io::{BufRead, BufReader};
        
        let log_file = self.config_dir.join("openvpn.log");
        
        if !log_file.exists() {
            return Ok(String::new());
        }

        let file = fs::File::open(&log_file)?;
        let reader = BufReader::new(file);
        
        // Get last 100 lines
        let lines: Vec<String> = reader.lines()
            .filter_map(|l| l.ok())
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .take(100)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect();
        
        Ok(lines.join("\n"))
    }

    pub fn get_stats(&self) -> Result<(u64, u64)> {
    let log_file = self.config_dir.join("openvpn.log");
    
    if !log_file.exists() {
        return Ok((0, 0));
    }

    let content = fs::read_to_string(&log_file)?;
    let mut bytes_sent = 0u64;
    let mut bytes_received = 0u64;

    for line in content.lines().rev().take(200) {
        if line.contains("read bytes") {
            if let Some(bytes_str) = line.split(',').nth(1) {
                if let Ok(bytes) = bytes_str.trim().parse::<u64>() {
                    bytes_received = bytes;
                }
            }
        }
        if line.contains("write bytes") {
            if let Some(bytes_str) = line.split(',').nth(1) {
                if let Ok(bytes) = bytes_str.trim().parse::<u64>() {
                    bytes_sent = bytes;
                }
            }
        }
    }

    Ok((bytes_sent, bytes_received))
}
}