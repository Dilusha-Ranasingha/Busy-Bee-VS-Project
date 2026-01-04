# Dashboard Package

A collaborative React + TypeScript dashboard for product management.

## 📁 Project Structure

```
packages/dashboard/
├── src/
│   ├── types/                         # Shared TypeScript types
│   │   ├── product.types.ts          # Product interfaces
│   │   ├── fileSwitch.types.ts       # ✨ File switch tracking types
│   │   └── api.types.ts              # API response types
│   │
│   ├── services/                      # API layer
│   │   ├── api.client.ts             # Base HTTP client with VS Code integration
│   │   ├── product.service.ts        # Product API calls
│   │   └── fileSwitch.service.ts     # ✨ File switch tracking API calls
│   │
│   ├── hooks/                         # Custom React hooks
│   │   └── useProducts.ts            # Product data hook
│   │
│   ├── components/                    # Reusable components
│   │   ├── ui/                       # Base UI components (VS Code themed)
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   └── charts/                   # Chart components
│   │       └── ChartComponents.tsx
│   │
│   ├── pages/                         # Page components
│   │   ├── Dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── index.ts
│   │   ├── AddProduct/
│   │   │   ├── AddProductPage.tsx
│   │   │   └── index.ts
│   │   ├── ProductList/
│   │   │   ├── ProductListPage.tsx
│   │   │   └── index.ts
│   │   └── FileSwitchRate/           # ✨ NEW: File switch analytics
│   │       ├── FileSwitchRatePage.tsx
│   │       └── index.ts
│   │
│   ├── styles/                        # ✨ VS Code theme integration
│   │   └── vscode-tokens.css         # VS Code color tokens
│   │
│   ├── utils/                         # ✨ Helper utilities
│   │   └── vscode-theme.ts           # VS Code theme detection
│   │
│   ├── App.tsx                        # Main app with tab navigation
│   ├── main.tsx                       # Entry point with theme init
│   └── index.css                      # Global styles
│
├── .env                               # Local environment
├── .env.example                       # Template for team
├── tailwind.config.js                 # ✨ Extended with VS Code tokens
├── vite.config.ts                     # Build configuration
└── package.json
```

## 🎯 Key Features

### Core Features
- **Feature Isolation** - Each page in its own folder
- **Shared Components** - Reusable UI in `/components/ui`
- **Type Safety** - Full TypeScript with interfaces
- **Service Layer** - Clean API separation
- **No Conflicts** - Team members can work on different pages independently

### ✨ File Switch Rate Analytics (NEW)

**Purpose**: Track and visualize developer file switching behavior

**Features**:
- 📅 **Date-based filtering**: Select any date to view sessions
- 🔍 **Session listing**: See all coding sessions for selected date
- 📊 **5-minute windows**: Detailed breakdown of file activations
- 📈 **Metrics**: Activation count, rate per minute, workspace tagging
- 🎨 **VS Code theme integration**: Adapts to light/dark/high-contrast themes

**Page Structure** (`pages/FileSwitchRate/FileSwitchRatePage.tsx`):

```tsx
┌─────────────────────────────────────────────────────┐
│  Left Panel (320px)          │  Right Panel         │
├──────────────────────────────┼──────────────────────┤
│  📅 Date Picker              │  📊 Session Detail   │
│                              │                      │
│  📋 Session List:            │  Stats:              │
│  ┌────────────────────┐     │  • Total activations │
│  │ Session ID         │     │  • Avg rate/min      │
│  │ Start → End        │ ◄───┤  • Start/End times   │
│  │ Windows: 12        │     │                      │
│  └────────────────────┘     │  📋 Windows Table:   │
│  ┌────────────────────┐     │  ┌────────────────┐ │
│  │ Session ID         │     │  │ Time | Count   │ │
│  │ Start → End        │     │  │ 10:00 | 5      │ │
│  │ Windows: 8         │     │  │ 10:05 | 8      │ │
│  └────────────────────┘     │  └────────────────┘ │
└─────────────────────────────┴──────────────────────┘
```

**Data Flow**:
```
VS Code Extension → Backend API → PostgreSQL
                                     ↑
                    Dashboard UI ────┘
```

### 🎨 VS Code Theme Integration

**Theme System** (`styles/vscode-tokens.css`):
- 42+ semantic color tokens from VS Code
- Automatic light/dark/high-contrast detection
- Fallback values for standalone browser mode
- Real-time theme updates via message passing

**Implementation**:
```css
:root {
  --vscode-editor-bg: #1e1e1e;        /* Dark theme default */
  --vscode-foreground: #cccccc;
  --vscode-button-bg: #0e639c;
  /* ...42+ more tokens */
}

@media (prefers-color-scheme: light) {
  :root {
    --vscode-editor-bg: #ffffff;      /* Light theme override */
    /* ... */
  }
}
```

**Tailwind Integration** (`tailwind.config.js`):
```js
colors: {
  vscode: {
    'editor-bg': 'var(--vscode-editor-background)',
    'foreground': 'var(--vscode-foreground)',
    'button-bg': 'var(--vscode-button-background)',
    // ...mapped to CSS variables
  },
  brand: {
    primary: '#0b4063',   // Brand blue
    accent: '#bf941d',    // Brand yellow
  }
}
```

**Usage in Components**:
```tsx
<div className="bg-vscode-widget-bg text-vscode-editor-fg">
  <button className="bg-brand-primary text-white">
    Action Button
  </button>
</div>
```

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## � Key Files

### Types (`src/types/fileSwitch.types.ts`)

```typescript
export type FileSwitchSessionSummary = {
  session_id: string;        // e.g., "session-1735464000-xyz"
  session_start: string;     // ISO timestamp
  session_end: string;       // ISO timestamp
  window_count: string;      // Number of 5-min windows
};

export type FileSwitchWindow = {
  id: string;                // UUID
  session_id: string;
  window_start: string;      // ISO timestamp
  window_end: string;        // ISO timestamp
  activation_count: number;  // File switches in window
  rate_per_min: string;      // activations / 5
  workspace_tag: string | null;
  created_at: string;
};
```

### Services (`src/services/fileSwitch.service.ts`)

```typescript
// Fetch all sessions for a specific date
export async function getFileSwitchSessions(date: string): Promise<FileSwitchSessionSummary[]>

// Fetch all 5-minute windows for a session
export async function getFileSwitchWindows(sessionId: string): Promise<FileSwitchWindow[]>
```

**API Endpoints Used**:
- `GET /api/file-switch/sessions?date=YYYY-MM-DD`
- `GET /api/file-switch/windows?sessionId=xxx`

### API Client (`src/services/api.client.ts`)

**Features**:
- Base URL configuration via environment variable
- VS Code webview integration (detects when running in extension)
- Message passing for theme updates
- Error handling and JSON parsing

```typescript
class ApiClient {
  constructor() {
    // Uses VITE_API_BASE_URL or defaults to localhost:4000
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    
    // Listen for VS Code webview messages
    if (typeof acquireVsCodeApi === 'function') {
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'init') {
          this.baseUrl = event.data.apiBaseUrl;
        }
      });
    }
  }
}
```

## 🚀 Development Workflow

### Browser Mode (Standalone)

```bash
npm run dev
# → http://localhost:5173
# Uses fallback theme colors
# Direct API calls to localhost:4000
```

### VS Code Extension Mode

```bash
# Terminal 1: Start dashboard dev server
cd packages/dashboard
npm run dev

# Terminal 2: Press F5 in VS Code
# Extension loads dashboard from localhost:5173
# Hot reload enabled for instant updates
# VS Code theme colors injected automatically
```

### Production Build

```bash
# Build dashboard for extension
npm run build
# → Creates dist/ folder

# Copy to extension (or use build script)
cd ../extension
npm run build:dashboard
# → Copies dist/ to extension/dist/dashboard/
```

## 👥 Team Development

Each team member can work on different pages independently:
- **Developer 1**: Dashboard page (`/pages/Dashboard`)
- **Developer 2**: Add Product page (`/pages/AddProduct`)
- **Developer 3**: Product List page (`/pages/ProductList`)
- **Developer 4**: File Switch analytics (`/pages/FileSwitchRate`) ✨
- **Developer 5**: API services (`/services`)

All team members share:
- `/types` - Type definitions
- `/components/ui` - VS Code themed UI components
- `/hooks` - Custom React hooks
- `/styles/vscode-tokens.css` - Theme token definitions

## 🎨 Styling Guidelines

**Use VS Code tokens for semantic colors**:
```tsx
// ✅ Good: Adapts to VS Code theme
className="bg-vscode-widget-bg text-vscode-editor-fg"

// ❌ Avoid: Hardcoded colors don't adapt
className="bg-gray-800 text-white"
```

**Use brand colors for primary actions**:
```tsx
// Primary actions (CTAs)
className="bg-brand-primary text-white"  // #0b4063

// Accent/warnings
className="bg-brand-accent text-black"   // #bf941d
```

**Available VS Code token classes**:
- `bg-vscode-editor-bg` - Main background
- `bg-vscode-widget-bg` - Card/panel background
- `text-vscode-editor-fg` - Primary text
- `text-vscode-foreground` - Secondary text
- `border-vscode-panel-border` - Borders
- `bg-vscode-button-bg` - Button background
- `bg-vscode-input-bg` - Input fields
- `bg-vscode-list-hover-bg` - Hover states
- `bg-vscode-list-active-bg` - Active/selected states
- ...and 30+ more!
