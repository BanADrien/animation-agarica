# Opens a jump pose PNG in Pixelorama. Called by Windows for links "pixelorama-edit:<path>" (see installer.ps1).
# While Pixelorama runs, every save of the PNG reloads the images of the pages (tools/refresh-jump.cjs).
param([string]$Url)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$log = Join-Path $PSScriptRoot 'journal.txt'
function Say($text) { Add-Type -AssemblyName System.Windows.Forms; [void][System.Windows.Forms.MessageBox]::Show($text, 'Modifier dans Pixelorama') }
try {
  # Any web page could use this link: only open PNG files of assets\jump\poses, nothing else.
  $rel = [uri]::UnescapeDataString(($Url -replace '^pixelorama-edit:(//)?', '')).TrimEnd('/').Replace('/', '\')
  $poses = Join-Path $root 'assets\jump\poses\'
  $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
  if (-not $file.StartsWith($poses, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetExtension($file) -ne '.png' -or -not (Test-Path -LiteralPath $file)) { Say "Image refusée : $rel"; exit 1 }
  $exeFile = Join-Path $PSScriptRoot 'chemin.txt'
  $exe = if (Test-Path $exeFile) { (Get-Content $exeFile -Raw).Trim() } else { '' }
  if (-not $exe -or -not (Test-Path -LiteralPath $exe)) { Say "Pixelorama est introuvable. Relance installer-pixelorama.bat."; exit 1 }

  Start-Process -FilePath $exe -ArgumentList "`"$file`""
  $name = [IO.Path]::GetFileNameWithoutExtension($exe)
  # Wait for Pixelorama to start (a Steam copy may relaunch itself), then watch the PNG until it closes.
  for ($i = 0; $i -lt 30 -and -not (Get-Process -Name $name -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 500 }
  $last = (Get-Item -LiteralPath $file).LastWriteTimeUtc
  while (Get-Process -Name $name -ErrorAction SilentlyContinue) {
    Start-Sleep -Seconds 1
    $now = (Get-Item -LiteralPath $file).LastWriteTimeUtc
    if ($now -ne $last) {
      Start-Sleep -Milliseconds 700  # let Pixelorama finish writing
      $last = (Get-Item -LiteralPath $file).LastWriteTimeUtc
      $out = & node (Join-Path $root 'tools\refresh-jump.cjs') 2>&1
      Add-Content $log "$(Get-Date -Format s) $rel`r`n$($out -join "`r`n")"
    }
  }
} catch { Add-Content $log "$(Get-Date -Format s) ERREUR $($_.Exception.Message)"; Say "Erreur : $($_.Exception.Message)" }
