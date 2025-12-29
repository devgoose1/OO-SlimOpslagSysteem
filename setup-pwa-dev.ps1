# PWA Development Startup Script
# Run this in PowerShell as Administrator

Write-Host "Setting up PWA Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator!" -ForegroundColor Yellow
    Write-Host "Firewall rules kunnen niet worden toegevoegd zonder admin rechten." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Doorgaan zonder firewall regels? (y/n)"
    if ($continue -ne 'y') {
        exit
    }
}

# Add firewall rules if admin
if ($isAdmin) {
    Write-Host "Adding firewall rules..." -ForegroundColor Green
    
    # Check if rules already exist
    $existingVite = Get-NetFirewallRule -DisplayName "Vite Dev Server" -ErrorAction SilentlyContinue
    $existingNode = Get-NetFirewallRule -DisplayName "Node Backend" -ErrorAction SilentlyContinue
    
    if (-not $existingVite) {
        New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow | Out-Null
        Write-Host "  Vite Dev Server (5173) toegevoegd" -ForegroundColor Green
    } else {
        Write-Host "  Vite Dev Server regel bestaat al" -ForegroundColor Gray
    }
    
    if (-not $existingNode) {
        New-NetFirewallRule -DisplayName "Node Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow | Out-Null
        Write-Host "  Node Backend (3000) toegevoegd" -ForegroundColor Green
    } else {
        Write-Host "  Node Backend regel bestaat al" -ForegroundColor Gray
    }
    Write-Host ""
}

# Get IP addresses
Write-Host "Network Configuration:" -ForegroundColor Cyan
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.' }
foreach ($ip in $ipAddresses) {
    Write-Host "  Local IP: $($ip.IPAddress)" -ForegroundColor Yellow
}
Write-Host ""

# Display access URLs
$localIP = ($ipAddresses | Select-Object -First 1).IPAddress
if ($localIP) {
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "  Telefoon: http://$localIP:5173" -ForegroundColor Green
    Write-Host "  Laptop:   http://localhost:5173" -ForegroundColor Green
    Write-Host "  Backend:  http://$localIP:3000" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open een PowerShell terminal" -ForegroundColor White
Write-Host "2. Voer uit: " -ForegroundColor White -NoNewline
Write-Host "npm start" -ForegroundColor Yellow
Write-Host "   (Dit start automatisch backend EN frontend!)" -ForegroundColor Gray
Write-Host ""
Write-Host "Open op je telefoon: " -ForegroundColor White -NoNewline
Write-Host "http://$localIP:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Lees PWA_TESTING.md voor volledige instructies" -ForegroundColor Cyan
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
