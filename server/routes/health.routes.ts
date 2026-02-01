import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../db';
import { catchAsync } from '../utils/catchAsync';

export const healthRouter = Router();

/**
 * GET /health
 * Basic health check
 */
healthRouter.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

/**
 * GET /health/database
 * Database health check including replica
 */
healthRouter.get('/health/database', catchAsync(async (req: Request, res: Response) => {
    const health = await checkDatabaseHealth();

    const isHealthy = health.primary && health.replica;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: isHealthy ? 'healthy' : 'degraded',
        primary: health.primary,
        replica: health.replica,
        replicaLagMs: health.replicaLag,
        timestamp: new Date().toISOString()
    });
}));

export default healthRouter;
