@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul && (py -3 server.py & goto :eof)
where python >nul 2>nul && (python server.py & goto :eof)
echo Python 3 est introuvable. Installez-le depuis https://www.python.org/downloads/
echo (cochez "Add python.exe to PATH") puis relancez ce fichier.
pause
