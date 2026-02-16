# Pebble Asset Tracker Backend - Asset Management API

NestJS backend API for the Pebble Asset Tracker asset management platform, providing robust services for complete asset lifecycle management, maintenance scheduling, and comprehensive analytics.

## 🎯 Overview

The Pebble Asset Tracker backend is a scalable, enterprise-grade API built with NestJS that powers comprehensive asset management capabilities. It provides secure, high-performance services for administrators, managers, and employees with extensive asset tracking, assignment management, maintenance scheduling, and analytics features.

## 🚀 Tech Stack

### Core Framework
- **NestJS** - Progressive Node.js framework with TypeScript
- **TypeScript** - Type-safe development with enhanced IDE support
- **Node.js** - JavaScript runtime for server-side development

### Database & ORM
- **PostgreSQL** - Robust relational database
- **Prisma ORM** - Type-safe database client and schema management
- **Database Migrations** - Automated schema versioning
- **Prisma Studio** - Visual database management interface

### Authentication & Security
- **JWT (JSON Web Tokens)** - Stateless authentication with refresh tokens
- **Passport.js** - Authentication middleware
- **bcrypt** - Password hashing and security
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security headers middleware

### File Processing
- **Multer** - File upload handling
- **csv-parser** - CSV file parsing for bulk imports
- **ExcelJS** - Excel file generation and parsing

### API Documentation & Validation
- **Swagger/OpenAPI** - Comprehensive API documentation
- **Class Validator** - Request validation and transformation
- **Class Transformer** - Object serialization and deserialization

### Development & Testing
- **Jest** - Unit and integration testing
- **Supertest** - HTTP assertion testing
- **ESLint** - Code linting and quality
- **Prettier** - Code formatting

## 📁 Project Structure

```
backend/
├── src/
│   ├── modules/             # Feature modules
│   │   ├── admin/          # Admin management
│   │   ├── assets/         # Asset management
│   │   ├── asset-categories/ # Asset category management
│   │   ├── asset-types/    # Asset type management
│   │   ├── brands/         # Brand management
│   │   ├── models/         # Model management
│   │   ├── assignments/    # Asset assignment management
│   │   ├── employees/      # Employee management
│   │   ├── maintenance/    # Maintenance scheduling
│   │   ├── vendors/        # Vendor management
│   │   ├── notifications/  # Notification system
│   │   ├── reports/        # Reports and analytics
│   │   ├── asset-history/  # Asset history tracking
│   │   └── asset-reports/  # Asset reporting
│   ├── core/               # Core modules
│   │   ├── auth/          # Authentication & authorization
│   │   └── database/      # Database configuration
│   ├── shared/            # Shared utilities
│   │   ├── interceptors/  # Request/response interceptors
│   │   └── utils/         # Helper functions
│   ├── app.module.ts      # Root module
│   ├── app.controller.ts  # Root controller
│   ├── app.service.ts     # Root service
│   └── main.ts            # Application entry point
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── seeds/             # Database seeding scripts
├── test/                  # Test files
├── uploads/               # File uploads directory
└── dist/                  # Compiled JavaScript
```

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v12.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: For version control

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd asset-mgt-be
   ```

2. **Install dependencies**
   ```bash
npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/asset_management"
   
   # JWT Configuration
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
   JWT_REFRESH_EXPIRES_IN="7d"
   
   # Application Configuration
   PORT=3000
   NODE_ENV=development
   
   # CORS Configuration
   CORS_ORIGIN="http://localhost:5173"
   
   # Email Configuration (optional)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="Pebble Asset Tracker <noreply@pebble-asset-tracker.com>"
   
   # File Upload Configuration
   MAX_FILE_SIZE=5242880
   UPLOAD_DIR="./uploads"
   ```

4. **Database Setup**
   ```bash
   # Create database
createdb asset_management
   
   # Generate Prisma client
npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev
   
   # Seed database with initial data (creates admin user)
   npm run seed
   ```

5. **Start development server**
   ```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`
Swagger documentation at `http://localhost:3000/api`

## 📜 Available Scripts

### Development
- `npm run start` - Start the application
- `npm run start:dev` - Start with hot reload (recommended for development)
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode

### Building
- `npm run build` - Build the application for production

### Database
- `npx prisma migrate dev` - Create and apply new migration
- `npx prisma migrate deploy` - Apply migrations in production
- `npx prisma generate` - Generate Prisma client
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma db seed` - Seed database with initial data
- `npm run seed` - Run seed scripts

### Code Quality
- `npm run lint` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests

## 🏗️ API Architecture

### Module Structure
Each feature is organized as a NestJS module with:
- **Controller** - HTTP request handling and route definitions
- **Service** - Business logic implementation
- **DTOs** - Data Transfer Objects for validation and transformation
- **Guards** - Authentication and authorization
- **Interceptors** - Request/response transformation

### Database Schema
Key database entities include:
- **Users** - Admin, Manager, Employee accounts
- **Employees** - Employee information and profiles
- **AssetCategories** - Asset category hierarchy
- **AssetTypes** - Asset type definitions
- **Brands** - Asset brand information
- **Models** - Asset model specifications
- **Assets** - Asset inventory with complete details
- **AssetIssues** - Asset assignment/issue records
- **MaintenanceSchedules** - Maintenance planning and tracking
- **Vendors** - Vendor information and management
- **AssetEvents** - Asset history and audit trail
- **Notifications** - System notifications
- **PasswordResets** - Password reset tokens
- **BlacklistedTokens** - Invalidated JWT tokens
- **RefreshSessions** - Refresh token sessions

## 📚 Key Features

### 🔐 Authentication & Authorization
- **JWT-based Authentication** - Secure token-based auth with refresh tokens
- **Role-based Access Control** - Admin, Manager, Employee roles
- **Password Security** - bcrypt hashing with salt
- **Session Management** - Secure refresh token rotation
- **Password Reset** - Email-based password recovery
- **Token Blacklisting** - Logout and security features

### 📦 Asset Management
- **Complete CRUD Operations** - Create, Read, Update, Delete assets
- **Advanced Filtering** - Multi-field filtering and search
- **Pagination** - Efficient data loading with cursor-based pagination
- **Bulk Import** - CSV-based bulk asset creation with validation
- **Serial Number Tracking** - Unique asset identification
- **Status Management** - Available, Assigned, In Maintenance, Retired, Lost
- **Condition Tracking** - New, Good, Fair, Poor, Damaged, Refurbished
- **Retirement Management** - Asset retirement and reactivation
- **Asset History** - Complete audit trail for each asset

### 📝 Assignment Management
- **Issue Workflow** - Assign assets to employees
- **Collection Workflow** - Process asset returns
- **Condition Documentation** - Track condition at issue and return
- **Assignment History** - Complete historical tracking
- **Active Assignment Tracking** - Monitor current assignments
- **Bulk Assignment Support** - Assign multiple assets efficiently

### 🔧 Maintenance Management
- **Maintenance Scheduling** - Schedule preventive and corrective maintenance
- **Type Support** - Preventive, Corrective, Emergency, Upgrade
- **Status Tracking** - Scheduled, In Progress, Completed, Cancelled
- **Cost Tracking** - Estimated and actual cost management
- **Vendor Assignment** - Link maintenance to service vendors
- **Automated Reminders** - Scheduled notification system
- **Maintenance History** - Complete maintenance logs
- **Frequency-based Scheduling** - Recurring maintenance support

### 👥 Employee Management
- **Employee CRUD** - Complete employee management
- **Status Management** - Active/Inactive employee status
- **Asset Association** - Track assets assigned to employees
- **Assignment History** - Historical asset usage tracking
- **Bulk Import** - CSV-based employee data import
- **Email Validation** - Unique email enforcement
- **Employee ID Management** - Auto-generated or custom IDs

### 🏢 Vendor Management
- **Vendor CRUD** - Complete vendor management
- **Type Classification** - Supplier, Service, Manufacturer, etc.
- **Status Management** - Active/Inactive vendor status
- **Contact Management** - Comprehensive contact information
- **Service Tracking** - Maintenance and support association
- **Bulk Import** - CSV-based vendor data import

### 📊 Analytics & Reporting
- **Dashboard Statistics** - Real-time asset metrics
- **Asset Reports** - Comprehensive inventory reports
- **Assignment Reports** - Employee-wise assignment tracking
- **Maintenance Reports** - Maintenance schedules and costs
- **Custom Reports** - Flexible report generation
- **Export Capabilities** - PDF, Excel, CSV formats
- **Historical Analysis** - Trend analysis and insights

### 🔔 Notification System
- **Maintenance Reminders** - Upcoming maintenance alerts
- **Overdue Notifications** - Overdue maintenance warnings
- **Assignment Notifications** - Asset issue/return alerts
- **System Alerts** - Important system notifications
- **Email Integration** - Email notification support
- **In-app Notifications** - Real-time notification feed

### 📜 Audit & History
- **Asset Events** - Complete asset lifecycle tracking
- **Change Detection** - Automatic change tracking
- **User Attribution** - Track who made changes
- **Timestamp Tracking** - Precise date/time recording
- **Event Types** - Created, Updated, Issued, Collected, etc.
- **Historical Queries** - Query asset history with filters

## 🔧 Configuration

### Database Configuration
Prisma schema defines the database structure in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Key models
model User {
  id              Int      @id @default(autoincrement())
  username        String   @unique
  email           String   @unique
  password        String
  name            String
  employeeId      String   @unique
  roles           String[]
  isActive        Boolean  @default(true)
  lastLogin       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  // ... relations
}

model Asset {
  id                  Int      @id @default(autoincrement())
  assetId             String   @unique
  serialNumber        String?  @unique
  status              AssetStatus
  condition           AssetCondition
  location            String?
  purchaseDate        DateTime?
  purchaseCost        Decimal?
  warrantyStartDate   DateTime?
  warrantyEndDate     DateTime?
  notes               String?
  // ... relations and more fields
}
```

### Swagger API Documentation
Access comprehensive API documentation at:
- **Development**: `http://localhost:3000/api`
- **JSON Schema**: `http://localhost:3000/api-json`

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing
- Example requests and responses

## 🧪 Testing

### Unit Testing
```bash
npm run test
```

### Test Coverage
```bash
npm run test:cov
```

### End-to-End Testing
```bash
npm run test:e2e
```

### Testing Best Practices
- Write unit tests for all services and controllers
- Mock external dependencies (database, external APIs)
- Test both success and error scenarios
- Maintain high test coverage (target >80%)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

## 🚀 Production Deployment

### Environment Setup
1. **Set production environment variables**
   ```env
   NODE_ENV=production
   DATABASE_URL="production-database-url"
   JWT_SECRET="strong-production-secret"
   JWT_REFRESH_SECRET="strong-refresh-secret"
   ```

2. **Configure production database**
3. **Set up SSL/TLS certificates**
4. **Configure SMTP for emails**
5. **Set up monitoring and logging**

### Build and Deploy
```bash
# Install production dependencies only
npm ci --production

# Build the application
npm run build

# Run database migrations
npx prisma migrate deploy

# Start in production mode
npm run start:prod
```

### Performance Optimization
- **Connection Pooling** - Database connection optimization
- **Caching** - In-memory caching for frequently accessed data
- **Rate Limiting** - Prevent API abuse
- **Compression** - Gzip compression for responses
- **Query Optimization** - Database query performance tuning
- **Indexing** - Proper database indexing for fast queries

## 🔒 Security Features

### Authentication Security
- **JWT Token Validation** - Secure token verification
- **Refresh Token Rotation** - Enhanced security with token rotation
- **Password Hashing** - bcrypt with configurable salt rounds
- **Role-based Guards** - Endpoint-level authorization
- **CORS Configuration** - Strict cross-origin request control
- **Token Blacklisting** - Invalidate compromised tokens

### Data Protection
- **Input Validation** - Comprehensive request validation using class-validator
- **SQL Injection Prevention** - Prisma ORM parameterized queries
- **XSS Protection** - Input sanitization and output encoding
- **Rate Limiting** - DDoS protection
- **Helmet Integration** - Security headers (CSP, HSTS, etc.)
- **File Upload Validation** - File type and size restrictions

### OWASP Compliance
- **Security Headers** - Comprehensive security headers
- **Dependency Scanning** - Regular security audits with npm audit
- **Error Handling** - Secure error responses without sensitive data
- **Logging** - Comprehensive audit trails for security events
- **Session Management** - Secure session handling
- **HTTPS Enforcement** - Production HTTPS requirements

## 📊 Performance Specifications

- **Response Time**: < 200ms for standard queries
- **Bulk Operations**: Handle 1000+ records efficiently
- **Concurrent Users**: 500+ simultaneous users supported
- **Database Performance**: Optimized queries with proper indexing
- **Memory Usage**: Efficient memory management with streaming
- **Uptime**: 99.9% availability target

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Test database connection
   npx prisma db pull
   
   # Reset database (development only - WARNING: deletes all data)
   npx prisma migrate reset
   
   # Check Prisma schema
   npx prisma validate
   ```

2. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   
   # Or change port in .env
   PORT=3001
   ```

3. **Prisma Client Issues**
   ```bash
   # Regenerate Prisma client
   npx prisma generate
   
   # Clear Prisma cache
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

4. **Migration Issues**
   ```bash
   # Check migration status
   npx prisma migrate status
   
   # Resolve migration conflicts
   npx prisma migrate resolve
   
   # Create new migration
   npx prisma migrate dev --name descriptive_name
   ```

5. **Environment Variables**
   ```bash
   # Verify environment variables are loaded
   node -e "console.log(process.env.DATABASE_URL)"
   
   # Check .env file exists and is properly formatted
   cat .env
   ```

### Debug Mode
Enable debug logging:
```env
NODE_ENV=development
LOG_LEVEL=debug
```

View detailed logs:
```bash
npm run start:dev -- --verbose
```

## 📚 Documentation

- **NestJS Documentation**: https://docs.nestjs.com/
- **Prisma Documentation**: https://www.prisma.io/docs/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **JWT Documentation**: https://jwt.io/
- **TypeScript Documentation**: https://www.typescriptlang.org/docs/


## 🙏 Acknowledgments

Special thanks to the Mindstix Foundation team and all contributors who have helped make Pebble Asset Tracker a robust and reliable asset management platform.

---

## 🎓 Meet the Team

### 👨‍💻 **Project Team**

- **Project Idea** - Roshan Kulkarni, CEO of Mindstix Software Labs
- **Project Manager** - Siddhant Raut
- **Developers** - Uday Narsale & Nishant Bondre

## 🔗 Related Repositories

- **🖥️ Frontend Repository**: [Pebble Asset Tracker Frontend](../asset-mgt-fe) - Vue.js frontend providing modern user interface

---

**Part of the Mindstix Foundation Asset Management Platform**  
*Empowering efficient asset management through robust, scalable backend services.*
