# Security Overview

## Authentication
- **Session-Based Auth**: Uses Passport.js with persistent sessions using `connect-pg-simple`.
- **Password Hashing**: Scrypt hashing via Node's `crypto` module.

## Integrity & Protection
- **Rate Limiting**: `express-rate-limit` configured on API routes (strict limits for Auth).
  - *Status*: Middleware added, optimization pending.
- **SQL Injection**: Protected via Drizzle ORM parameterization.
- **XSS**: Protected via React's default escaping and sanitized inputs.

## Upcoming Improvements
- **Input Validation**: Integrating Zod for runtime schema validation on all inputs.
- **Security Headers**: Implementing Helmet.js for Content Security Policy (CSP), HSTS, etc.
- **CSRF Protection**: Adding CSURF middleware for form submissions.
