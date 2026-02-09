import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';
import { parse } from 'url';

interface WebSocketClient extends WebSocket {
    isAlive: boolean;
    isAdmin: boolean;
    userId?: number;  // Track authenticated user for targeted broadcasts
}

export class WebSocketService {
    private wss: WebSocketServer | null = null;

    initialize(server: Server) {
        this.wss = new WebSocketServer({ server, path: '/ws' });

        this.wss.on('connection', (ws: WebSocketClient, req) => {
            const { query } = parse(req.url || '', true);

            // Simple admin check (in production, use session/jwt validation)
            // For now, we trust the client to send a role or check generic connection
            // But better: Checking cookie or header is hard in WS handshake without custom logic.
            // We will allow connection and client sends "subscribe" message.

            ws.isAlive = true;
            ws.on('pong', () => { ws.isAlive = true; });

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.type === 'SUBSCRIBE_ADMIN') {
                        // TODO: Verify admin token here
                        ws.isAdmin = true;
                        logger.info('Client subscribed to admin events');
                    } else if (data.type === 'SUBSCRIBE_USER' && data.userId) {
                        // Subscribe user for targeted order updates
                        ws.userId = Number(data.userId);
                        logger.info(`User ${ws.userId} subscribed to personal events`);
                    } else if (data.type === 'TYPING_START' && data.ticketId) {
                        // Broadcast typing indicator to all relevant parties
                        this.broadcastTyping(data.ticketId, data.userId, data.userName, true);
                    } else if (data.type === 'TYPING_STOP' && data.ticketId) {
                        this.broadcastTyping(data.ticketId, data.userId, data.userName, false);
                    } else if (data.type === 'READ_RECEIPT' && data.ticketId && data.messageId) {
                        // Broadcast read receipt
                        this.broadcastReadReceipt(data.ticketId, data.messageId, data.userId);
                    }
                } catch (e) {
                    logger.error('WS Message error', e);
                }
            });

            ws.on('error', (err) => {
                logger.error('WebSocket error:', err);
            });
        });

        // Heartbeat
        setInterval(() => {
            if (!this.wss) return;
            this.wss.clients.forEach((ws) => {
                const client = ws as WebSocketClient;
                if (client.isAlive === false) return client.terminate();
                client.isAlive = false;
                client.ping();
            });
        }, 30000);

        logger.info('WebSocket Server initialized');
    }

    broadcast(event: string, payload: any) {
        if (!this.wss) return;

        const message = JSON.stringify({ event, payload });

        this.wss.clients.forEach((client) => {
            const ws = client as WebSocketClient;
            if (ws.readyState === WebSocket.OPEN && ws.isAdmin) {
                ws.send(message);
            }
        });
    }

    // Broadcast to all (for testing or public updates)
    broadcastAll(event: string, payload: any) {
        if (!this.wss) return;
        const message = JSON.stringify({ event, payload });
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * Broadcast to a specific user by their userId
     * Used for targeted notifications like order status updates
     */
    broadcastToUser(userId: number, event: string, payload: any) {
        if (!this.wss) return;
        const message = JSON.stringify({ event, payload });

        this.wss.clients.forEach((client) => {
            const ws = client as WebSocketClient;
            if (ws.readyState === WebSocket.OPEN && ws.userId === userId) {
                ws.send(message);
                logger.debug(`Sent ${event} to user ${userId}`);
            }
        });
    }

    /**
     * Broadcast typing indicator for a ticket
     */
    broadcastTyping(ticketId: number, userId: number, userName: string, isTyping: boolean) {
        if (!this.wss) return;
        const event = isTyping ? 'TYPING_START' : 'TYPING_STOP';
        const message = JSON.stringify({
            event,
            payload: { ticketId, userId, userName }
        });

        this.wss.clients.forEach((client) => {
            const ws = client as WebSocketClient;
            // Send to admins or the ticket owner (if they have a different client)
            if (ws.readyState === WebSocket.OPEN && (ws.isAdmin || ws.userId !== userId)) {
                ws.send(message);
            }
        });
    }

    /**
     * Broadcast read receipt for a message in a ticket
     */
    broadcastReadReceipt(ticketId: number, messageId: number, readByUserId: number) {
        if (!this.wss) return;
        const message = JSON.stringify({
            event: 'READ_RECEIPT',
            payload: { ticketId, messageId, readByUserId }
        });

        this.wss.clients.forEach((client) => {
            const ws = client as WebSocketClient;
            if (ws.readyState === WebSocket.OPEN && ws.isAdmin) {
                ws.send(message);
            }
        });
    }
}

export const webSocketService = new WebSocketService();
