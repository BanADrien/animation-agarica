# Registers the "pixelorama-edit:" links for this Windows user (no administrator rights), used by the button
# "Modifier dans Pixelorama" of editeur.html. -Remove unregisters them.
param([switch]$Remove)
$key = 'HKCU:\Software\Classes\pixelorama-edit'
if ($Remove) { Remove-Item $key -Recurse -ErrorAction SilentlyContinue; Write-Host 'Liens pixelorama-edit supprimés.'; exit }

$saved = Join-Path $PSScriptRoot 'chemin.txt'
$exe = if (Test-Path $saved) { (Get-Content $saved -Raw).Trim() } else { '' }
if (-not $exe -or -not (Test-Path -LiteralPath $exe)) {
  $places = @("$env:ProgramFiles", "${env:ProgramFiles(x86)}", "$env:LOCALAPPDATA", "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", "${env:ProgramFiles(x86)}\Steam\steamapps\common") | Where-Object { $_ -and (Test-Path $_) }
  $exe = $places | ForEach-Object { Get-ChildItem $_ -Filter 'Pixelorama*.exe' -Recurse -Depth 4 -ErrorAction SilentlyContinue } | Where-Object { $_.Name -notmatch 'console' } | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $exe) {
  Write-Host 'Pixelorama introuvable automatiquement : choisis Pixelorama.exe dans la fenêtre.'
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.OpenFileDialog -Property @{ Title = 'Où est Pixelorama.exe ?'; Filter = 'Pixelorama|Pixelorama*.exe|Programmes|*.exe' }
  if ($dialog.ShowDialog() -ne 'OK') { Write-Host 'Annulé.'; exit 1 }
  $exe = $dialog.FileName
}
Set-Content -Path $saved -Value $exe -Encoding UTF8

$script = Join-Path $PSScriptRoot 'ouvrir.ps1'
New-Item -Path "$key\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path $key -Name '(default)' -Value 'URL:Modifier dans Pixelorama'
Set-ItemProperty -Path $key -Name 'URL Protocol' -Value ''
Set-ItemProperty -Path "$key\shell\open\command" -Name '(default)' -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" `"%1`""
Write-Host "Prêt. Pixelorama : $exe"
Write-Host 'Dans editeur.html, le bouton « Modifier dans Pixelorama » ouvre maintenant le membre choisi.'
