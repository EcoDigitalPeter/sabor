setx QUADRO_PORT 4319
@echo off
REM Levanta servidor QUADRO OS para este projecto (porta 4317).
cd /d "%~dp0"
"D:\Users\M001419\.bun\bin\bun.exe" "D:\aps\osia\AgentOS\quadro\bin\quadro" ensure-server
echo Painel: http://127.0.0.1:4317
pause
