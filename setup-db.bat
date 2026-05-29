@echo off
REM ============================================================================
REM  AgriVest Backend - Database Setup Script (Windows)
REM  Creates the schema in your Postgres database
REM ============================================================================

setlocal enabledelayedexpansion

REM ============================================================================
REM Functions
REM ============================================================================

:load_env
if not exist .env (
    echo [ERROR] .env file not found
    echo Run: copy .env.example .env
    exit /b 1
)

for /f "delims==" %%a in ('type .env ^| find "DATABASE_URL"') do set "%%a"

if "!DATABASE_URL!"=="" (
    echo [ERROR] DATABASE_URL not set in .env
    exit /b 1
)

echo [OK] .env loaded
exit /b 0

:check_psql
where psql >nul 2>nul
if errorlevel 1 (
    echo [ERROR] psql command-line tool not found
    echo.
    echo Install PostgreSQL:
    echo   Windows: https://www.postgresql.org/download/
    echo.
    echo Or use:
    echo   choco install postgresql
    exit /b 1
)

echo [OK] psql found
exit /b 0

:test_connection
echo [INFO] Testing database connection...

psql "!DATABASE_URL!" -c "SELECT NOW();" >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot connect to database
    echo.
    echo Verify DATABASE_URL in .env:
    echo   !DATABASE_URL!
    exit /b 1
)

echo [OK] Database connection successful
exit /b 0

:create_schema
echo.
echo ============================================================
echo  Creating Database Schema
echo ============================================================
echo.

echo [INFO] This will create the following tables:
echo   - Ledger: journal_entry, posting, account_balance, investment
echo   - Marketplace: sponsor, project, project_update
echo   - Auth: kyc
echo.

echo [INFO] Running packages/ledger/schema.sql...
psql "!DATABASE_URL!" -f packages\ledger\schema.sql >nul
if errorlevel 1 (
    echo [ERROR] Failed to create ledger schema
    exit /b 1
)
echo [OK] Ledger schema created

echo.
echo [INFO] Running packages/marketplace/schema.sql...
psql "!DATABASE_URL!" -f packages\marketplace\schema.sql >nul
if errorlevel 1 (
    echo [ERROR] Failed to create marketplace schema
    exit /b 1
)
echo [OK] Marketplace schema created

echo.
echo [INFO] Running packages/api/sql/auth.sql...
psql "!DATABASE_URL!" -f packages\api\sql\auth.sql >nul
if errorlevel 1 (
    echo [ERROR] Failed to create auth schema
    exit /b 1
)
echo [OK] Auth schema created

echo.
echo [OK] All schemas created successfully
exit /b 0

:verify_schema
echo.
echo ============================================================
echo  Verifying Schema
echo ============================================================
echo.

echo [INFO] Tables in database:

psql "!DATABASE_URL!" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" | for /f "delims=" %%a in ('findstr .') do (
    if not "%%a"=="" echo   - %%a
)

echo.
echo [OK] Schema verification complete
exit /b 0

:show_next_steps
echo.
echo ============================================================
echo  Database setup complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Run tests to verify:
echo      run.bat test
echo.
echo   2. Start the API:
echo      run.bat dev
echo.
echo   3. Test an endpoint:
echo      curl -X POST http://localhost:3000/auth/request-otp ^
echo        -H "Content-Type: application/json" ^
echo        -d "{\"phone\": \"254712345678\"}"
echo.
exit /b 0

:show_help
cls
echo.
echo ============================================================
echo  AgriVest - Database Setup Script (Windows)
echo ============================================================
echo.
echo USAGE:
echo   setup-db.bat [OPTIONS]
echo.
echo OPTIONS:
echo   (no options)     Normal setup
echo   -h, --help       Show this help message
echo.
echo EXAMPLES:
echo   REM Normal setup
echo   setup-db.bat
echo.
echo REQUIREMENTS:
echo   - .env file with DATABASE_URL
echo   - psql command-line tool installed
echo   - PostgreSQL database running
echo.
echo WHAT IT DOES:
echo   1. Loads DATABASE_URL from .env
echo   2. Tests connection to database
echo   3. Creates ledger schema
echo   4. Creates marketplace schema
echo   5. Creates auth schema
echo   6. Verifies tables were created
echo.
echo SCHEMA CREATED:
echo   Ledger:
echo     - journal_entry
echo     - posting
echo     - account_balance
echo     - investment
echo.
echo   Marketplace:
echo     - sponsor
echo     - project
echo     - project_update
echo.
echo   Auth:
echo     - kyc
echo.
exit /b 0

REM ============================================================================
REM Main
REM ============================================================================

if "%1"=="" goto main
if /i "%1"="-h" goto show_help
if /i "%1"=="--help" goto show_help

:main
echo.
echo ============================================================
echo  AgriVest Backend - Database Setup
echo ============================================================
echo.

call :check_psql
if errorlevel 1 exit /b 1

echo.
call :load_env
if errorlevel 1 exit /b 1

echo.
call :test_connection
if errorlevel 1 exit /b 1

echo.
call :create_schema
if errorlevel 1 exit /b 1

echo.
call :verify_schema

call :show_next_steps

endlocal
