# busy-bee-vs Backend

This is the backend service for the busy-bee-vs application, built with Node.js, Express, and TypeScript.

## 📁 Project Structure

```
packages/backend/
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── init.sql                      # ✨ Now includes file_switch_windows table
├── .env
├── .gitignore
└── src/
    ├── server.ts                 # Entry point
    ├── api/
    │   └── app.ts                # Express app setup (routes registered here)
    ├── config/
    │   └── db.ts                 # PostgreSQL connection pool
    ├── features/
    │   ├── products/             # Products feature
    │   │   ├── products.types.ts
    │   │   ├── product.model.ts
    │   │   ├── products.service.ts
    │   │   ├── products.controller.ts
    │   │   └── products.routes.ts
    │   └── fileSwitch/           # ✨ NEW: File switch tracking feature
    │       ├── fileSwitch.types.ts
    │       ├── fileSwitch.service.ts
    │       ├── fileSwitch.controller.ts
    │       └── fileSwitch.routes.ts
    ├── middlewares/
    │   └── error.ts              # Error handling
    └── utils/
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
PORT=3000
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

## ✨ File Switch Tracking Feature

### Overview

Tracks developer file switching behavior from VS Code extension in 5-minute windows.

### Database Schema (`init.sql`)

```sql
CREATE TABLE IF NOT EXISTS file_switch_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_id TEXT NOT NULL,              -- Unique session identifier
  window_start TIMESTAMPTZ NOT NULL,     -- Window start time
  window_end TIMESTAMPTZ NOT NULL,       -- Window end time
  
  activation_count INT NOT NULL CHECK (activation_count >= 0),
  rate_per_min NUMERIC(10, 4) NOT NULL CHECK (rate_per_min >= 0),
  
  workspace_tag TEXT NULL,               -- Workspace identifier
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_file_switch_windows_session 
  ON file_switch_windows (session_id, window_start);
  
CREATE INDEX idx_file_switch_windows_created_at 
  ON file_switch_windows (created_at);
```

**Key Points**:
- `activation_count`: Includes returning to same file (A→B→A = 3)
- `rate_per_min`: Pre-calculated for dashboard performance
- `session_id`: Links windows from same coding session
- `workspace_tag`: Identifies which project was being worked on

### API Endpoints

#### 1. Create Window Record
```http
POST /api/file-switch/windows
Content-Type: application/json

{
  "sessionId": "session-1735464000-xyz",
  "windowStart": "2025-12-30T10:00:00.000Z",
  "windowEnd": "2025-12-30T10:05:00.000Z",
  "activationCount": 12,
  "ratePerMin": 2.4,
  "workspaceTag": "workspace-my-project"
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "id": "uuid-here",
    "session_id": "session-1735464000-xyz",
    "window_start": "2025-12-30T10:00:00.000Z",
    "window_end": "2025-12-30T10:05:00.000Z",
    "activation_count": 12,
    "rate_per_min": "2.4000",
    "workspace_tag": "workspace-my-project",
    "created_at": "2025-12-30T10:05:01.123Z"
  }
}
```

#### 2. Get Windows for Session
```http
GET /api/file-switch/windows?sessionId=session-1735464000-xyz
```

**Response**:
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid-1",
      "session_id": "session-1735464000-xyz",
      "window_start": "2025-12-30T10:00:00.000Z",
      "window_end": "2025-12-30T10:05:00.000Z",
      "activation_count": 12,
      "rate_per_min": "2.4000",
      "workspace_tag": "workspace-my-project",
      "created_at": "2025-12-30T10:05:01.123Z"
    },
    // ...more windows
  ]
}
```

#### 3. Get Sessions by Date
```http
GET /api/file-switch/sessions?date=2025-12-30
```

**Response**:
```json
{
  "ok": true,
  "data": [
    {
      "session_id": "session-1735464000-xyz",
      "session_start": "2025-12-30T10:00:00.000Z",
      "session_end": "2025-12-30T12:30:00.000Z",
      "window_count": "30"  // 30 five-minute windows
    }
  ]
}
```

### File Structure

**`src/features/fileSwitch/fileSwitch.types.ts`**
```typescript
export type CreateFileSwitchWindowInput = {
  sessionId: string;
  windowStart: string;     // ISO 8601 string
  windowEnd: string;       // ISO 8601 string
  activationCount: number;
  ratePerMin: number;
  workspaceTag?: string;
};

export type FileSwitchWindowRow = {
  id: string;
  session_id: string;
  window_start: string;
  window_end: string;
  activation_count: number;
  rate_per_min: string;    // PostgreSQL numeric as string
  workspace_tag: string | null;
  created_at: string;
};
```

**`src/features/fileSwitch/fileSwitch.service.ts`**

Business logic and database operations:
- `validateCreatePayload()` - Input validation with detailed error messages
- `createFileSwitchWindow()` - Insert window record
- `getWindowsBySession()` - Fetch all windows for a session
- `listSessionsByDate()` - Aggregate sessions by date

**Validation Rules**:
- `sessionId` must be non-empty string
- `windowStart/windowEnd` must be valid ISO date strings
- `windowEnd` must be after `windowStart`
- `activationCount` must be non-negative finite number
- `ratePerMin` must be non-negative finite number
- `workspaceTag` is optional but must be string if provided

**`src/features/fileSwitch/fileSwitch.controller.ts`**

HTTP request/response handlers:
- `postFileSwitchWindow()` - Handle POST window creation
- `getFileSwitchWindows()` - Handle GET windows by session
- `getFileSwitchSessions()` - Handle GET sessions by date

All controllers use try-catch with `next(err)` for error middleware.

**`src/features/fileSwitch/fileSwitch.routes.ts`**

```typescript
import { Router } from 'express';

const router = Router();

router.post('/windows', postFileSwitchWindow);
router.get('/windows', getFileSwitchWindows);
router.get('/sessions', getFileSwitchSessions);

export default router;
```

### Integration (`src/api/app.ts`)

```typescript
import fileSwitchRoutes from '../features/fileSwitch/fileSwitch.routes.js';

app.use('/api/file-switch', fileSwitchRoutes);
```

### Data Flow

```
VS Code Extension (every 5 min)
    ↓ POST /api/file-switch/windows
  Controller (validate & parse)
    ↓
  Service (business logic)
    ↓
  PostgreSQL (insert record)
    ↓
  Response with created record


Dashboard UI
    ↓ GET /api/file-switch/sessions?date=...
  Controller (validate date)
    ↓
  Service (aggregate query)
    ↓
  PostgreSQL (GROUP BY session_id)
    ↓
  Response with session summaries


Dashboard UI (after session selected)
    ↓ GET /api/file-switch/windows?sessionId=...
  Controller (validate session ID)
    ↓
  Service (query by session)
    ↓
  PostgreSQL (fetch all windows)
    ↓
  Response with window array
```

### Adding a New Feature

1. Create a new folder under `src/features/`
2. Add the following files:
   - `feature.types.ts` - Type definitions
   - `feature.model.ts` - Database model (optional)
   - `feature.service.ts` - Business logic
   - `feature.controller.ts` - Request handlers
   - `feature.routes.ts` - Route definitions
3. Add database tables to `init.sql`
4. Register routes in `src/api/app.ts`
5. Test with Postman/curl
6. Add to dashboard if needed

**Example** (following fileSwitch pattern):
```bash
mkdir src/features/myFeature
touch src/features/myFeature/{myFeature.types.ts,myFeature.service.ts,myFeature.controller.ts,myFeature.routes.ts}
```
