# busy-bee-vs Backend

This is the backend service for the busy-bee-vs application, built with Node.js, Express, and TypeScript.

## 📁 Project Structure

```
packages/backend/
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── init.sql
├── .env
├── .gitignore
├── server.ts
└── src/
    ├── server.ts                 # Entry point
    ├── api/
    │   └── app.ts                # Express app setup
    ├── config/
    │   └── db.ts                 # Database connection
    ├── features/
    │   └── products/             # Products feature
    │       ├── products.types.ts
    │       ├── products.model.ts
    │       ├── products.service.ts
    │       ├── products.controller.ts
    │       └── products.routes.ts
    └── middlewares/
        └── error.ts              # Error handling
```

## 🏗️ Feature-Based Architecture

This project follows a feature-based structure where each feature is self-contained with all its related files:

```
src/
├── features/
│   └── products/
│       ├── product.model.ts          ✅ Model inside feature
│       ├── products.types.ts         ✅ Types with feature
│       ├── products.service.ts       ✅ Service with feature
│       ├── products.controller.ts    ✅ Controller with feature
│       └── products.routes.ts        ✅ Routes with feature
├──

```

### Feature Structure Benefits

- **Modularity**: Each feature is self-contained
- **Scalability**: Easy to add new features
- **Maintainability**: Related code stays together
- **Clear Separation**: Each layer has a specific responsibility

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/busybee
PORT=5693
NODE_ENV=development
```

### Running the Application

#### Using Docker

```bash
docker-compose up
```

#### Without Docker

```bash
npm run dev
```

## 📦 Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Docker** - Containerization

## 🛠️ Development

### Project Layers

1. **Routes** - Define API endpoints
2. **Controllers** - Handle HTTP requests/responses
3. **Services** - Business logic
4. **Models** - Database interactions
5. **Types** - TypeScript interfaces and types

### Adding a New Feature

1. Create a new folder under `src/features/`
2. Add the following files:
   - `feature.types.ts` - Type definitions
   - `feature.model.ts` - Database model
   - `feature.service.ts` - Business logic
   - `feature.controller.ts` - Request handlers
   - `feature.routes.ts` - Route definitions
3. Register routes in `src/api/app.ts`
