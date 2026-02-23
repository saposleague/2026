@echo off
echo ========================================
echo   Gerador de Chaves VAPID
echo   Sapos League - Notificacoes iOS
echo ========================================
echo.

cd functions

echo Gerando chaves VAPID...
echo.

call npx web-push generate-vapid-keys

echo.
echo ========================================
echo   IMPORTANTE!
echo ========================================
echo.
echo 1. Copie a chave PUBLICA e substitua em:
echo    - js/fcm-notifications.js
echo    - js/web-push-ios.js
echo    - debug-ios.html
echo    - test-ios-push.html
echo.
echo 2. Copie a chave PRIVADA e substitua em:
echo    - functions/index.js
echo.
echo 3. Faca o deploy:
echo    firebase deploy --only functions,hosting
echo.
echo ========================================

pause
