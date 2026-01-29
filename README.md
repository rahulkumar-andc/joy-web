# Luxury Fashion E-Commerce Platform

A full-stack e-commerce application built with **React**, **Express**, and **PostgreSQL** using modern web technologies.

---

## 🚀 Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 18, Vite, TailwindCSS, Framer Motion      |
| Backend    | Express 5, Passport (session-based auth)        |
| Database   | PostgreSQL 16, Drizzle ORM                      |
| Styling    | TailwindCSS, Radix UI Components                |
| Validation | Zod, React Hook Form                            |

---

## 📋 Requirements

- **Node.js** 20.x or higher
- **PostgreSQL** 16.x
- **npm** (comes with Node.js)

---

## 🛠️ Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Code-Structure
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name

# Server Port (Optional, defaults to 5000)
PORT=5000
```

> ⚠️ **Note:** Replace `username`, `password`, and `your_database_name` with your PostgreSQL credentials.

### 4. Set Up the Database

Push the database schema to your PostgreSQL instance:

```bash
npm run db:push
```

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The app will be available at: **http://localhost:5000**

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
Code-Structure/
├── client/              # Frontend React application
│   ├── src/             # React components, pages, hooks
│   ├── public/          # Static assets
│   └── index.html       # Entry HTML file
├── server/              # Backend Express server
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Data storage layer
│   └── db.ts            # Database connection
├── shared/              # Shared code between frontend/backend
│   ├── schema.ts        # Drizzle ORM database schema
│   └── routes.ts        # API type definitions
├── script/              # Build scripts
├── package.json         # Dependencies and scripts
├── drizzle.config.ts    # Drizzle ORM configuration
├── tailwind.config.ts   # TailwindCSS configuration
└── vite.config.ts       # Vite configuration
```

---

## 📝 Available Scripts

| Command          | Description                           |
| ---------------- | ------------------------------------- |
| `npm run dev`    | Start development server              |
| `npm run build`  | Build for production                  |
| `npm start`      | Start production server               |
| `npm run check`  | TypeScript type checking              |
| `npm run db:push`| Push database schema changes          |

---

## 📚 Documentation
- [To-Do List](./todo.md) - Next steps and priorities
- [Features](./features.md) - Comprehensive feature list
- [Project Structure](./structure.md) - Architecture overview
- [Security Status](./security.md) - Security measures
- [Improvements](./improvements.md) - Future enhancements
- [Security Improvements](./security-improvements.md) - Hardening checklist

---

## 🎨 Features Highlights
- **User Authentication** - Session-based auth with Passport.js
- **Product Catalog** - Categories, filters, search functionality
- **Shopping Cart** - Add/remove items, quantity management
- **Wishlist** - Save favorite products
- **Order Management** - Track order status
- **Admin Dashboard** - Manage products, categories, orders
- **Reviews & Ratings** - Customer product reviews
- **UI/UX** - Dark Mode, Infinite Scroll, Search Autocomplete, Mobile Optimized

---

## 🔐 User Roles

| Role    | Access Level                              |
| ------- | ----------------------------------------- |
| Admin   | Full access to all features               |
| Manager | Product & order management                |
| User    | Shopping, cart, wishlist, order placement |

---

## 🎨 Design System

- **Primary Colors:** Soft Pink (#FCEFE9), Warm Beige, Dark Brown (#4A3B32)
- **Accent:** Orange (#E89F71)
- **Fonts:** Playfair Display (Headings), DM Sans (Body)

---

## 📄 License

MIT License
