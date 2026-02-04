# Project Structure

## Directory Overview
```
Code-Structure/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI Components (Atomic design)
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── pages/          # Route Pages
│   │   └── lib/            # Utilities
│   └── index.html          # Entry Point
├── server/                 # Backend (Express)
│   ├── controllers/        # Request Handlers
│   ├── routes/             # Route Definitions (Modular)
│   ├── services/           # Business Logic
│   ├── repositories/       # Data Access Layer
│   ├── index.ts            # Server Entry
│   └── middleware/         # Custom Middleware
├── shared/                 # Shared Types & Schema
├── docs/                   # Documentation
└── ...config files
```

## Key Architectural Decisions
- **Monorepo-like**: Frontend and Backend share types via `shared/` folder.
- **Type Safety**: End-to-end type safety using TypeScript and Drizzle/Zod.
- **SPA**: Single Page Application served by Express in production.
