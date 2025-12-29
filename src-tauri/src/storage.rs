use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

pub struct Storage;

impl Storage {
    #[cfg(target_os = "windows")]
    fn get_storage_dir() -> PathBuf {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("RBW-Tech OVPN")
    }

    #[cfg(target_os = "linux")]
    fn get_storage_dir() -> PathBuf {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".config").join("RBW-Tech OVPN")
    }

    #[cfg(target_os = "macos")]
    fn get_storage_dir() -> PathBuf {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("RBW-Tech OVPN")
    }

    pub fn save_api_key(api_key: &str) -> Result<()> {
        let storage_dir = Self::get_storage_dir();
        fs::create_dir_all(&storage_dir)?;
        
        let key_file = storage_dir.join("api_key.txt");
        fs::write(&key_file, api_key)
            .context("Failed to save API key")?;
        
        Ok(())
    }

    pub fn load_api_key() -> Result<String> {
        let storage_dir = Self::get_storage_dir();
        let key_file = storage_dir.join("api_key.txt");
        
        if !key_file.exists() {
            return Err(anyhow::anyhow!("API key not found"));
        }
        
        let key = fs::read_to_string(&key_file)
            .context("Failed to load API key")?;
        
        Ok(key.trim().to_string())
    }

    pub fn delete_api_key() -> Result<()> {
        let storage_dir = Self::get_storage_dir();
        let key_file = storage_dir.join("api_key.txt");
        
        if key_file.exists() {
            fs::remove_file(&key_file)?;
        }
        
        Ok(())
    }
}