# TrackStix Backend - Asset Management API

NestJS backend API for the TrackStix asset management platform, providing robust services for complete asset lifecycle management, maintenance scheduling, and comprehensive analytics.

## 🎯 Overview

The TrackStix backend is a scalable, enterprise-grade API built with NestJS that powers comprehensive asset management capabilities. It provides secure, high-performance services for administrators, managers, and employees with extensive asset tracking, assignment management, maintenance scheduling, and analytics features.

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
   SMTP_FROM="TrackStix <noreply@trackstix.com>"
   
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

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

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

## 🔍 API Endpoints Overview

### Authentication Endpoints
```
POST   /auth/login              - User authentication
POST   /auth/logout             - User logout
POST   /auth/refresh            - Refresh access token
GET    /auth/profile            - Get user profile
POST   /auth/change-password    - Change password
POST   /auth/forgot-password    - Request password reset
POST   /auth/reset-password     - Reset password with token
```

### Asset Management Endpoints
```
GET    /assets                  - List assets with filters and pagination
GET    /assets/stats            - Get asset statistics
GET    /assets/available        - Get available assets
GET    /assets/deletable        - Get deletable assets
GET    /assets/:id              - Get asset details
POST   /assets                  - Create new asset
POST   /assets/generate-id      - Generate next asset ID
POST   /assets/check-serial     - Check serial number uniqueness
PUT    /assets/:id              - Update asset
DELETE /assets/:id              - Delete asset
POST   /assets/bulk-delete      - Delete multiple assets
POST   /assets/:id/retire       - Retire asset
POST   /assets/:id/reactivate   - Reactivate retired asset
POST   /assets/validate-bulk    - Validate bulk upload file
POST   /assets/bulk-upload      - Bulk import assets from CSV
GET    /assets/export           - Export assets to Excel
GET    /assets/search           - Search assets
GET    /assets/for-dropdowns    - Get assets for dropdown selection
```

### Asset Category Management
```
GET    /asset-categories        - List all categories
GET    /asset-categories/:id    - Get category details
POST   /asset-categories        - Create new category
PUT    /asset-categories/:id    - Update category
DELETE /asset-categories/:id    - Delete category
```

### Asset Type Management
```
GET    /asset-types             - List all asset types
GET    /asset-types/by-category/:id - Get types by category
GET    /asset-types/:id         - Get type details
POST   /asset-types             - Create new type
PUT    /asset-types/:id         - Update type
DELETE /asset-types/:id         - Delete type
```

### Brand Management
```
GET    /brands                  - List all brands
GET    /brands/:id              - Get brand details
POST   /brands                  - Create new brand
PUT    /brands/:id              - Update brand
DELETE /brands/:id              - Delete brand
```

### Model Management
```
GET    /models                  - List all models
GET    /models/by-brand/:id     - Get models by brand
GET    /models/by-brand/:brandId/asset-type/:typeId - Get models by brand and type
GET    /models/:id              - Get model details
POST   /models                  - Create new model
PUT    /models/:id              - Update model
DELETE /models/:id              - Delete model
```

### Assignment Management
```
GET    /assignments             - List all assignments
GET    /assignments/active      - List active assignments
GET    /assignments/:id         - Get assignment details
POST   /assignments             - Issue asset to employee
POST   /assignments/:id/return  - Collect asset from employee
```

### Employee Management
```
GET    /employees               - List all employees
GET    /employees/active        - Get active employees only
GET    /employees/for-dropdowns - Get employees for dropdown
GET    /employees/non-admin     - Get non-admin employees
GET    /employees/:id           - Get employee details
POST   /employees               - Create new employee
POST   /employees/check-email   - Check email availability
POST   /employees/check-employee-id - Check employee ID availability
POST   /employees/next-id       - Generate next employee ID
PUT    /employees/:id           - Update employee
DELETE /employees/:id           - Delete employee
GET    /employees/:id/asset-history - Get employee asset history
GET    /employees/:id/asset-events - Get employee asset events
POST   /employees/validate-bulk - Validate bulk upload
POST   /employees/bulk-upload   - Bulk import employees
```

### Maintenance Management
```
GET    /maintenance             - List maintenance schedules
GET    /maintenance/stats       - Get maintenance statistics
GET    /maintenance/:id         - Get maintenance details
POST   /maintenance             - Schedule new maintenance
PUT    /maintenance/:id         - Update maintenance
DELETE /maintenance/:id         - Delete maintenance
POST   /maintenance/:id/complete - Mark maintenance complete
POST   /maintenance/:id/cancel  - Cancel maintenance
GET    /maintenance/asset/:id/history - Get asset maintenance history
GET    /maintenance/asset/:id/events  - Get asset maintenance events
GET    /maintenance/export      - Export maintenance data
```

### Vendor Management
```
GET    /vendors                 - List all vendors
GET    /vendors/search          - Search vendors
GET    /vendors/:id             - Get vendor details
POST   /vendors                 - Create new vendor
POST   /vendors/check-name      - Check vendor name availability
PUT    /vendors/:id             - Update vendor
PUT    /vendors/:id/status      - Update vendor status
POST   /vendors/validate-bulk   - Validate bulk upload
POST   /vendors/bulk-upload     - Bulk import vendors
```

### Asset History
```
GET    /asset-history/:id       - Get complete asset history
GET    /asset-history/:id/summary - Get asset history summary
```

### Notifications
```
GET    /notifications           - Get user notifications
GET    /notifications/unread-count - Get unread count
POST   /notifications/:id/mark-read - Mark notification as read
POST   /notifications/mark-all-read - Mark all as read
```

### Reports
```
GET    /reports/analytics       - Get analytics data
GET    /reports/asset-inventory - Get asset inventory report
GET    /reports/employee-assets - Get employee asset report
GET    /reports/maintenance     - Get maintenance report
POST   /reports/preview         - Preview report data
POST   /asset-reports/generate  - Generate custom report
```

### Admin Management
```
GET    /admin/users             - List admin users
POST   /admin/users             - Create admin user
PUT    /admin/users/:id/status  - Update admin status
GET    /admin/users/:id/check-deletable - Check if admin can be deleted
DELETE /admin/users/:id         - Remove admin user
```

## 🤝 Contributing

### Development Guidelines
- Follow NestJS best practices and conventions
- Write comprehensive unit tests for new features
- Update API documentation (Swagger) for new endpoints
- Follow TypeScript strict mode guidelines
- Implement proper error handling with appropriate HTTP status codes
- Add appropriate logging for debugging and monitoring
- Update documentation for significant changes

### Code Style Guidelines
- Use TypeScript strict mode
- Follow NestJS module structure and dependency injection patterns
- Implement proper DTOs with validation decorators
- Use descriptive variable and function names
- Add JSDoc comments for complex functions
- Follow consistent naming conventions
- Keep functions small and focused (single responsibility)
- Use async/await instead of callbacks
- Handle errors gracefully with try-catch blocks

## 🌍 Production Considerations

### Monitoring & Logging
- Implement structured logging (Winston, Pino)
- Set up application performance monitoring (APM)
- Configure error tracking (Sentry, Rollbar)
- Monitor database performance and slow queries
- Track API response times and error rates
- Set up health check endpoints

### Backup & Recovery
- **Production-Ready Backup System** - Automated daily full backups with WAL archiving
- **Point-in-Time Recovery** - Restore to any specific moment using transaction logs
- **Automated Cleanup** - Automatic removal of old backups based on retention policy
- **Health Monitoring** - Automated health checks and alerts
- **Cloud Storage Support** - Optional upload to AWS S3 or Google Cloud Storage

**Quick Start:**
```bash
# Initial setup
./backups/setup-backups.sh

# Manual backup
./backups/backup-full.sh

# Restore from backup
./backups/backup-restore.sh --list-backups
./backups/backup-restore.sh -f backups/full/backup_file.sql.gz

# Health check
./backups/backup-health-check.sh
```

**Documentation:** See `backups/BACKUP_GUIDE.md` for complete documentation.

### Scalability
- Horizontal scaling with load balancing
- Database read replicas for read-heavy operations
- Caching layer (Redis) for frequently accessed data
- Message queue for async operations (Bull, RabbitMQ)
- CDN for static assets
- Connection pooling optimization

## 🙏 Acknowledgments

Special thanks to the Mindstix Foundation team and all contributors who have helped make TrackStix a robust and reliable asset management platform.

---

## 🎓 Meet the Team

### 👨‍💻 **Project Team**

- **Project Idea** - Roshan Kulkarni, CEO of Mindstix Software Labs
- **Project Manager** - Siddhant Raut
- **Developers** - Uday Narsale & Nishant Bondre

## 🔗 Related Repositories

- **🖥️ Frontend Repository**: [TrackStix Frontend](../asset-mgt-fe) - Vue.js frontend providing modern user interface

---

**Part of the Mindstix Foundation Asset Management Platform**  
*Empowering efficient asset management through robust, scalable backend services.*
