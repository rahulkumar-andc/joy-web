# Redis Serialization Fix & Best Practices

## Problem
The application was crashing with `SyntaxError: "[object Object]" is not valid JSON` during Redis reads.
This occurs when:
1. An object is implicitly converted to a string (resulting in `"[object Object]"`) instead of being JSON stringified before being stored in Redis.
2. The code reads this value and attempts `JSON.parse("[object Object]")`, which throws a SyntaxError.
3. The application does not handle this error gracefully, causing a crash.

## Solution

We have implemented a robust Redis wrapper and updated configuration to handle serialization strictly and safely.

### 1. Robust Redis Wrapper (`server/cache.ts`)

We introduced `redisGet<T>` and `redisSet` helpers that are used by `cacheService`.

- **Strict Writes (`redisSet`)**:
  - We explicitly call `JSON.stringify(value)` *before* sending data to Redis.
  - This guarantees that we never rely on implicit `toString()` conversion or the Redis client's possibly ambiguous behavior with objects.
  - If serialization fails, the error is logged, and the write is skipped (preventing corrupted data).

- **Safe Reads (`redisGet`)**:
  - We strictly check if the returned value is a string.
  - We wrap `JSON.parse()` in a `try/catch` block.
  - If parsing fails (e.g., if the cache contains `[object Object]`), we log a warning and return `null`.
  - **Result**: The app treats it as a cache miss instead of crashing.

### 2. Connect-Redis Session Fix (`server/routes.ts`)

We configured `RedisStore` with a custom `serializer`.

```typescript
serializer: {
  parse: (json: string) => {
    try {
      return JSON.parse(json);
    } catch (err) {
      console.error("Redis session parse error:", err);
      return null; // Return null (trigger session reset) instead of crashing
    }
  },
  stringify: (obj: any) => JSON.stringify(obj),
}
```

This ensures that if a user's session data in Redis is corrupted, their session is reset (logged out) rather than the server crashing for everyone.

### 3. Cart Caching (`server/controllers/orderController.ts`)

We updated `OrderController` to use the robust `cacheService` for the Cart API (`getCart`).

- **Cache-Aside Pattern**:
  - Check cache (`USER_CART_{id}` or `SESSION_CART_{id}`).
  - If miss, fetch from DB, then cache.
  - If hit, return cached data.
- **Invalidation**:
  - `addToCart`, `updateCartItem`, `removeFromCart` all invalidate the specific user's cache key.
  - This ensures data consistency while offloading read traffic from the DB.
- **Graceful Fallback**:
  - If Redis is down or returns errors, `cacheService.getOrSet` automatically falls back to the database (the `fetchFn`), ensuring 100% uptime for the API even without cache.

## Usage Guide

To use Redis safely in other parts of the app:

```typescript
import { cacheService } from "../cache";

// Reading
const data = await cacheService.get<MyType>("my_key");
// Returns undefined if missing or corrupted.

// Writing
await cacheService.set("my_key", myObject, CacheTTL.MEDIUM);
// Automatically stringifies.

// Get or Set (Preferred)
const result = await cacheService.getOrSet(
    "my_key",
    async () => {
        return await db.fetchData(); // Fallback source
    },
    CacheTTL.MEDIUM
);
```
