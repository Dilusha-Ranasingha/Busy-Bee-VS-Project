# Dashboard Package

A collaborative React + TypeScript dashboard for product management.

## 📁 Project Structure

```
packages/dashboard/
├── src/
│   ├── types/                         # Shared TypeScript types
│   │   ├── product.types.ts          # Product interfaces
│   │   └── api.types.ts              # API response types
│   │
│   ├── services/                      # API layer (Team member can own this)
│   │   ├── api.client.ts             # Base HTTP client
│   │   └── product.service.ts        # Product API calls
│   │
│   ├── hooks/                         # Custom React hooks
│   │   └── useProducts.ts            # Product data hook
│   │
│   ├── components/                    # Reusable components
│   │   ├── ui/                       # Base UI components
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   └── charts/                   # Chart components
│   │       └── ChartComponents.tsx
│   │
│   ├── pages/                         # Page components (each dev owns a page)
│   │   ├── Dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── index.ts
│   │   ├── AddProduct/
│   │   │   ├── AddProductPage.tsx
│   │   │   └── index.ts
│   │   └── ProductList/
│   │       ├── ProductListPage.tsx
│   │       └── index.ts
│   │
│   ├── App.tsx                        # Main app with routing
│   ├── main.tsx
│   └── index.css
│
├── .env                               # Local environment
├── .env.example                       # Template for team
└── package.json
```

## 🎯 Key Features for Team Collaboration

- **Feature Isolation** - Each page in its own folder
- **Shared Components** - Reusable UI in `/components/ui`
- **Type Safety** - Full TypeScript with interfaces
- **Service Layer** - Clean API separation
- **No Conflicts** - Team members can work on different pages independently

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

## 👥 Team Development

Each team member can work on different pages independently:
- **Developer 1**: Dashboard page (`/pages/Dashboard`)
- **Developer 2**: Add Product page (`/pages/AddProduct`)
- **Developer 3**: Product List page (`/pages/ProductList`)
- **Developer 4**: API services (`/services`)

All team members share:
- `/types` - Type definitions
- `/components/ui` - UI components
- `/hooks` - Custom React hooks
