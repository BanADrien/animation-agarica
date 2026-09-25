@echo off
rem Recharge les calques retouches (assets\jump\poses) dans editeur.html et saut.html.
cd /d "%~dp0"
node toolsefresh-jump.cjs
echo.
echo Recharge editeur.html avec Ctrl + F5.
pause
