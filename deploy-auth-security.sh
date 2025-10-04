#!/bin/bash

# Authentication Security Upgrade - Deployment Script
# Date: October 3, 2025

set -e  # Exit on error

echo "🔐 Starting Authentication Security Upgrade Deployment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from asset-mgt-be directory${NC}"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
npm install cookie-parser @types/cookie-parser
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo "🗄️  Step 2: Running database migration..."
npx prisma migrate deploy
echo -e "${GREEN}✅ Migration completed${NC}"
echo ""

echo "🔧 Step 3: Generating Prisma client..."
npx prisma generate
echo -e "${GREEN}✅ Prisma client generated${NC}"
echo ""

echo "🧪 Step 4: Checking database..."
npx prisma studio --browser none &
STUDIO_PID=$!
sleep 2
kill $STUDIO_PID 2>/dev/null || true
echo -e "${GREEN}✅ Database check complete${NC}"
echo ""

echo "📝 Step 5: Verifying configuration..."
if [ -f ".env" ]; then
    if grep -q "JWT_SECRET" .env; then
        echo -e "${GREEN}✅ JWT_SECRET found${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: JWT_SECRET not found in .env${NC}"
    fi
else
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your backend server:"
echo "   ${YELLOW}npm run start:dev${NC}  (development)"
echo "   ${YELLOW}npm run build && npm run start:prod${NC}  (production)"
echo ""
echo "2. Test the login endpoint:"
echo "   ${YELLOW}curl -X POST http://localhost:3000/api/auth/login \\${NC}"
echo "   ${YELLOW}  -H 'Content-Type: application/json' \\${NC}"
echo "   ${YELLOW}  -d '{\"username\":\"admin\",\"password\":\"your-password\"}' \\${NC}"
echo "   ${YELLOW}  -c cookies.txt -v${NC}"
echo ""
echo "3. Check for Set-Cookie headers in response"
echo ""
echo "📖 Documentation:"
echo "   - AUTH_SECURITY_UPGRADE.md"
echo "   - SECURITY_IMPLEMENTATION_COMPLETE.md"
echo ""

