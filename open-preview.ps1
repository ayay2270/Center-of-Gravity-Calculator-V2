param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$taskUrl = 'http://127.0.0.1:4527/'
function Test-PrototypeReady {
    try {
        $taskResponse = Invoke-WebRequest -Uri $taskUrl -UseBasicParsing -TimeoutSec 2
        return ($taskResponse.StatusCode -eq 200 -and $taskResponse.Content.Contains('Version A'))
    } catch { return $false }
}
if (-not (Test-PrototypeReady)) {
    if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist/index.html'))) {
        throw 'Missing build. Run npm install and npm run build in this project folder.'
    }
    $taskNode = (Get-Command node -ErrorAction Stop).Source
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList 'server.mjs' -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'qa/launcher.log') -RedirectStandardError (Join-Path $taskRoot 'qa/launcher-error.log') -PassThru
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
        if (Test-PrototypeReady) { $taskReady = $true; break }
        if ($taskProcess.HasExited) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not $taskReady) { throw 'Preview did not start. Check qa/launcher-error.log; port 4527 may be in use.' }
}
Write-Output ('Version A ready: ' + $taskUrl)
if (-not $NoBrowser) { Start-Process $taskUrl }
