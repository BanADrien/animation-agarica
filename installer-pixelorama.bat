@echo off
rem Active le bouton "Modifier dans Pixelorama" de editeur.html (a lancer une fois).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File tools\pixelorama\installer.ps1
pause
