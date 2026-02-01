/**
 * Correlation ID Middleware
 * Generates unique request IDs for tracking requests across services
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
        }
    }
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
    // Check if correlation ID already exists in headers (from upstream services)
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Attach to request object
    req.correlationId = correlationId;

    // Add to response headers for client tracking
    res.setHeader('X-Correlation-ID', correlationId);

    next();
}
