const fs = require("fs");
const path = require("path");
const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = require(packageJsonPath);
const version = packageJson.version;

console.log(`🔄 Syncing version: ${version}`);

const tauriConfigPath = path.join(__dirname, "src-tauri", "tauri.conf.json");
if (fs.existsSync(tauriConfigPath)) {
  const tauriConfig = require(tauriConfigPath);
  tauriConfig.version = version;
  fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));
  console.log("✅ tauri.conf.json updated");
}

const nsisVersionFile = path.join(__dirname, "src-tauri", "version.nsh");
const nsisContent = `!define PRODUCT_VERSION "${version}"`;

fs.writeFileSync(nsisVersionFile, nsisContent);
console.log("✅ src-tauri/version.nsh generated");
