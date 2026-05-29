#!/bin/bash

###############################################################################
#                                                                             #
#  AgriVest Backend — Main Run Script                                        #
#  Usage: ./run.sh [dev|prod|test|build|setup]                              #
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

# Helper functions
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

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js 20+ from https://nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    print_success "Node.js $NODE_VERSION found"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_success "npm $NPM_VERSION found"
}

# Check if .env file exists
check_env() {
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        print_warning ".env file not found"
        if [ -f "$SCRIPT_DIR/.env.example" ]; then
            echo "Creating .env from .env.example..."
            cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
            print_warning "Please edit .env and fill in:"
            echo "  - DATABASE_URL"
            echo "  - JWT_SECRET (or run: openssl rand -hex 32)"
            echo "  - Optional: M-Pesa credentials"
            return 1
        fi
    else
        print_success ".env file found"
    fi
    return 0
}

# Install dependencies
setup() {
    print_header "Setting up AgriVest Backend"
    
    check_node
    
    echo ""
    print_info "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed"
    
    echo ""
    if ! check_env; then
        echo ""
        print_warning "Setup incomplete - please configure .env"
        echo "Edit the file and run: ./run.sh setup again"
        return 1
    fi
    
    echo ""
    print_success "Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Edit .env and add DATABASE_URL + JWT_SECRET"
    echo "  2. Create database schema:"
    echo "     psql \"\$DATABASE_URL\" -f packages/ledger/schema.sql"
    echo "     psql \"\$DATABASE_URL\" -f packages/marketplace/schema.sql"
    echo "     psql \"\$DATABASE_URL\" -f packages/api/sql/auth.sql"
    echo "  3. Run the API: ./run.sh dev"
}

# Run tests
test_project() {
    print_header "Running Tests"
    
    check_node
    
    echo ""
    print_info "Running all tests (ledger + marketplace + API e2e)..."
    npm test
    
    echo ""
    print_info "Running API end-to-end tests..."
    npm run test:e2e -w @agrivest/api
    
    echo ""
    print_success "All tests passed!"
}

# Build the project
build_project() {
    print_header "Building AgriVest"
    
    check_node
    
    echo ""
    print_info "Building all packages..."
    npm run build
    
    echo ""
    print_success "Build complete!"
    echo "Output:"
    echo "  - packages/ledger/dist/"
    echo "  - packages/marketplace/dist/"
    echo "  - packages/api/dist/"
}

# Run type check
typecheck() {
    print_header "Type Checking"
    
    check_node
    
    echo ""
    print_info "Running TypeScript type check..."
    npm run typecheck
    
    echo ""
    print_success "Type check passed!"
}

# Development mode (with auto-reload)
dev_mode() {
    print_header "AgriVest API — Development Mode"
    
    check_node
    
    if ! check_env; then
        echo ""
        print_error "Cannot start - .env not configured"
        exit 1
    fi
    
    echo ""
    print_info "Starting API server with auto-reload (tsx watch)..."
    print_info "API will be available at http://localhost:${PORT:-3000}"
    echo ""
    
    npm run dev:api
}

# Production mode (pre-built)
prod_mode() {
    print_header "AgriVest API — Production Mode"
    
    check_node
    
    if ! check_env; then
        echo ""
        print_error "Cannot start - .env not configured"
        exit 1
    fi
    
    # Check if already built
    if [ ! -f "$SCRIPT_DIR/packages/api/dist/main.js" ]; then
        print_warning "API not yet built"
        echo ""
        print_info "Building the project..."
        npm run build
        echo ""
    fi
    
    print_success "Starting API server..."
    print_info "API will be available at http://localhost:${PORT:-3000}"
    echo ""
    
    NODE_ENV=production node packages/api/dist/main.js
}

# Run demo (narrated lifecycle)
demo() {
    print_header "Ledger Lifecycle Demo"
    
    check_node
    
    echo ""
    print_info "Running narrated walkthrough of the ledger..."
    echo ""
    
    npm run demo -w @agrivest/ledger
}

# Show help
show_help() {
    cat << EOF

${BLUE}AgriVest Backend — Run Script${NC}

${GREEN}USAGE:${NC}
    ./run.sh [COMMAND]

${GREEN}COMMANDS:${NC}
    setup                Build everything & prepare to run
    dev                  Run API in development mode (with auto-reload)
    prod                 Run API in production mode (requires build)
    build                Build all packages
    test                 Run all tests (31 tests)
    typecheck            Run TypeScript type check
    demo                 Run narrated ledger lifecycle demo
    help                 Show this help message

${GREEN}EXAMPLES:${NC}
    # One-time setup
    ./run.sh setup

    # Development workflow
    ./run.sh dev                    # Start with auto-reload
    
    # Production deployment
    ./run.sh build
    ./run.sh prod
    
    # Verify everything works
    ./run.sh test

${GREEN}QUICK START:${NC}
    1. ./run.sh setup              # Install & configure
    2. Edit .env file              # Add DATABASE_URL & JWT_SECRET
    3. ./run.sh test               # Verify (31 tests)
    4. ./run.sh dev                # Run on http://localhost:3000

${GREEN}ENVIRONMENT:${NC}
    DATABASE_URL    PostgreSQL connection string (required)
    JWT_SECRET      Secret key for JWT signing (required)
    NODE_ENV        Set to 'development' or 'production' (default: development)
    PORT            Server port (default: 3000)

    Generate JWT_SECRET:
    $ openssl rand -hex 32

${GREEN}DOCUMENTATION:${NC}
    README.md        Full setup & API reference
    QUICK_START.md   Quick reference card
    API-ENDPOINTS.md Detailed endpoint specs

${GREEN}PROJECT STRUCTURE:${NC}
    packages/
    ├── ledger/       Double-entry ledger core
    ├── marketplace/  Sponsors & projects
    └── api/          NestJS HTTP API

EOF
}

# Main script logic
main() {
    case "${1:-help}" in
        setup)
            setup
            ;;
        dev)
            dev_mode
            ;;
        prod)
            prod_mode
            ;;
        build)
            build_project
            ;;
        test)
            test_project
            ;;
        typecheck)
            typecheck
            ;;
        demo)
            demo
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
