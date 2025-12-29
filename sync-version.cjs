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

const nsisPath = path.join(__dirname, "src-tauri", "installer.nsi");
if (fs.existsSync(nsisPath)) {
  let nsisContent = fs.readFileSync(nsisPath, "utf8");

  const regex = /!define PRODUCT_VERSION ".*"/;

  if (regex.test(nsisContent)) {
    nsisContent = nsisContent.replace(
      regex,
      `!define PRODUCT_VERSION "${version}"`
    );
    fs.writeFileSync(nsisPath, nsisContent);
    console.log(`✅ src-tauri/installer.nsi updated to version ${version}`);
  } else {
    console.warn("⚠️  Could not find PRODUCT_VERSION line in installer.nsi");
  }
} else {
  console.error("❌ installer.nsi not found!");
}
