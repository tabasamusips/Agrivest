@echo off
REM ============================================================================
REM  AgriVest Backend - Main Run Script (Windows)
REM  Usage: run.bat [dev|prod|test|build|setup]
REM ============================================================================

setlocal enabledelayedexpansion

REM Colors (Windows 10+)
set "BLUE=[0;34m"
set "GREEN=[0;32m"
set "YELLOW=[1;33m"
set "RED=[0;31m"
set "NC=[0m"

REM ============================================================================
REM Functions
REM ============================================================================

:print_header
echo.
echo ============================================================
echo  %~1
echo ============================================================
echo.
exit /b 0

:print_success
echo [OK] %~1
exit /b 0

:print_error
echo [ERROR] %~1
exit /b 0

:print_warning
echo [WARNING] %~1
exit /b 0

:print_info
echo [INFO] %~1
exit /b 0

:check_node
echo Checking for Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 20+ from https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% found
exit /b 0

:check_env
if not exist .env (
    echo [WARNING] .env file not found
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env
        echo [WARNING] Please edit .env and fill in:
        echo   - DATABASE_URL
        echo   - JWT_SECRET
        echo   - Optional: M-Pesa credentials
        exit /b 1
    )
) else (
    echo [OK] .env file found
)
exit /b 0

:setup
call :print_header "Setting up AgriVest Backend"

call :check_node
if errorlevel 1 exit /b 1

echo.
echo [INFO] Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    exit /b 1
)
echo [OK] Dependencies installed

echo.
call :check_env
if errorlevel 1 (
    echo.
    echo [WARNING] Setup incomplete - please configure .env
    exit /b 1
)

echo.
echo [OK] Setup complete!
echo.
echo Next steps:
echo   1. Edit .env and add DATABASE_URL + JWT_SECRET
echo   2. Create database schema:
echo      psql "!DATABASE_URL!" -f packages/ledger/schema.sql
echo      psql "!DATABASE_URL!" -f packages/marketplace/schema.sql
echo      psql "!DATABASE_URL!" -f packages/api/sql/auth.sql
echo   3. Run the API: run.bat dev
exit /b 0

:test_project
call :print_header "Running Tests"

call :check_node
if errorlevel 1 exit /b 1

echo.
echo [INFO] Running all tests (ledger + marketplace + API e2e)...
call npm test
if errorlevel 1 (
    echo [ERROR] Tests failed
    exit /b 1
)

echo.
echo [INFO] Running API end-to-end tests...
call npm run test:e2e -w @agrivest/api
if errorlevel 1 (
    echo [ERROR] API tests failed
    exit /b 1
)

echo.
echo [OK] All tests passed!
exit /b 0

:build_project
call :print_header "Building AgriVest"

call :check_node
if errorlevel 1 exit /b 1

echo.
echo [INFO] Building all packages...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)

echo.
echo [OK] Build complete!
echo.
echo Output:
echo   - packages/ledger/dist/
echo   - packages/marketplace/dist/
echo   - packages/api/dist/
exit /b 0

:typecheck
call :print_header "Type Checking"

call :check_node
if errorlevel 1 exit /b 1

echo.
echo [INFO] Running TypeScript type check...
call npm run typecheck
if errorlevel 1 (
    echo [ERROR] Type check failed
    exit /b 1
)

echo.
echo [OK] Type check passed!
exit /b 0

:dev_mode
call :print_header "AgriVest API - Development Mode"

call :check_node
if errorlevel 1 exit /b 1

call :check_env
if errorlevel 1 (
    echo.
    echo [ERROR] Cannot start - .env not configured
    exit /b 1
)

echo.
echo [INFO] Starting API server with auto-reload...
echo [INFO] API will be available at http://localhost:3000
echo.

call npm run dev:api
exit /b %errorlevel%

:prod_mode
call :print_header "AgriVest API - Production Mode"

call :check_node
if errorlevel 1 exit /b 1

call :check_env
if errorlevel 1 (
    echo.
    echo [ERROR] Cannot start - .env not configured
    exit /b 1
)

if not exist packages\api\dist\main.js (
    echo [WARNING] API not yet built
    echo.
    echo [INFO] Building the project...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build failed
        exit /b 1
    )
    echo.
)

echo [OK] Starting API server...
echo [INFO] API will be available at http://localhost:3000
echo.

set NODE_ENV=production
call node packages\api\dist\main.js
exit /b %errorlevel%

:demo
call :print_header "Ledger Lifecycle Demo"

call :check_node
if errorlevel 1 exit /b 1

echo.
echo [INFO] Running narrated walkthrough of the ledger...
echo.

call npm run demo -w @agrivest/ledger
exit /b %errorlevel%

:show_help
cls
echo.
echo ============================================================
echo  AgriVest Backend - Run Script (Windows)
echo ============================================================
echo.
echo USAGE:
echo   run.bat [COMMAND]
echo.
echo COMMANDS:
echo   setup       Build everything ^& prepare to run
echo   dev         Run API in development mode (with auto-reload)
echo   prod        Run API in production mode (requires build)
echo   build       Build all packages
echo   test        Run all tests (31 tests)
echo   typecheck   Run TypeScript type check
echo   demo        Run narrated ledger lifecycle demo
echo   help        Show this help message
echo.
echo EXAMPLES:
echo   REM One-time setup
echo   run.bat setup
echo.
echo   REM Development workflow
echo   run.bat dev
echo.
echo   REM Production deployment
echo   run.bat build
echo   run.bat prod
echo.
echo   REM Verify everything works
echo   run.bat test
echo.
echo QUICK START:
echo   1. run.bat setup
echo   2. Edit .env file (add DATABASE_URL ^& JWT_SECRET)
echo   3. run.bat test
echo   4. run.bat dev
echo.
echo ENVIRONMENT:
echo   DATABASE_URL   PostgreSQL connection string (required)
echo   JWT_SECRET     Secret key for JWT signing (required)
echo   NODE_ENV       'development' or 'production' (default: dev)
echo   PORT           Server port (default: 3000)
echo.
echo DOCUMENTATION:
echo   README.md        Full setup ^& API reference
echo   QUICK_START.md   Quick reference card
echo   API-ENDPOINTS.md Detailed endpoint specs
echo.
exit /b 0

REM ============================================================================
REM Main
REM ============================================================================

if "%1"=="" goto show_help
if /i "%1"=="help" goto show_help
if /i "%1"=="-h" goto show_help
if /i "%1"=="--help" goto show_help

if /i "%1"=="setup" goto setup
if /i "%1"=="dev" goto dev_mode
if /i "%1"=="prod" goto prod_mode
if /i "%1"=="build" goto build_project
if /i "%1"=="test" goto test_project
if /i "%1"=="typecheck" goto typecheck
if /i "%1"=="demo" goto demo

echo [ERROR] Unknown command: %1
echo.
call :show_help
exit /b 1

endlocal
