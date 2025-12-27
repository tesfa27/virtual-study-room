import { useEffect, useRef, useState, useCallback } from 'react';
import { getRoomMessages, type ChatMessage, type PomodoroSession, getPomodoroSession } from '../api/rooms';
import { WS_URL } from '../api/config';
import { getCookie } from '../api/client';

export interface OnlineUser {
    id: string;
    username: string;
    role?: string; // member, moderator, admin
}

export const useWebSocket = (roomId: string) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [users, setUsers] = useState<OnlineUser[]>([]); // Presence State
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // userId -> username
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Initial load state
    const [pomodoro, setPomodoro] = useState<PomodoroSession | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const token = getCookie('access_token');
        const wsUrl = `${WS_URL}/ws/room/${roomId}/?token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // Fetch message history from REST API
        const fetchMessageHistory = async () => {
            setIsLoading(true);
            try {
                const [msgData, pomodoroData] = await Promise.all([
                    getRoomMessages(roomId, 1),
                    getPomodoroSession(roomId).catch(() => null)
                ]);

                // Backend returns newest first. We reverse to show oldest -> newest.
                setMessages(msgData.results.reverse());
                setHasMore(!!msgData.next);
                setPage(1);

                if (pomodoroData) setPomodoro(pomodoroData);
            } catch (error) {
                console.error('Failed to load room data:', error);
            } finally {
                setIsLoading(false);
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
            } else if (data.type === 'user_typing') {
                // Handle typing indicator
                setTypingUsers((prev) => {
                    const newMap = new Map(prev);
                    if (data.is_typing) {
                        newMap.set(data.user_id, data.username);
                    } else {
                        newMap.delete(data.user_id);
                    }
                    return newMap;
                });
            } else if (data.type === 'unread_count_update') {
                // Update unread count
                setUnreadCount(data.unread_count);
            } else if (data.type === 'message_seen_update') {
                // Update seen_by list for a message
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg.id === data.message_id) {
                            const currentSeen = msg.seen_by || [];
                            if (!currentSeen.includes(data.user_id)) {
                                return { ...msg, seen_by: [...currentSeen, data.user_id] };
                            }
                        }
                        return msg;
                    })
                );
            } else if (data.type === 'user_kicked') {
                // User was kicked from room
                alert(`You were kicked from the room by ${data.kicked_by}`);
                window.location.href = '/';
            } else if (data.type === 'user_removed') {
                // Someone was removed from room
                console.log(`${data.user_id} was removed by ${data.removed_by}`);
            } else if (data.type === 'user_role_updated') {
                // User role was changed
                setUsers((prev) =>
                    prev.map((user) =>
                        user.id === data.user_id
                            ? { ...user, role: data.new_role }
                            : user
                    )
                );
            } else if (data.type === 'room_settings_updated') {
                // Room settings changed
                console.log('Room settings updated:', data.settings);
            } else if (data.type === 'user_muted') {
                // Current user was muted
                alert(`You have been muted by ${data.muted_by} for ${data.duration} minutes`);
            } else if (data.type === 'user_muted_notification') {
                // Someone was muted
                console.log(`User ${data.user_id} was muted by ${data.muted_by}`);
            } else if (data.type === 'error') {
                // Error message from server
                alert(`Error: ${data.message}`);
            } else if (data.message) {
                // Default to chat message if 'message' field exists (backwards compat)
                setMessages((prev) => [...prev, {
                    id: data.id,
                    message: data.message,
                    username: data.username,
                    is_edited: data.is_edited || false,
                    seen_by: [],
                    sender_id: data.sender_id,
                    message_type: data.message_type,
                    created_at: data.created_at,
                    replied_to_message: data.replied_to_message || null
                }]);
            } else if (data.type === 'message_reaction_added') {
                // Add reaction
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg.id === data.message_id) {
                            const currentReactions = msg.reactions || {};
                            const currentUsers = currentReactions[data.emoji] || [];
                            if (!currentUsers.includes(data.user_id)) {
                                return {
                                    ...msg,
                                    reactions: {
                                        ...currentReactions,
                                        [data.emoji]: [...currentUsers, data.user_id]
                                    }
                                };
                            }
                        }
                        return msg;
                    })
                );
            } else if (data.type === 'message_reaction_removed') {
                // Remove reaction
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg.id === data.message_id) {
                            const currentReactions = msg.reactions || {};
                            const currentUsers = currentReactions[data.emoji] || [];
                            return {
                                ...msg,
                                reactions: {
                                    ...currentReactions,
                                    [data.emoji]: currentUsers.filter(uid => uid !== data.user_id)
                                }
                            };
                        }
                        return msg;
                    })
                );
            } else if (data.type === 'pomodoro_update') {
                setPomodoro(data.data);
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

    const loadMoreMessages = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await getRoomMessages(roomId, nextPage);

            if (data.results.length === 0) {
                setHasMore(false);
            } else {
                // Prepend older messages
                const olderMessages = [...data.results].reverse();
                setMessages(prev => [...olderMessages, ...prev]);
                setPage(nextPage);
                setHasMore(!!data.next);
            }
        } catch (error) {
            console.error('Failed to load older messages:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [roomId, page, hasMore, isLoadingMore]);

    const sendMessage = useCallback((message: string, repliedToId?: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const payload: any = { message };
            if (repliedToId) {
                payload.replied_to_id = repliedToId;
            }
            wsRef.current.send(JSON.stringify(payload));
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

    const sendTyping = useCallback((isTyping: boolean) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                is_typing: isTyping
            }));
        }
    }, []);

    const markSeen = useCallback((messageId: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'mark_seen',
                message_id: messageId
            }));
        }
    }, []);

    // Group Management Functions
    const kickUser = useCallback((userId: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'kick_user',
                user_id: userId
            }));
        }
    }, []);

    const promoteUser = useCallback((userId: string, role: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'promote_user',
                user_id: userId,
                role
            }));
        }
    }, []);

    const updateRoomSettings = useCallback((settings: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'update_room_settings',
                settings
            }));
        }
    }, []);

    const muteUser = useCallback((userId: string, duration: number) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'mute_user',
                user_id: userId,
                duration
            }));
        }
    }, []);

    const addReaction = useCallback((messageId: string, emoji: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'add_reaction',
                message_id: messageId,
                emoji
            }));
        }
    }, []);

    const removeReaction = useCallback((messageId: string, emoji: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'remove_reaction',
                message_id: messageId,
                emoji
            }));
        }
    }, []);

    return {
        messages,
        users,
        typingUsers,
        unreadCount,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTyping,
        markSeen,
        kickUser,
        promoteUser,
        updateRoomSettings,
        muteUser,
        addReaction,
        removeReaction,
        isConnected,
        loadMoreMessages,
        hasMore,
        isLoadingMore,
        isLoading,
        pomodoro
    };
};

