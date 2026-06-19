# Load app settings
$appSettingsPath = Join-Path $PSScriptRoot "appsettings.copilot.json"

if (-not (Test-Path $appSettingsPath)) {
    Write-Error "Missing appsettings.copilot.json. Create it before running this script."
    exit 1
}

$appSettings = Get-Content $appSettingsPath | ConvertFrom-Json

# Apply environment variables
$appSettings.PSObject.Properties | ForEach-Object {
    $name = $_.Name
    $value = $_.Value
    Write-Host "Setting $name"
    Set-Item -Path "Env:${name}" -Value $value
}

# Launch Copilot
Write-Host "Launching Copilot..."
copilot
