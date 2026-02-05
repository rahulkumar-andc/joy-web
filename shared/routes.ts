import { z } from 'zod';
import {
  insertUserSchema, insertProductSchema, insertCategorySchema, insertReviewSchema, insertCouponSchema,
  insertProductSizeSchema, insertProductColorSchema, insertProductImageSchema,
  cartAddSchema, cartUpdateSchema, orderCreateSchema, wishlistAddSchema, profileUpdateSchema, changePasswordSchema, reviewCreateSchema,
  users, products, categories, cartItems, wishlistItems, orders, homepageSections, reviews, coupons
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema,
      responses: {
        200: z.object({ message: z.string(), userId: z.number() }),
        400: errorSchemas.validation,
      },
    },
    verifyEmail: {
      method: 'POST' as const,
      path: '/api/auth/verify-email',
      input: z.object({ email: z.string().email(), otp: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.any(),
      },
    },
    forgotPassword: {
      method: 'POST' as const,
      path: '/api/auth/forgot-password',
      input: z.object({ email: z.string().email() }),
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    resetPassword: {
      method: 'POST' as const,
      path: '/api/auth/reset-password',
      input: z.object({ token: z.string(), password: z.string().min(6) }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  profile: {
    get: {
      method: 'GET' as const,
      path: '/api/profile',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profile',
      input: profileUpdateSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    changePassword: {
      method: 'POST' as const,
      path: '/api/profile/password',
      input: changePasswordSchema,
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        401: errorSchemas.validation,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      input: z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        sort: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema.extend({
        variantSizes: z.array(insertProductSizeSchema.omit({ productId: true })).optional(),
        variantColors: z.array(insertProductColorSchema.omit({ productId: true })).optional(),
        galleryImages: z.array(insertProductImageSchema.omit({ productId: true })).optional()
      }),
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories',
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
  },
  homepage: {
    get: {
      method: 'GET' as const,
      path: '/api/homepage',
      responses: {
        200: z.array(z.object({
          section: z.custom<typeof homepageSections.$inferSelect>(),
          items: z.array(z.custom<typeof products.$inferSelect>()),
        })),
      },
    },
  },
  cart: {
    get: {
      method: 'GET' as const,
      path: '/api/cart',
      responses: {
        200: z.array(z.object({
          item: z.custom<typeof cartItems.$inferSelect>(),
          product: z.custom<typeof products.$inferSelect>(),
        })),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/cart',
      input: cartAddSchema,
      responses: {
        200: z.custom<typeof cartItems.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/cart/:id',
      input: cartUpdateSchema,
      responses: {
        200: z.custom<typeof cartItems.$inferSelect>(),
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/cart/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  orders: {
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: orderCreateSchema,
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
      },
    },
  },
  wishlist: {
    get: {
      method: 'GET' as const,
      path: '/api/wishlist',
      responses: {
        200: z.array(z.object({
          item: z.custom<typeof wishlistItems.$inferSelect>(),
          product: z.custom<typeof products.$inferSelect>(),
        })),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/wishlist',
      input: wishlistAddSchema,
      responses: {
        200: z.custom<typeof wishlistItems.$inferSelect>(),
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/wishlist/:productId',
      responses: {
        204: z.void(),
      },
    },
    check: {
      method: 'GET' as const,
      path: '/api/wishlist/check/:productId',
      responses: {
        200: z.object({ inWishlist: z.boolean() }),
      },
    },
  },
  reviews: {
    list: {
      method: 'GET' as const,
      path: '/api/products/:productId/reviews',
      responses: {
        200: z.array(z.object({
          review: z.custom<typeof reviews.$inferSelect>(),
          user: z.object({ name: z.string() }),
        })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products/:productId/reviews',
      input: reviewCreateSchema,
      responses: {
        201: z.custom<typeof reviews.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    avgRating: {
      method: 'GET' as const,
      path: '/api/products/:productId/rating',
      responses: {
        200: z.object({ rating: z.number(), count: z.number() }),
      },
    },
  },
  coupons: {
    validate: {
      method: 'POST' as const,
      path: '/api/coupons/validate',
      input: z.object({ code: z.string(), orderAmount: z.number() }),
      responses: {
        200: z.object({ valid: z.boolean(), discount: z.number(), message: z.string().optional() }),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/coupons',
      input: insertCouponSchema,
      responses: {
        201: z.custom<typeof coupons.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/coupons',
      responses: {
        200: z.array(z.custom<typeof coupons.$inferSelect>()),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/coupons/:id',
      responses: {
        204: z.void(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
