@echo off
echo ========================================
echo  Cubo Digital - Modo Desarrollo Local
echo ========================================
echo.
echo Abriendo tunnel SSH a la base de datos...
echo (Deja esta ventana abierta mientras trabajas)
echo.
echo Una vez conectado, abre OTRA terminal y ejecuta:
echo   pnpm dev
echo.
echo Luego abre el navegador en: http://localhost:3000
echo.
echo Para cerrar: presiona Ctrl+C en esta ventana
echo ========================================
ssh -N -L 5432:172.19.0.8:5432 root@65.109.226.59
