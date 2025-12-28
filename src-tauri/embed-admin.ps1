$ErrorActionPreference = "Stop"

Write-Host "`n=== Embedding Administrator Manifest ===" -ForegroundColor Cyan

$exePath = "target\release\rbw-vpn-client.exe"
$manifestPath = "app.manifest"

# Check files exist
if (!(Test-Path $exePath)) {
    Write-Host "❌ Executable not found!" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $manifestPath)) {
    Write-Host "❌ Manifest not found!" -ForegroundColor Red
    exit 1
}

# Find mt.exe
$mtPaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.*\x64\mt.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\mt.exe"
)

$mtPath = $null
foreach ($pattern in $mtPaths) {
    $found = Get-Item $pattern -ErrorAction SilentlyContinue | 
             Sort-Object -Descending | 
             Select-Object -First 1
    if ($found) {
        $mtPath = $found.FullName
        break
    }
}

if (!$mtPath) {
    Write-Host "❌ mt.exe not found! Install Windows SDK" -ForegroundColor Red
    Write-Host "Download: https://developer.microsoft.com/windows/downloads/windows-sdk/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using: $mtPath" -ForegroundColor Gray

# Embed manifest
Write-Host "Embedding manifest..." -ForegroundColor Yellow
$output = & $mtPath -manifest $manifestPath -outputresource:"$exePath;#1" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Manifest embedded successfully!" -ForegroundColor Green
    
    # Verify
    Write-Host "Verifying..." -ForegroundColor Gray
    & $mtPath -inputresource:"$exePath;#1" -out:temp-manifest.xml 2>&1 | Out-Null
    
    if ((Get-Content temp-manifest.xml -Raw -ErrorAction SilentlyContinue) -match "requireAdministrator") {
        Write-Host "✅ Verification passed: requireAdministrator found!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Verification failed!" -ForegroundColor Yellow
    }
    
    Remove-Item temp-manifest.xml -ErrorAction SilentlyContinue
    
    Write-Host "`n=== Build Complete ===" -ForegroundColor Cyan
    Write-Host "Executable: $exePath" -ForegroundColor White
} else {
    Write-Host "❌ Failed to embed manifest!" -ForegroundColor Red
    Write-Host $output -ForegroundColor Red
    exit 1
}