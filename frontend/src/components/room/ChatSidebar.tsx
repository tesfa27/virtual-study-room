import { useState, useRef, useEffect } from "react";
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
    Alert
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
    Eye
} from "lucide-react";
import type { ChatMessage } from "../../api/rooms"; // Ensure correct import path
import type { OnlineUser } from "../../hooks/use-websocket";

interface ChatSidebarProps {
    activeTab: 'chat' | 'users';
    setActiveTab: (tab: 'chat' | 'users') => void;
    messages: ChatMessage[];
    users: OnlineUser[];
    typingUsers: Map<string, string>;
    isConnected: boolean;
    user: any; // Current User
    // Actions
    onSendMessage: (msg: string) => void;
    onEditMessage: (id: string, content: string) => void;
    onDeleteMessage: (id: string) => void;
    onSendTyping: (isTyping: boolean) => void;
    onMarkSeen: (id: string) => void;
    // Group Management
    onKickUser: (id: string) => void;
    onPromoteUser: (id: string, role: string) => void;
    onMuteUser: (id: string, duration: number) => void;
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
    // ... existing props ...
    activeTab,
    setActiveTab,
    messages,
    users,
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
    onMuteUser
}: ChatSidebarProps) {
    // ... (keep default function body start) ...
    const [newMessage, setNewMessage] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
        if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            if (latestMessage.username !== user?.username && latestMessage.id) {
                onMarkSeen(latestMessage.id);
            }
        }
    }, [messages, user?.username, onMarkSeen]);

    // Chat Handlers
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage("");
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

    const handleStartEdit = (messageId: string, currentContent: string) => {
        setEditingMessageId(messageId);
        setEditContent(currentContent);
    };

    const handleSaveEdit = () => {
        if (editingMessageId && editContent.trim()) {
            onEditMessage(editingMessageId, editContent);
            setEditingMessageId(null);
            setEditContent("");
        }
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

    return (
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs */}
            <Box p={2} borderBottom={1} borderColor="divider">
                <Box display="flex" justifyContent="space-around">
                    <Button
                        startIcon={<MessageSquare size={18} />}
                        variant={activeTab === 'chat' ? "contained" : "text"}
                        onClick={() => setActiveTab('chat')}
                        fullWidth
                    >
                        Chat
                    </Button>
                    <Button
                        startIcon={<Users size={18} />}
                        variant={activeTab === 'users' ? "contained" : "text"}
                        onClick={() => setActiveTab('users')}
                        fullWidth
                    >
                        People
                    </Button>
                </Box>
            </Box>

            {/* Content Content (Chat or Users) */}
            <Box flexGrow={1} overflow="auto" p={2} display="flex" flexDirection="column">
                {activeTab === 'chat' ? (
                    <>
                        {!isConnected && (
                            <Alert severity="warning" sx={{ mb: 2 }}>Connecting...</Alert>
                        )}
                        <Box flexGrow={1} display="flex" flexDirection="column" gap={1}>
                            {messages.map((msg, index) => {
                                const prevMsg = index > 0 ? messages[index - 1] : undefined;
                                const showDateHeader = isNewDay(msg.created_at, prevMsg?.created_at);

                                if (msg.message_type === 'join' || msg.message_type === 'leave' || msg.message_type === 'system') {
                                    return (
                                        <Box key={msg.id || Math.random()}>
                                            {showDateHeader && (
                                                <Box display="flex" justifyContent="center" my={2}>
                                                    <Chip
                                                        label={getMessageDateHeader(msg.created_at)}
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
                                    <Box key={msg.id || Math.random()}>
                                        {showDateHeader && (
                                            <Box display="flex" justifyContent="center" my={2}>
                                                <Chip
                                                    label={getMessageDateHeader(msg.created_at)}
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
                                        <Box
                                            sx={{
                                                bgcolor: isOwnMessage ? 'primary.dark' : 'action.hover',
                                                p: 1.5,
                                                borderRadius: 1,
                                                position: 'relative'
                                            }}
                                        >
                                            <Box display="flex" justifyContent="space-between" alignItems="start">
                                                <Box flex={1}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                        {msg.username}
                                                        {msg.is_edited && (
                                                            <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic', opacity: 0.7 }}>
                                                                (edited)
                                                            </Typography>
                                                        )}
                                                    </Typography>

                                                    {isEditing ? (
                                                        <Box mt={1}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                autoFocus
                                                                multiline
                                                                maxRows={4}
                                                            />
                                                            <Box display="flex" gap={1} mt={1}>
                                                                <Button size="small" variant="contained" onClick={handleSaveEdit}>Save</Button>
                                                                <Button size="small" variant="outlined" onClick={() => setEditingMessageId(null)}>Cancel</Button>
                                                            </Box>
                                                        </Box>
                                                    ) : (
                                                        <>
                                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                                {msg.message}
                                                            </Typography>
                                                            <Box display="flex" justifyContent="flex-end" mt={0.5}>
                                                                <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.7, color: 'text.secondary' }}>
                                                                    {formatMessageTime(msg.created_at)}
                                                                </Typography>
                                                            </Box>
                                                        </>
                                                    )}
                                                </Box>

                                                {isOwnMessage && !isEditing && (
                                                    <Box display="flex" flexDirection="column" alignItems="flex-end" ml={1}>
                                                        <Box display="flex" gap={0.5}>
                                                            <IconButton size="small" onClick={() => handleStartEdit(msg.id!, msg.message)} sx={{ opacity: 0.7, p: 0.5 }}>
                                                                <Edit2 size={12} />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleDeleteClick(msg.id!)} sx={{ opacity: 0.7, '&:hover': { color: 'error.main' }, p: 0.5 }}>
                                                                <Trash2 size={12} />
                                                            </IconButton>
                                                        </Box>
                                                        {msg.seen_by && msg.seen_by.length > 0 && (
                                                            <Tooltip title={`Seen by ${msg.seen_by.length} users`}>
                                                                <Box display="flex" alignItems="center" mt={0.5} sx={{ opacity: 0.6 }}>
                                                                    <Eye size={12} />
                                                                    <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>{msg.seen_by.length}</Typography>
                                                                </Box>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}

                            {/* Typing Indicator */}
                            {typingUsers.size > 0 && (
                                <Box sx={{ p: 1, fontStyle: 'italic', opacity: 0.7 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                                    </Typography>
                                </Box>
                            )}
                            <div ref={messagesEndRef} />
                        </Box>
                    </>
                ) : (
                    <>
                        <List>
                            {users.map((u) => (
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
                                    <Avatar sx={{ mr: 2 }}>{u.username?.charAt(0).toUpperCase()}</Avatar>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1}>
                                                {u.username}
                                                {u.role && u.role !== 'member' && (
                                                    <Chip label={u.role} size="small" color={u.role === 'admin' ? 'error' : 'warning'} sx={{ height: 20, fontSize: '0.7rem' }} />
                                                )}
                                            </Box>
                                        }
                                        secondary={user?.username === u.username ? "You" : "Online"}
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
                )}
            </Box>

            {/* Chat Input */}
            {activeTab === 'chat' && (
                <Box p={2} borderTop={1} borderColor="divider">
                    <form onSubmit={handleSendMessage}>
                        <Box display="flex" gap={1}>
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
