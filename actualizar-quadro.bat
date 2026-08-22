@echo off
REM Actualiza o plugin QUADRO OS (quadro@catalyzer-quadro) neste projecto e
REM reinicia o servidor local com o codigo mais recente de
REM D:\aps\osia\AgentOS\quadro. Ver PROCEDIMENTO-INSTALACAO-QUADRO.txt no
REM repositorio do plugin para o procedimento completo.
cd /d "%~dp0"

echo A actualizar o marketplace catalyzer-quadro...
claude plugin marketplace update catalyzer-quadro
if errorlevel 1 goto erro

echo A actualizar o plugin quadro@catalyzer-quadro...
claude plugin update quadro@catalyzer-quadro --scope project
if errorlevel 1 goto erro

echo A reiniciar o servidor QUADRO OS (porta 4317) com o codigo mais recente...
"D:\Users\M001419\.bun\bin\bun.exe" "D:\aps\osia\AgentOS\quadro\bin\quadro" stop
"D:\Users\M001419\.bun\bin\bun.exe" "D:\aps\osia\AgentOS\quadro\bin\quadro" ensure-server

echo.
echo Feito. Dentro da sessao Claude Code deste projecto, corre /reload-plugins
echo para os hooks e agentes ficarem activos (skills ja actualizam sem reload).
echo Painel: http://127.0.0.1:4317
pause
goto fim

:erro
echo Falhou a actualizar o plugin. Ver a mensagem acima.
pause

:fim
