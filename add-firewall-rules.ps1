# Firewall Setup voor PWA Development
# Run dit script als Administrator

Write-Host "Adding firewall rules for PWA development..." -ForegroundColor Cyan
Write-Host ""

try {
    # Check if Vite rule exists
    $viteRule = Get-NetFirewallRule -DisplayName "Vite Dev Server" -ErrorAction SilentlyContinue
    if (-not $viteRule) {
        New-NetFirewallRule -DisplayName "Vite Dev Server" `
            -Direction Inbound `
            -LocalPort 5173 `
            -Protocol TCP `
            -Action Allow `
            -Profile Any | Out-Null
        Write-Host "[OK] Vite Dev Server (poort 5173) toegevoegd" -ForegroundColor Green
    } else {
        Write-Host "[OK] Vite Dev Server regel bestaat al" -ForegroundColor Gray
    }
    
    # Check if Node Backend rule exists
    $nodeRule = Get-NetFirewallRule -DisplayName "Node Backend" -ErrorAction SilentlyContinue
    if (-not $nodeRule) {
        New-NetFirewallRule -DisplayName "Node Backend" `
            -Direction Inbound `
            -LocalPort 3000 `
            -Protocol TCP `
            -Action Allow `
            -Profile Any | Out-Null
        Write-Host "[OK] Node Backend (poort 3000) toegevoegd" -ForegroundColor Green
    } else {
        Write-Host "[OK] Node Backend regel bestaat al" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Firewall configuratie compleet!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test de backend vanaf je telefoon:" -ForegroundColor Cyan
    Write-Host "  http://192.168.68.122:3000/status" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR: Kon firewall regels niet toevoegen" -ForegroundColor Red
    Write-Host "Zorg dat je dit script als Administrator uitvoert!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Rechtermuisklik op PowerShell -> 'Run as Administrator'" -ForegroundColor White
    Write-Host ""
    exit 1
}
