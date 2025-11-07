#!/bin/bash

# Asset Management System - Startup Script
# This script helps you quickly start the application

set -e

echo "=========================================="
echo "Asset Management System - Startup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo ""
    echo "Creating .env file from env.example..."

    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ .env file created successfully!"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and configure:"
        echo "   - DB_PASSWORD (database password)"
        echo "   - JWT_SECRET (JWT secret key)"
        echo "   - JWT_REFRESH_SECRET (JWT refresh secret key)"
        echo "   - Email configuration (if needed)"
        echo ""
        read -p "Press Enter to continue after editing .env file..."
    else
        echo "❌ Error: env.example file not found!"
        exit 1
    fi
fi

# Function to display menu
show_menu() {
    echo ""
    echo "Choose deployment mode:"
    echo "1) Production (docker-compose.yml)"
    echo "2) Development with hot reload (docker-compose.dev.yml)"
    echo "3) Stop all services"
    echo "4) View logs"
    echo "5) Restart services"
    echo "6) Clean up and rebuild"
    echo "7) Database operations"
    echo "8) Exit"
    echo ""
}

# Function to start production
start_production() {
    echo ""
    echo "Starting in PRODUCTION mode..."
    echo "================================"
    docker-compose up -d --build
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "Access the application:"
    echo "  - Frontend: http://localhost:8080"
    echo "  - Backend API: http://localhost:3000/api"
    echo "  - API Docs: http://localhost:3000/api/docs"
    echo ""
    echo "View logs: docker-compose logs -f"
}

# Function to start development
start_development() {
    echo ""
    echo "Starting in DEVELOPMENT mode..."
    echo "================================"
    docker-compose -f docker-compose.dev.yml up -d --build
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "Access the application:"
    echo "  - Frontend: http://localhost:5173 (with hot reload)"
    echo "  - Backend API: http://localhost:3000/api (with hot reload)"
    echo "  - API Docs: http://localhost:3000/api/docs"
    echo "  - pgAdmin: http://localhost:5050"
    echo ""
    echo "View logs: docker-compose -f docker-compose.dev.yml logs -f"
}

# Function to stop services
stop_services() {
    echo ""
    echo "Stopping all services..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    echo "✅ Services stopped!"
}

# Function to view logs
view_logs() {
    echo ""
    echo "Which service logs do you want to view?"
    echo "1) All services"
    echo "2) Backend only"
    echo "3) Frontend only"
    echo "4) Database only"
    read -p "Enter choice [1-4]: " log_choice

    case $log_choice in
        1) docker-compose logs -f ;;
        2) docker-compose logs -f backend ;;
        3) docker-compose logs -f frontend ;;
        4) docker-compose logs -f postgres ;;
        *) echo "Invalid choice!" ;;
    esac
}

# Function to restart services
restart_services() {
    echo ""
    echo "Restarting services..."
    docker-compose restart
    echo "✅ Services restarted!"
}

# Function to clean up and rebuild
cleanup_rebuild() {
    echo ""
    echo "⚠️  WARNING: This will stop all services and rebuild from scratch!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        echo "Cleaning up..."
        docker-compose down -v
        docker-compose -f docker-compose.dev.yml down -v
        docker system prune -f
        echo ""
        echo "Rebuilding..."
        docker-compose up -d --build
        echo "✅ Cleanup and rebuild complete!"
    else
        echo "Operation cancelled."
    fi
}

# Function for database operations
database_operations() {
    echo ""
    echo "Database Operations:"
    echo "1) Run migrations"
    echo "2) Run database seeds"
    echo "3) Create backup"
    echo "4) Access PostgreSQL shell"
    echo "5) View database logs"
    echo "6) Back to main menu"
    read -p "Enter choice [1-6]: " db_choice

    case $db_choice in
        1)
            echo "Running migrations..."
            docker-compose exec backend npx prisma migrate deploy
            echo "✅ Migrations complete!"
            ;;
        2)
            echo "Running database seeds..."
            docker-compose exec backend npm run db:seed
            echo "✅ Seeds complete!"
            ;;
        3)
            echo "Creating backup..."
            mkdir -p backups
            docker-compose exec -T postgres pg_dump -U postgres asset_management > backups/db_$(date +%Y%m%d_%H%M%S).sql
            echo "✅ Backup created in backups/ directory!"
            ;;
        4)
            echo "Accessing PostgreSQL shell..."
            docker-compose exec postgres psql -U postgres -d asset_management
            ;;
        5)
            docker-compose logs -f postgres
            ;;
        6)
            return
            ;;
        *)
            echo "Invalid choice!"
            ;;
    esac
}

# Main loop
while true; do
    show_menu
    read -p "Enter choice [1-8]: " choice

    case $choice in
        1) start_production ;;
        2) start_development ;;
        3) stop_services ;;
        4) view_logs ;;
        5) restart_services ;;
        6) cleanup_rebuild ;;
        7) database_operations ;;
        8)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid choice! Please enter 1-8."
            ;;
    esac

    echo ""
    read -p "Press Enter to continue..."
done
