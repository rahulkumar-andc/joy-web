/**
 * Real-time Audit Log Dashboard Service
 * 
 * WebSocket-based real-time audit log streaming
 */

import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../logger';
import { db } from '../db';
import { auditLogs } from '@shared/schema';
import { desc, sql, gt } from 'drizzle-orm';

export class AuditLogDashboardService {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private pollInterval: NodeJS.Timeout | null = null;
    private lastLogId: number = 0;

    /**
     * Initialize WebSocket server
     */
    initialize(server: any): void {
        this.wss = new WebSocketServer({
            server,
            path: '/ws/audit-logs'
        });

        this.wss.on('connection', (ws: WebSocket) => {
            this.handleConnection(ws);
        });

        // Start polling for new logs
        this.startPolling();

        logger.info('Audit log dashboard WebSocket server initialized');
    }

    /**
     * Handle new WebSocket connection
     */
    private handleConnection(ws: WebSocket): void {
        this.clients.add(ws);
        logger.info('Audit dashboard client connected', {
            clientCount: this.clients.size
        });

        // Send recent logs on connection
        this.sendRecentLogs(ws);

        ws.on('close', () => {
            this.clients.delete(ws);
            logger.info('Audit dashboard client disconnected', {
                clientCount: this.clients.size
            });
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error', { error });
            this.clients.delete(ws);
        });
    }

    /**
     * Send recent logs to a client
     */
    private async sendRecentLogs(ws: WebSocket): Promise<void> {
        try {
            const recentLogs = await db
                .select()
                .from(auditLogs)
                .orderBy(desc(auditLogs.createdAt))
                .limit(50);

            ws.send(JSON.stringify({
                type: 'INITIAL_LOGS',
                logs: recentLogs
            }));
        } catch (error) {
            logger.error('Failed to send recent logs', { error });
        }
    }

    /**
     * Start polling for new audit logs
     */
    private startPolling(): void {
        // Poll every 2 seconds for new logs
        this.pollInterval = setInterval(async () => {
            await this.checkForNewLogs();
        }, 2000);

        logger.info('Started polling for new audit logs');
    }

    /**
     * Check for new audit logs and broadcast
     */
    private async checkForNewLogs(): Promise<void> {
        if (this.clients.size === 0) return; // Skip if no clients

        try {
            const newLogs = await db
                .select()
                .from(auditLogs)
                .where(sql`${auditLogs.id} > ${this.lastLogId}`)
                .orderBy(desc(auditLogs.createdAt))
                .limit(100);

            if (newLogs.length > 0) {
                // Update last log ID
                this.lastLogId = Math.max(...newLogs.map(log => log.id));

                // Broadcast to all clients
                this.broadcast({
                    type: 'NEW_LOGS',
                    logs: newLogs.reverse(), // Chronological order
                    count: newLogs.length
                });

                logger.debug('Broadcasted new audit logs', { count: newLogs.length });
            }
        } catch (error) {
            logger.error('Failed to check for new logs', { error });
        }
    }

    /**
     * Broadcast message to all connected clients
     */
    private broadcast(message: any): void {
        const payload = JSON.stringify(message);

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(payload);
                } catch (error) {
                    logger.error('Failed to send to client', { error });
                }
            }
        });
    }

    /**
     * Manually trigger a log broadcast
     */
    broadcastLog(log: any): void {
        this.broadcast({
            type: 'NEW_LOG',
            log
        });
    }

    /**
     * Get connection statistics
     */
    getStats(): {
        connectedClients: number;
        lastLogId: number;
        isPolling: boolean;
    } {
        return {
            connectedClients: this.clients.size,
            lastLogId: this.lastLogId,
            isPolling: this.pollInterval !== null
        };
    }

    /**
     * Stop polling and close all connections
     */
    shutdown(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        this.clients.forEach(client => {
            client.close();
        });
        this.clients.clear();

        if (this.wss) {
            this.wss.close();
        }

        logger.info('Audit log dashboard service shutdown');
    }
}

export const auditLogDashboardService = new AuditLogDashboardService();
