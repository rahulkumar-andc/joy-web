# Database Setup Guide

This project uses **PostgreSQL** with **Drizzle ORM**.

## 1. Prerequisites
- PostgreSQL installed and running (or use a cloud provider like Neon/Supabase/Render).
- Node.js installed.

## 2. Environment Variables
Ensure your `.env` file contains the database credentials:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## 3. Initialization
We use Drizzle Kit to manage schema changes.

### Push Schema to Database
This command synchronizes your database schema with the Drizzle schema defined in `shared/schema.ts`.

```bash
npm run db:push
```

## 4. Seeding Data
The application automatically seeds initial data (categories, products, admin user) on startup if the database is empty.

To manually verify or reset:
1. Ensure the DB is clean (optional).
2. Start the server: `npm run dev`.
3. Check the server logs for "Seeding database..." (if applicable) or verify data via API.

## 5. Troubleshooting
- **Connection Refused**: Check if your Postgres server is running and the port (default 5432) is correct.
- **Authentication Failed**: Verify `user` and `password` in `DATABASE_URL`.
