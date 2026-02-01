/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

export function initSentry() {
    if (!SENTRY_DSN) {
        console.warn('⚠️  SENTRY_DSN not configured - Sentry disabled');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: NODE_ENV,

        // Performance monitoring
        tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

        // Profiling
        profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations: [
            nodeProfilingIntegration(),
        ],

        // Filter sensitive data
        beforeSend(event, hint) {
            // Don't send errors in development unless explicitly enabled
            if (NODE_ENV === 'development' && !process.env.SENTRY_DEV) {
                return null;
            }

            // Scrub sensitive data from event
            if (event.request?.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
            }

            return event;
        },
    });

    console.log('✅ Sentry initialized:', NODE_ENV);
}

export { Sentry };
