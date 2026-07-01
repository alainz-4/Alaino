$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = 'C:\Users\Alain\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$nodeFallback = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$nodeExe = if (Test-Path $nodeExe) { $nodeExe } elseif ($nodeFallback) { $nodeFallback } else { throw 'Node.js was not found.' }

$serverCandidates = @(
  (Join-Path $repoRoot 'apps\server\dist\apps\server\src\index.js'),
  (Join-Path $repoRoot 'apps\server\dist\index.js')
)
$serverScript = $serverCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $serverScript) {
  throw 'Could not find the compiled server entrypoint.'
}
$webServerScript = Join-Path $repoRoot 'scripts\static-web-server.mjs'
$serverCwd = Join-Path $repoRoot 'apps\server'

$env:PATH = ''
$env:Path = ''

Start-Process -FilePath $nodeExe -ArgumentList ('"' + $serverScript + '"') -WorkingDirectory $serverCwd -WindowStyle Hidden | Out-Null
Start-Process -FilePath $nodeExe -ArgumentList ('"' + $webServerScript + '"') -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null

Start-Sleep -Milliseconds 1500
Start-Process -FilePath 'C:\WINDOWS\System32\cmd.exe' -ArgumentList '/c start "" http://127.0.0.1:5173' -WindowStyle Hidden | Out-Null
