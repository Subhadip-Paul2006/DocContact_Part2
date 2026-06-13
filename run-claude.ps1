# Script to run Claude CLI using the environment variables from .settings.local.json

$settingsPath = ""
if (Test-Path ".\.settings.local.json") {
    $settingsPath = ".\.settings.local.json"
} elseif (Test-Path "..\DocContact\.settings.local.json") {
    $settingsPath = "..\DocContact\.settings.local.json"
} else {
    Write-Error "Could not find .settings.local.json"
    exit 1
}

Write-Host "Loading environment from $settingsPath..."
$settings = Get-Content -Raw -Path $settingsPath | ConvertFrom-Json
foreach ($prop in $settings.env.PSObject.Properties) {
    [System.Environment]::SetEnvironmentVariable($prop.Name, $prop.Value, "Process")
    Write-Host "Set $($prop.Name)"
}

# Remove conflicting key if present to ensure TokenRouter authentication works
Remove-Item Env:\ANTHROPIC_API_KEY -ErrorAction SilentlyContinue

Write-Host "Starting claude..."
claude
