import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './use-auth';

interface WebSocketMessage {
    event: string;
    payload: any;
}

interface UseWebSocketOptions {
    onMessage?: (message: WebSocketMessage) => void;
    autoConnect?: boolean;
}

/**
 * WebSocket hook for real-time updates
 * 
 * Automatically connects when user is authenticated and subscribes
 * to user-specific events like order status updates.
 * 
 * @example
 * ```tsx
 * const { isConnected, lastMessage } = useWebSocket();
 * 
 * useEffect(() => {
 *   if (lastMessage?.event === 'ORDER_STATUS_UPDATE') {
 *     // Handle order update
 *   }
 * }, [lastMessage]);
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
    const { onMessage, autoConnect = true } = options;
    const { user } = useAuth();
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout>();
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const connect = useCallback(() => {
        if (!user || ws.current?.readyState === WebSocket.OPEN) return;

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;

            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                setIsConnected(true);
                setConnectionError(null);

                // Subscribe to user-specific events
                ws.current?.send(JSON.stringify({
                    type: 'SUBSCRIBE_USER',
                    userId: user.id
                }));
            };

            ws.current.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(data);
                    onMessage?.(data);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);

                // Auto-reconnect after 5 seconds
                if (autoConnect && user) {
                    reconnectTimeout.current = setTimeout(connect, 5000);
                }
            };

            ws.current.onerror = (error) => {
                setConnectionError('WebSocket connection error');
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            setConnectionError('Failed to establish WebSocket connection');
            console.error('WebSocket connection failed:', error);
        }
    }, [user, onMessage, autoConnect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((type: string, payload?: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, ...payload }));
        }
    }, []);

    useEffect(() => {
        if (autoConnect && user) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [user, autoConnect, connect, disconnect]);

    return {
        isConnected,
        lastMessage,
        connectionError,
        connect,
        disconnect,
        sendMessage
    };
}

/**
 * Specialized hook for order tracking real-time updates
 * 
 * @example
 * ```tsx
 * const { orderUpdate } = useOrderTracking(orderId);
 * 
 * useEffect(() => {
 *   if (orderUpdate) {
 *     // Refetch order data or update UI
 *   }
 * }, [orderUpdate]);
 * ```
 */
export function useOrderTracking(orderId: number | string | undefined) {
    const [orderUpdate, setOrderUpdate] = useState<any>(null);

    const handleMessage = useCallback((message: WebSocketMessage) => {
        if (message.event === 'ORDER_STATUS_UPDATE' &&
            message.payload?.orderId === Number(orderId)) {
            setOrderUpdate(message.payload);
        }
    }, [orderId]);

    const { isConnected, connectionError } = useWebSocket({
        onMessage: handleMessage
    });

    return {
        isConnected,
        orderUpdate,
        connectionError
    };
}
