import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
    message: string;
    username: string;
}

export const useWebSocket = (roomId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Get access token from cookie for handshake
    const getAccessToken = () => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; access_token=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
    };

    useEffect(() => {
        if (!roomId) return;

        const token = getAccessToken();
        // In dev, assuming localhost:8000. In prod, this should be env var.
        const wsUrl = `ws://localhost:8000/ws/room/${roomId}/?token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.message) {
                setMessages((prev) => [...prev, { message: data.message, username: data.username }]);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
        };

        ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
        };

        return () => {
            ws.close();
        };
    }, [roomId]);

    const sendMessage = useCallback((message: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ message }));
        } else {
            console.warn("WebSocket is not connected");
        }
    }, []);

    return { messages, sendMessage, isConnected };
};
