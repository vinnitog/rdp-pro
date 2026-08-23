@echo off
setlocal
cd /d "%~dp0"

node tests\patient-auth-regression.test.js || exit /b 1
node tests\data-rights-regression.test.js || exit /b 1
node tests\sql-rpc-regression.test.js || exit /b 1
node tests\edge-security-regression.test.js || exit /b 1
node tests\html-security-regression.test.js || exit /b 1
node tests\accessibility-regression.test.js || exit /b 1
node tests\version-secrets-regression.test.js || exit /b 1
node tests\ui-consistency.test.js || exit /b 1
node tests\repo-policy.test.js || exit /b 1
node tests\sw-cache.test.js || exit /b 1
node --check js\config.js || exit /b 1
node --check js\db.js || exit /b 1
node --check js\app.js || exit /b 1
node --check js\therapist.js || exit /b 1
node --check sw.js || exit /b 1
