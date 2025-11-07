#!/bin/bash

# Asset Management System - Health Check Script
# Verifies all services are running correctly

set -e

echo "=========================================="
echo "Asset Management System - Health Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Function to check service health
check_service() {
    local service=$1
    local name=$2

    echo -n "Checking $name... "

    # Check if container is running
    if docker-compose ps | grep -q "$service.*Up"; then
        # Check health status
        health=$(docker-compose ps | grep "$service" | grep -o "healthy\|unhealthy\|starting" || echo "unknown")

        case $health in
            "healthy")
                echo -e "${GREEN}✓ Healthy${NC}"
                return 0
                ;;
            "starting")
                echo -e "${YELLOW}⚠ Starting${NC}"
                return 1
                ;;
            "unhealthy")
                echo -e "${RED}✗ Unhealthy${NC}"
                return 1
                ;;
            *)
                echo -e "${YELLOW}⚠ Running (no health check)${NC}"
                return 1
                ;;
        esac
    else
        echo -e "${RED}✗ Not running${NC}"
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local url=$1
    local name=$2

    echo -n "Testing $name... "

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|302"; then
        echo -e "${GREEN}✓ Accessible${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

# Check services
echo "Service Status:"
echo "---------------"
check_service "postgres" "PostgreSQL Database"
check_service "backend" "Backend API"
check_service "frontend" "Frontend Application"
echo ""

# Test endpoints
echo "Endpoint Tests:"
echo "---------------"
test_endpoint "http://localhost:3000/api" "Backend API"
test_endpoint "http://localhost:8080" "Frontend"
echo ""

# Check database connectivity
echo "Database Connectivity:"
echo "----------------------"
echo -n "Testing database connection... "
if docker-compose exec -T postgres psql -U postgres -d asset_management -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
fi
echo ""

# Check disk usage
echo "Resource Usage:"
echo "---------------"
echo "Docker Disk Usage:"
docker system df
echo ""

echo "Container Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
echo ""

# Check volumes
echo "Volume Status:"
echo "--------------"
docker volume ls | grep asset-mgt
echo ""

# Summary
echo "=========================================="
echo "Health Check Complete"
echo "=========================================="
echo ""
echo "For detailed logs, run:"
echo "  docker-compose logs -f"
echo ""
echo "To restart a service:"
echo "  docker-compose restart <service-name>"
echo ""
