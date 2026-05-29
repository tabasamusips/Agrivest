#!/bin/bash

###############################################################################
#                                                                             #
#  AgriVest Backend — Database Setup Script                                 #
#  Creates the schema in your Postgres database                             #
#                                                                             #
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Load .env file
load_env() {
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        print_error ".env file not found"
        echo "Run: cp .env.example .env"
        exit 1
    fi
    
    # Source .env (safely, only valid variable names)
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
    
    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL not set in .env"
        exit 1
    fi
    
    print_success ".env loaded"
}

# Check if psql is available
check_psql() {
    if ! command -v psql &> /dev/null; then
        print_error "psql command-line tool not found"
        echo ""
        echo "Install PostgreSQL client tools:"
        echo "  macOS:  brew install postgresql"
        echo "  Ubuntu: sudo apt-get install postgresql-client"
        echo "  Windows: https://www.postgresql.org/download/"
        exit 1
    fi
    
    print_success "psql found"
}

# Test database connection
test_connection() {
    print_info "Testing database connection..."
    
    if psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        echo ""
        echo "Verify DATABASE_URL in .env:"
        echo "  $DATABASE_URL"
        return 1
    fi
}

# Create schema
create_schema() {
    print_header "Creating Database Schema"
    
    echo ""
    print_info "This will create the following tables:"
    echo "  • Ledger: journal_entry, posting, account_balance, investment"
    echo "  • Marketplace: sponsor, project, project_update"
    echo "  • Auth: kyc"
    echo ""
    
    # Run schema files
    print_info "Running packages/ledger/schema.sql..."
    psql "$DATABASE_URL" -f "$SCRIPT_DIR/packages/ledger/schema.sql" > /dev/null
    print_success "Ledger schema created"
    
    echo ""
    print_info "Running packages/marketplace/schema.sql..."
    psql "$DATABASE_URL" -f "$SCRIPT_DIR/packages/marketplace/schema.sql" > /dev/null
    print_success "Marketplace schema created"
    
    echo ""
    print_info "Running packages/api/sql/auth.sql..."
    psql "$DATABASE_URL" -f "$SCRIPT_DIR/packages/api/sql/auth.sql" > /dev/null
    print_success "Auth schema created"
    
    echo ""
    print_success "All schemas created successfully"
}

# Verify schema
verify_schema() {
    print_header "Verifying Schema"
    
    echo ""
    print_info "Tables in database:"
    
    psql "$DATABASE_URL" -t -c "
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    " | while read schema table; do
        if [ -n "$table" ]; then
            echo "  ✓ $table"
        fi
    done
    
    # Count tables
    TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM pg_tables 
        WHERE schemaname = 'public';
    " | tr -d ' ')
    
    echo ""
    print_success "Found $TABLE_COUNT tables"
}

# Show next steps
show_next_steps() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Database setup complete!${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run tests to verify:"
    echo "     ./run.sh test"
    echo ""
    echo "  2. Start the API:"
    echo "     ./run.sh dev"
    echo ""
    echo "  3. Test an endpoint:"
    echo "     curl -X POST http://localhost:3000/auth/request-otp \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"phone\": \"254712345678\"}'"
    echo ""
}

# Backup existing schema (optional)
backup_schema() {
    if [ "$1" = "--backup" ]; then
        BACKUP_FILE="$SCRIPT_DIR/.db-backup-$(date +%Y%m%d-%H%M%S).sql"
        print_warning "Backing up existing schema to $BACKUP_FILE..."
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || true
        print_success "Backup created"
    fi
}

# Drop schema (optional - dangerous!)
drop_schema() {
    if [ "$1" = "--drop" ]; then
        echo ""
        print_warning "WARNING: This will DELETE all data in the database"
        read -p "Type 'yes' to confirm: " CONFIRM
        
        if [ "$CONFIRM" = "yes" ]; then
            print_info "Dropping all tables..."
            psql "$DATABASE_URL" -c "
                DROP TABLE IF EXISTS posting CASCADE;
                DROP TABLE IF EXISTS journal_entry CASCADE;
                DROP TABLE IF EXISTS account_balance CASCADE;
                DROP TABLE IF EXISTS investment CASCADE;
                DROP TABLE IF EXISTS project_update CASCADE;
                DROP TABLE IF EXISTS project CASCADE;
                DROP TABLE IF EXISTS sponsor CASCADE;
                DROP TABLE IF EXISTS kyc CASCADE;
            " > /dev/null
            print_success "All tables dropped"
        else
            print_info "Cancelled"
            exit 0
        fi
    fi
}

# Main script
main() {
    print_header "AgriVest Backend — Database Setup"
    
    echo ""
    
    # Parse options
    backup_schema "$@"
    drop_schema "$@"
    
    # Checks
    check_psql
    echo ""
    load_env
    echo ""
    test_connection || exit 1
    echo ""
    
    # Create schema
    create_schema
    echo ""
    
    # Verify
    verify_schema
    echo ""
    
    # Show next steps
    show_next_steps
}

# Help text
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    cat << EOF

${BLUE}AgriVest — Database Setup Script${NC}

${GREEN}USAGE:${NC}
    ./setup-db.sh [OPTIONS]

${GREEN}OPTIONS:${NC}
    --backup            Backup existing database before setup
    --drop              Drop all tables first (DANGEROUS!)
    -h, --help          Show this help message

${GREEN}EXAMPLES:${NC}
    # Normal setup
    ./setup-db.sh
    
    # With backup first
    ./setup-db.sh --backup
    
    # Clean slate (drop then create)
    ./setup-db.sh --drop

${GREEN}REQUIREMENTS:${NC}
    • .env file with DATABASE_URL
    • psql command-line tool installed
    • PostgreSQL database running

${GREEN}WHAT IT DOES:${NC}
    1. Loads DATABASE_URL from .env
    2. Tests connection to database
    3. Creates ledger schema (journal_entry, posting, etc.)
    4. Creates marketplace schema (sponsor, project, etc.)
    5. Creates auth schema (kyc)
    6. Verifies tables were created
    7. Shows next steps

${GREEN}SCHEMA CREATED:${NC}
    Ledger:
      • journal_entry     (append-only transaction log)
      • posting           (double-entry postings)
      • account_balance   (rollup for fast reads)
      • investment        (48h cooling-off registry)
    
    Marketplace:
      • sponsor           (project sponsors)
      • project           (projects/ventures)
      • project_update    (milestone updates)
    
    Auth:
      • kyc               (KYC verification status)

${GREEN}BACKUP FILES:${NC}
    If you use --backup, a dump file is created:
      .db-backup-YYYYMMDD-HHMMSS.sql

EOF
    exit 0
fi

main "$@"
