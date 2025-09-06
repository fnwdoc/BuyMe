@echo off
echo Instalando dependencias (isso pode levar um momento na primeira vez)...
pip install -r requirements.txt

echo.
echo Iniciando o servidor local...
echo Se o servidor iniciar corretamente, voce podera acessa-lo em http://localhost:8000
echo.
echo Para parar o servidor, feche esta janela ou pressione Ctrl+C.
echo.
python server.py
pause
