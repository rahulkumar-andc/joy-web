# Project Structure

## Directory Overview
```
Code-Structure/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI Components (Atomic design)
│   │   │   ├── ui/         # Shadcn/Radix Primitives
│   │   │   └── ...         # Feature components (Navbar, ProductCard)
│   │   ├── hooks/          # Custom React Hooks (use-cart, use-auth)
│   │   ├── pages/          # Route Pages (HomePage, ShopPage)
│   │   └── lib/            # Utilities (api, queryClient)
│   └── index.html          # Entry Point
├── server/                 # Backend (Express)
│   ├── routes.ts           # API Route Definitions
│   ├── storage.ts          # Database Interface (Repository Pattern)
│   ├── index.ts            # Server Entry & Middleware
│   └── middleware/         # Custom Middleware (auth, rate-limit)
├── shared/                 # Shared Types & Schema
│   └── schema.ts           # Drizzle ORM Schema & Zod Types
└── ...config files
```

## Key Architectural Decisions
- **Monorepo-like**: Frontend and Backend share types via `shared/` folder.
- **Type Safety**: End-to-end type safety using TypeScript and Drizzle/Zod.
- **SPA**: Single Page Application served by Express in production.
