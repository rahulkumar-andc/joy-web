import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';
import { parse } from 'url';

interface WebSocketClient extends WebSocket {
    isAlive: boolean;
    isAdmin: boolean;
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
}

export const webSocketService = new WebSocketService();
