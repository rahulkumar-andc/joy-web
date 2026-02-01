/**
 * Sentry Integration
 * 
 * Provides error tracking, performance monitoring, and request tracing
 * for production debugging and observability.
 */

import * as Sentry from '@sentry/node';
// import { ProfilingIntegration } from '@sentry/profiling-node';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

interface SentryConfig {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
    enabled: boolean;
}

export class SentryService {
    private static config: SentryConfig;
    private static initialized = false;

    /**
     * Initialize Sentry with configuration
     */
    static init(dsn?: string): void {
        const environment = process.env.NODE_ENV || 'development';

        this.config = {
            dsn: dsn || process.env.SENTRY_DSN || '',
            environment,
            tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
            profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
            enabled: !!dsn || !!process.env.SENTRY_DSN
        };

        if (!this.config.enabled) {
            logger.info('⚠️ Sentry DSN not configured. Error tracking disabled.');
            return;
        }

        Sentry.init({
            dsn: this.config.dsn,
            environment: this.config.environment,

            // Performance Monitoring
            tracesSampleRate: this.config.tracesSampleRate,
            profilesSampleRate: this.config.profilesSampleRate,

            // Integrations and advanced config disabled for v10 compatibility
            // integrations: [...],

            // Sanitize sensitive data
            beforeSend(event, hint) {
                // Remove sensitive fields from error context
                if (event.request) {
                    // Remove authorization headers
                    if (event.request.headers) {
                        delete event.request.headers['authorization'];
                        delete event.request.headers['cookie'];
                    }

                    // Sanitize body data
                    if (event.request.data) {
                        const data = typeof event.request.data === 'string'
                            ? JSON.parse(event.request.data)
                            : event.request.data;

                        // Remove password fields
                        if (data.password) data.password = '[REDACTED]';
                        if (data.newPassword) data.newPassword = '[REDACTED]';
                        if (data.currentPassword) data.currentPassword = '[REDACTED]';

                        event.request.data = data;
                    }
                }

                return event;
            },

            // Ignore common errors
            ignoreErrors: [
                'ResizeObserver loop limit exceeded',
                'Non-Error promise rejection captured',
                'Network request failed',
                'NetworkError'
            ]
        });

        this.initialized = true;
        logger.info(`✅ Sentry initialized (${environment})`);
    }

    /**
     * Express request handler middleware
     */
    static requestHandler() {
        return (req: Request, res: Response, next: NextFunction) => next();
        /*
        return Sentry.Handlers.requestHandler({
            user: ['id', 'email', 'role']
        });
        */
    }

    /**
     * Express tracing middleware
     */
    static tracingHandler() {
        return (req: Request, res: Response, next: NextFunction) => next();
        // return Sentry.Handlers.tracingHandler();
    }

    /**
     * Express error handler middleware
     */
    static errorHandler() {
        return (err: any, req: Request, res: Response, next: NextFunction) => next(err);
        /*
        return Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Capture all errors with status >= 500
                return true;
            }
        });
        */
    }

    /**
     * Capture exception manually
     */
    static captureException(error: Error, context?: Record<string, any>): void {
        if (!this.initialized) return;

        Sentry.captureException(error, {
            extra: context
        });

        logger.error('Exception captured by Sentry', { error, context });
    }

    /**
     * Capture message
     */
    static captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
        if (!this.initialized) return;

        Sentry.captureMessage(message, level);
    }

    /**
     * Set user context for current transaction
     */
    static setUser(user: { id: number; email: string; role: string }): void {
        if (!this.initialized) return;

        Sentry.setUser({
            id: user.id.toString(),
            email: user.email,
            role: user.role
        });
    }

    /**
     * Clear user context
     */
    static clearUser(): void {
        if (!this.initialized) return;
        Sentry.setUser(null);
    }

    /**
     * Add breadcrumb for debugging
     */
    static addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
        if (!this.initialized) return;

        Sentry.addBreadcrumb({
            message,
            category,
            data,
            level: 'info'
        });
    }

    /**
     * Start a new transaction for performance monitoring
     */
    static startTransaction(name: string, op: string): any {
        if (!this.initialized) return undefined;

        return undefined;
        /*
        return Sentry.startTransaction({
            name,
            op
        });
        */
    }

    /**
     * Middleware to add correlation ID to requests
     */
    static correlationMiddleware() {
        return (req: Request, res: Response, next: NextFunction) => {
            // Generate correlation ID
            const correlationId = req.headers['x-correlation-id'] as string
                || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Store in request
            (req as any).correlationId = correlationId;

            // Add to response headers
            res.setHeader('X-Correlation-ID', correlationId);

            // Add to Sentry context
            if (this.initialized) {
                /*
                Sentry.configureScope((scope) => {
                    scope.setTag('correlation_id', correlationId);
                });
                */
            }

            next();
        };
    }

    /**
     * Close Sentry (flush events before shutdown)
     */
    static async close(): Promise<void> {
        if (!this.initialized) return;

        await Sentry.close(2000); // 2 second timeout
        logger.info('Sentry closed');
    }
}

export const sentryService = SentryService;
