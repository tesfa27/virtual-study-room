import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChatMessage {
    id?: string;
    message: string;
    username: string;
    is_edited?: boolean;
}

export interface OnlineUser {
    id: string;
    username: string;
}

export const useWebSocket = (roomId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [users, setUsers] = useState<OnlineUser[]>([]); // Presence State
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

        // Fetch message history from REST API
        const fetchMessageHistory = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/rooms/${roomId}/messages/`, {
                    credentials: 'include', // Send cookies
                });
                if (response.ok) {
                    const messages = await response.json();
                    setMessages(messages.map((msg: any) => ({
                        id: msg.id,
                        message: msg.message,
                        username: msg.username,
                        is_edited: msg.is_edited
                    })));
                }
            } catch (error) {
                console.error('Failed to load message history:', error);
            }
        };

        ws.onopen = () => {
            console.log("WebSocket Connected");
            setIsConnected(true);
            // Load message history after connecting
            fetchMessageHistory();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // Handle different message types
            if (data.type === 'presence_update') {
                setUsers(data.users);
            } else if (data.type === 'message_update') {
                // Update existing message
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === data.id
                            ? { ...msg, message: data.message, is_edited: true }
                            : msg
                    )
                );
            } else if (data.type === 'message_delete') {
                // Remove deleted message
                setMessages((prev) => prev.filter((msg) => msg.id !== data.id));
            } else if (data.message) {
                // Default to chat message if 'message' field exists (backwards compat)
                setMessages((prev) => [...prev, {
                    id: data.id,
                    message: data.message,
                    username: data.username,
                    is_edited: data.is_edited || false
                }]);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket Disconnected");
            setIsConnected(false);
            setUsers([]); // Clear users on disconnect
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

    const editMessage = useCallback((messageId: string, content: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'edit_message',
                message_id: messageId,
                content
            }));
        }
    }, []);

    const deleteMessage = useCallback((messageId: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'delete_message',
                message_id: messageId
            }));
        }
    }, []);

    return { messages, users, sendMessage, editMessage, deleteMessage, isConnected };
};
