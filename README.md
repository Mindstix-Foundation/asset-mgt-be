# Asset Management Backend

Backend API for the Mindstix Foundation Asset Management system built with NestJS, PostgreSQL, and Prisma ORM.

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+)
- Git

### Setup
```bash
# Clone and install dependencies
git clone <repository-url>
cd asset-mgt-be
npm install

# Environment setup
cp .env.example .env
# Edit .env with your database credentials

# Database setup
createdb asset_management
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run start:dev
```

## Detailed Setup

For complete setup instructions, see [SETUP.md](./SETUP.md)

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT with Passport
- **Validation**: class-validator
- **Language**: TypeScript

## Project Structure (Function-wise Approach)

```
src/
├── modules/        # Feature modules (auth, users, assets, etc.)
├── shared/         # Shared utilities across modules
│   ├── decorators/ # Custom decorators
│   ├── guards/     # Authentication & authorization guards
│   ├── interceptors/# Request/response interceptors
│   ├── pipes/      # Validation & transformation pipes
│   ├── filters/    # Exception filters
│   ├── utils/      # Helper functions
│   └── types/      # TypeScript type definitions
├── config/         # Configuration files
│   └── database/   # Database configuration
├── app.module.ts   # Root module
├── app.controller.ts
├── app.service.ts
└── main.ts         # Application entry point
```

### Module Structure (when creating new modules)
```
src/modules/[feature-name]/
├── [feature].controller.ts
├── [feature].service.ts
├── [feature].module.ts
├── dto/            # Data Transfer Objects
├── entities/       # Database entities
└── [feature].spec.ts
```

## API Endpoints

The API will be available at `http://localhost:3000` once started.

## Development

```bash
# Development with hot reload
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test

# Database management
npx prisma studio    # Database GUI
npx prisma migrate   # Run migrations
```

## Contributing

1. Follow the existing code structure
2. Use TypeScript strict mode
3. Write tests for new features
4. Follow NestJS best practices

## License

MIT