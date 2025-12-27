import { useState, useRef, useEffect, useMemo } from "react";
import MessageItem from './MessageItem';
import FileList from './FileList';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
    Button,
    Avatar,
    TextField,
    Chip,
    Tooltip,
    Menu,
    MenuItem,
    Alert,
    Badge,
    ListItemAvatar,
    Skeleton,
    CircularProgress
} from "@mui/material";
import {
    MessageSquare,
    Users,
    MoreVertical,
    UserX,
    Shield,
    Volume2,
    Edit2,
    Trash2,
    Eye,
    UserPlus,
    ArrowUpCircle,
    MicOff,
    Smile,
    X,
    FileText,
    Paperclip
} from "lucide-react";
import { type ChatMessage, type RoomMember, type RoomFile, uploadRoomFile } from "../../api/rooms";
import type { OnlineUser } from "../../hooks/use-websocket";

interface ChatSidebarProps {
    roomId: string; // Needed for file upload
    activeTab: 'chat' | 'users' | 'files';
    setActiveTab: (tab: 'chat' | 'users' | 'files') => void;
    messages: ChatMessage[];
    users: OnlineUser[];
    allMembers: RoomMember[];
    files: RoomFile[];
    typingUsers: Map<string, string>;
    isConnected: boolean;
    user: any; // Current User
    // Actions
    onSendMessage: (msg: string, repliedToId?: string) => void;
    onEditMessage: (id: string, content: string) => void;
    onDeleteMessage: (id: string) => void;
    onSendTyping: (isTyping: boolean) => void;
    onMarkSeen: (id: string) => void;
    // Group Management
    onKickUser: (id: string) => void;
    onPromoteUser: (id: string, role: string) => void;
    onMuteUser: (id: string, duration: number) => void;
    // Reactions
    onAddReaction: (id: string, emoji: string) => void;
    onRemoveReaction: (id: string, emoji: string) => void;

    // Pagination
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    isLoading?: boolean;
}

// Helper functions
const formatMessageTime = (isoString?: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getMessageDateHeader = (isoString?: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    const now = new Date();

    const isCurrentYear = date.getFullYear() === now.getFullYear();
    const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        year: isCurrentYear ? undefined : 'numeric'
    };

    return date.toLocaleDateString(undefined, options);
};

const isNewDay = (currentIso?: string, prevIso?: string) => {
    if (!currentIso) return false;
    if (!prevIso) return true;
    const d1 = new Date(currentIso);
    const d2 = new Date(prevIso);
    return d1.toDateString() !== d2.toDateString();
};

export default function ChatSidebar({
    roomId,
    activeTab,
    setActiveTab,
    messages,
    users,
    allMembers,
    files,
    typingUsers,
    isConnected,
    user,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    onSendTyping,
    onMarkSeen,
    onKickUser,
    onPromoteUser,
    onMuteUser,
    onAddReaction,
    onRemoveReaction,
    onLoadMore,
    hasMore,
    isLoadingMore,
    isLoading
}: ChatSidebarProps) {
    const displayUsers = useMemo(() => {
        // Temporary fix: Show all members as online since WebSocket presence is unreliable
        // TODO: Implement proper presence tracking with heartbeats
        if (!allMembers) return users.map(u => ({ ...u, isOnline: true }));

        return allMembers.map(m => ({
            id: String(m.user),
            username: m.username,
            role: m.role,
            isOnline: true // Assume all members are online for now
        })).sort((a, b) => a.username.localeCompare(b.username));
    }, [allMembers]);

    // Local State
    const [newMessage, setNewMessage] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Track if we have performed the initial scroll to bottom
    const hasInitialScrolled = useRef(false);
    // Track previous scroll height for pagination restoration
    const previousScrollHeightRef = useRef<number>(0);
    // Track last message ID to detect new messages
    const lastMessageIdRef = useRef<string | null>(null);
    const previousFirstMessageIdRef = useRef<string | null>(null);

    // Smart Scroll Logic & Pagination Restoration
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container || messages.length === 0) return;

        const currentFirstMessageId = messages[0]?.id;
        const isPrepend = previousFirstMessageIdRef.current !== currentFirstMessageId;

        // 0. Handle Pagination Scroll Restoration
        // Only run if we actually prepended messages (found by checking first message ID)
        if (previousScrollHeightRef.current > 0) {
            if (isPrepend) {
                const heightDifference = container.scrollHeight - previousScrollHeightRef.current;
                if (heightDifference > 0) {
                    container.scrollTop = heightDifference;
                }
                previousScrollHeightRef.current = 0;
            } else {
                // Messages updated (e.g. new message at bottom) but loadMore hasn't finished (no prepend yet).
                // Do NOT reset previousScrollHeightRef. Just ignore auto-scroll.
            }

            // Ref updates
            previousFirstMessageIdRef.current = currentFirstMessageId;
            if (messages.length > 0) {
                lastMessageIdRef.current = messages[messages.length - 1].id;
            }
            return;
        }

        // 1. Initial Load: Always scroll to bottom once messages are loaded
        if (!hasInitialScrolled.current) {
            container.scrollTop = container.scrollHeight;
            hasInitialScrolled.current = true;
            if (messages.length > 0) {
                lastMessageIdRef.current = messages[messages.length - 1].id;
                previousFirstMessageIdRef.current = messages[0]?.id;
            }
            return;
        }

        // 2. Determine if we should auto-scroll for new messages
        const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isNearBottom = distanceToBottom < 150;

        // Check if the latest message is from current user AND is new
        const lastMessage = messages[messages.length - 1];
        const isOwnMessage = lastMessage?.username === user?.username;
        const isNewMessage = lastMessage?.id !== lastMessageIdRef.current;

        if (isNearBottom || (isOwnMessage && isNewMessage)) {
            container.scrollTop = container.scrollHeight;
        }

        // Update refs
        lastMessageIdRef.current = lastMessage?.id || null;
        previousFirstMessageIdRef.current = currentFirstMessageId;

        // Mark as seen logic
        if (messages.length > 0 && lastMessage) {
            if (lastMessage.username !== user?.username && lastMessage.id) {
                onMarkSeen(lastMessage.id);
            }
        }
    }, [messages, user?.username, onMarkSeen]);

    // Handle Scroll for Pagination
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (container.scrollTop < 50 && hasMore && !isLoadingMore) {
            previousScrollHeightRef.current = container.scrollHeight;
            onLoadMore?.();
        }
    };

    // Reset initial scroll when room changes (if component doesn't unmount)
    useEffect(() => {
        hasInitialScrolled.current = false;
    }, [allMembers]); // allMembers changes when room changes/loads

    // Chat Handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await uploadRoomFile(roomId, file, "Shared via chat");
        } catch (error) {
            console.error("Failed to upload file", error);
            // alert("Failed to upload file"); // Keep UI clean
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage, replyingTo?.id);
            setNewMessage("");
            setReplyingTo(null);
            onSendTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        onSendTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => onSendTyping(false), 2000);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };


    const handleDeleteClick = (id: string) => {
        if (window.confirm("Are you sure you want to delete this message?")) {
            onDeleteMessage(id);
        }
    };

    // User Menu Handlers
    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>, userObj: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedUser(userObj);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
        setSelectedUser(null);
    };

    const handleKickClick = () => {
        if (selectedUser && window.confirm(`Kick ${selectedUser.username}?`)) {
            onKickUser(selectedUser.id);
        }
        handleUserMenuClose();
    };

    const handlePromoteClick = (role: string) => {
        if (selectedUser) onPromoteUser(selectedUser.id, role);
        handleUserMenuClose();
    };

    const handleMuteClick = () => {
        if (selectedUser) {
            const duration = prompt('Mute duration in minutes:', '10');
            if (duration) onMuteUser(selectedUser.id, parseInt(duration));
        }
        handleUserMenuClose();
    };

    const currentUserRole = user?.role;

    // Role check for file permissions
    const canUploadFile = useMemo(() => {
        // Any member can upload
        return true;
    }, []);

    const canDeleteFile = (file: RoomFile) => {
        // Uploader, owner, or admin/mod can delete
        if (file.uploaded_by === user?.id) return true;
        if (currentUserRole === 'admin' || currentUserRole === 'moderator') return true;
        // Check if owner (need room details passed down or inferred)
        // For now assume admin/mod is enough along with uploader
        return false;
    };

    return (
        <Box
            sx={{
                width: 400,
                borderLeft: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                bgcolor: 'background.paper'
            }}
        >
            {/* Tabs Header */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Box display="flex">
                    <Button
                        fullWidth
                        variant={activeTab === 'chat' ? 'contained' : 'text'}
                        onClick={() => setActiveTab('chat')}
                        sx={{ borderRadius: 0, py: 1.5 }}
                        startIcon={<MessageSquare size={18} />}
                    >
                        Chat
                    </Button>
                    <Button
                        fullWidth
                        variant={activeTab === 'users' ? 'contained' : 'text'}
                        onClick={() => setActiveTab('users')}
                        sx={{ borderRadius: 0, py: 1.5 }}
                        startIcon={<Users size={18} />}
                    >
                        Users
                        <Chip
                            label={users.length}
                            size="small"
                            color={activeTab === 'users' ? 'default' : 'primary'}
                            sx={{ ml: 1, height: 20, minWidth: 20, px: 0.5 }}
                        />
                    </Button>
                    <Button
                        fullWidth
                        variant={activeTab === 'files' ? 'contained' : 'text'}
                        onClick={() => setActiveTab('files')}
                        sx={{ borderRadius: 0, py: 1.5 }}
                        startIcon={<FileText size={18} />}
                    >
                        Files
                    </Button>
                </Box>
            </Box>

            {/* Content Content (Chat, Users, or Files) */}
            <Box ref={chatContainerRef} onScroll={handleScroll} flexGrow={1} overflow="auto" p={2} display="flex" flexDirection="column">
                {activeTab === 'chat' ? (
                    <>
                        {!isConnected && (
                            <Alert severity="warning" sx={{ mb: 2 }}>Connecting...</Alert>
                        )}

                        {isLoadingMore && (
                            <Box display="flex" justifyContent="center" p={1} width="100%">
                                <CircularProgress size={24} />
                            </Box>
                        )}

                        {isLoading ? (
                            <Box flexGrow={1} display="flex" flexDirection="column" gap={2} p={1}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <Box key={i} display="flex" flexDirection="column" alignItems={i % 2 === 0 ? 'flex-end' : 'flex-start'}>
                                        <Box display="flex" flexDirection={i % 2 === 0 ? 'row-reverse' : 'row'} gap={1} width="100%">
                                            <Skeleton variant="circular" width={32} height={32} />
                                            <Skeleton variant="rounded" width="70%" height={60} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Box flexGrow={1} display="flex" flexDirection="column" gap={1}>
                                {messages.map((msg, index) => {
                                    const prevMsg = index > 0 ? messages[index - 1] : undefined;
                                    const showDateHeader = isNewDay(msg.created_at, prevMsg?.created_at);
                                    const dateHeader = getMessageDateHeader(msg.created_at);

                                    if (msg.message_type === 'join' || msg.message_type === 'leave' || msg.message_type === 'system') {
                                        return (
                                            <Box key={msg.id || Math.random()}>
                                                {showDateHeader && (
                                                    <Box display="flex" justifyContent="center" my={2}>
                                                        <Chip
                                                            label={dateHeader}
                                                            size="small"
                                                            sx={{
                                                                opacity: 0.8,
                                                                bgcolor: 'action.selected',
                                                                fontWeight: 500,
                                                                height: 24,
                                                                fontSize: '0.75rem'
                                                            }}
                                                        />
                                                    </Box>
                                                )}
                                                <Box display="flex" justifyContent="center" my={1} sx={{ opacity: 0.7 }}>
                                                    <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                                        {msg.message}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    }

                                    const isOwnMessage = user?.username === msg.username;
                                    const isEditing = editingMessageId === msg.id;

                                    return (
                                        <MessageItem
                                            key={msg.id || Math.random()}
                                            message={msg}
                                            user={user}
                                            isOwnMessage={isOwnMessage}
                                            showDateHeader={showDateHeader}
                                            dateHeader={dateHeader}
                                            isEditing={isEditing}
                                            onEdit={(id) => setEditingMessageId(id)}
                                            onDelete={handleDeleteClick}
                                            onReply={(message) => setReplyingTo(message)}
                                            onSaveEdit={(id, content) => {
                                                onEditMessage(id, content);
                                                setEditingMessageId(null);
                                            }}
                                            onCancelEdit={() => setEditingMessageId(null)}
                                            onAddReaction={onAddReaction}
                                            onRemoveReaction={onRemoveReaction}
                                        />
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </Box>
                        )}
                    </>
                ) : activeTab === 'users' ? (
                    <>
                        <List>
                            {displayUsers.map((u) => (
                                <ListItem
                                    key={u.id}
                                    secondaryAction={
                                        user?.username !== u.username && (
                                            <IconButton edge="end" onClick={(e) => handleUserMenuOpen(e, u)}>
                                                <MoreVertical size={18} />
                                            </IconButton>
                                        )
                                    }
                                >
                                    <ListItemAvatar>
                                        <Badge
                                            overlap="circular"
                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                            variant="dot"
                                            color="success"
                                            invisible={!u.isOnline}
                                        >
                                            <Avatar>{u.username?.charAt(0).toUpperCase()}</Avatar>
                                        </Badge>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {u.username}
                                                {u.role && u.role !== 'member' && (
                                                    <Chip label={u.role} size="small" color={u.role === 'admin' ? 'error' : 'warning'} sx={{ height: 20, fontSize: '0.7rem' }} />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <Typography variant="caption" color={u.isOnline ? "success.main" : "text.secondary"}>
                                                {user?.username === u.username ? "You" : (u.isOnline ? "Online" : "Offline")}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>

                        {/* User Management Menu */}
                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleUserMenuClose}>
                            <MenuItem onClick={() => handlePromoteClick('member')}><Users size={16} style={{ marginRight: 8 }} /> Make Member</MenuItem>
                            <MenuItem onClick={() => handlePromoteClick('moderator')}><Shield size={16} style={{ marginRight: 8 }} /> Make Moderator</MenuItem>
                            <MenuItem onClick={() => handlePromoteClick('admin')}><Shield size={16} style={{ marginRight: 8, color: '#f44336' }} /> Make Admin</MenuItem>
                            <Divider />
                            <MenuItem onClick={handleMuteClick}><Volume2 size={16} style={{ marginRight: 8 }} /> Mute User</MenuItem>
                            <MenuItem onClick={handleKickClick} sx={{ color: 'error.main' }}><UserX size={16} style={{ marginRight: 8 }} /> Kick User</MenuItem>
                        </Menu>
                    </>
                ) : (
                    <FileList
                        roomId={roomId}
                        files={files}
                        canUpload={canUploadFile}
                        canDelete={canDeleteFile}
                    />
                )}
            </Box>

            {/* Chat Input */}
            {activeTab === 'chat' && (
                <Box p={2} borderTop={1} borderColor="divider">
                    {typingUsers.size > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 1 }}>
                            {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </Typography>
                    )}

                    {/* Reply Preview */}
                    {replyingTo && (
                        <Box
                            sx={{
                                mb: 1,
                                p: 1,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                borderLeft: 3,
                                borderColor: 'primary.main',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'start'
                            }}
                        >
                            <Box flex={1}>
                                <Typography variant="caption" color="primary" fontWeight="bold">
                                    Replying to {replyingTo.username}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {replyingTo.message}
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={handleCancelReply} sx={{ ml: 1 }}>
                                <Trash2 size={14} />
                            </IconButton>
                        </Box>
                    )}

                    <form onSubmit={handleSendMessage}>
                        <Box display="flex" gap={1} alignItems="center">
                            <IconButton
                                size="small"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!isConnected}
                                sx={{ color: 'text.secondary' }}
                            >
                                <Paperclip size={20} />
                            </IconButton>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={handleMessageChange}
                                disabled={!isConnected}
                            />
                            <Button type="submit" variant="contained" disabled={!isConnected || !newMessage.trim()} sx={{ minWidth: 'auto' }}>
                                Send
                            </Button>
                        </Box>
                    </form>
                </Box>
            )}
        </Box>
    );
}
