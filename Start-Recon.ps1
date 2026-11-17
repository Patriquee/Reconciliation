$reconRoot = $PSScriptRoot
$running = Test-NetConnection -ComputerName 127.0.0.1 -Port 8877 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $running) {
    Start-Process -FilePath 'node' -ArgumentList ('"' + (Join-Path $reconRoot 'preview-server.js') + '"') -WorkingDirectory $reconRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}
Start-Process 'http://127.0.0.1:8877/Recon.HTML'
