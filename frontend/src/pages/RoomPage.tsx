import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoom } from "../hooks/use-rooms";
import { useAuth } from "../hooks/use-auth";
import { useWebSocket } from "../hooks/use-websocket";
import {
    Box,
    Typography,
    Drawer,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
    AppBar,
    Toolbar,
    Paper,
    Button,
    Container,
    Avatar,
    CircularProgress,
    Alert,
    TextField,
    Chip,
    Tooltip,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@mui/material";
import {
    MessageSquare,
    Users,
    Clock,
    LogOut,
    Menu as MenuIcon,
    Calendar,
    Settings,
    Edit2,
    Trash2,
    Eye,
    MoreVertical,
    UserX,
    Shield,
    Volume2
} from "lucide-react";

export default function RoomPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Fetch room details using REST API
    const { data: room, isLoading, isError } = useRoom(id || "");

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');

    // WebSocket Integration - moved to top level
    // Only connect if we have an ID. The hook handles safe disconnection if ID changes/is empty.
    const {
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
        isConnected
    } = useWebSocket(id || "");
    const [newMessage, setNewMessage] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showJoinDialog, setShowJoinDialog] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Check if user needs to join the room
    useEffect(() => {
        const checkMembership = async () => {
            if (!id || !user || hasJoined) return;

            try {
                // Check if user is already a member by trying to fetch messages
                // If they can fetch, they're likely a member
                const response = await fetch(`http://localhost:8000/api/rooms/${id}/messages/`, {
                    credentials: 'include',
                });

                if (response.status === 403) {
                    // Not a member, show join dialog
                    setShowJoinDialog(true);
                } else if (response.ok) {
                    // Already a member
                    setHasJoined(true);
                } else {
                    // unexpected error (e.g. 500)
                    console.error("Membership check failed", response.status);
                    // Safer to assume not joined and ask? Or show error?
                    // Let's safe-fail to asking join, which might fail again but at least shows intention
                    setShowJoinDialog(true);
                }
            } catch (error) {
                console.error('Error checking membership:', error);
                // Network error - probably can't join anyway
            }
        };

        checkMembership();
    }, [id, user, hasJoined]);

    const handleJoinRoom = async () => {
        if (!id) return;

        try {
            const response = await fetch(`http://localhost:8000/api/rooms/${id}/join/`, {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                setHasJoined(true);
                setShowJoinDialog(false);
                window.location.reload(); // Reload to fetch messages and establish clean connection
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to join room');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room');
        }
    };

    const handleDeclineJoin = () => {
        navigate('/');
    };

    useEffect(() => {
        scrollToBottom();

        // Mark latest message as seen
        if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            // Don't mark own messages as seen
            if (latestMessage.username !== user?.username && latestMessage.id) {
                markSeen(latestMessage.id);
            }
        }
    }, [messages, markSeen, user?.username]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage("");
            // Stop typing indicator when message is sent
            sendTyping(false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        // Send typing indicator
        sendTyping(true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            sendTyping(false);
        }, 2000);
    };

    const handleStartEdit = (messageId: string, currentContent: string) => {
        setEditingMessageId(messageId);
        setEditContent(currentContent);
    };

    const handleSaveEdit = () => {
        if (editingMessageId && editContent.trim()) {
            editMessage(editingMessageId, editContent);
            setEditingMessageId(null);
            setEditContent("");
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent("");
    };

    const handleDeleteMessage = (messageId: string) => {
        if (window.confirm("Are you sure you want to delete this message?")) {
            deleteMessage(messageId);
        }
    };

    const handleLeaveRoom = () => {
        // In the future: WebSocket disconnect + Cleanup
        navigate('/');
    };

    // Group Management Handlers
    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>, userObj: any) => {
        setAnchorEl(event.currentTarget);
        setSelectedUser(userObj);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
        setSelectedUser(null);
    };

    const handleKickUser = () => {
        if (selectedUser && window.confirm(`Kick ${selectedUser.username}?`)) {
            kickUser(selectedUser.id);
        }
        handleUserMenuClose();
    };

    const handlePromoteUser = (role: string) => {
        if (selectedUser) {
            promoteUser(selectedUser.id, role);
        }
        handleUserMenuClose();
    };

    const handleMuteUser = () => {
        if (selectedUser) {
            const duration = prompt('Mute duration in minutes:', '10');
            if (duration) {
                muteUser(selectedUser.id, parseInt(duration));
            }
        }
        handleUserMenuClose();
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !room) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">
                    Room not found or failed to load. <Button onClick={() => navigate('/')}>Return Home</Button>
                </Alert>
            </Container>
        );
    }



    // Sidebar Content (Chat or Users)
    const sidebarContent = (
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%' }}>
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

            <Box flexGrow={1} overflow="auto" p={2} display="flex" flexDirection="column">
                {activeTab === 'chat' ? (
                    <>
                        {!isConnected && (
                            <Alert severity="warning" sx={{ mb: 2 }}>Connecting...</Alert>
                        )}
                        <Box flexGrow={1} display="flex" flexDirection="column" gap={1}>
                            {messages.map((msg) => {
                                const isOwnMessage = user?.username === msg.username;
                                const isEditing = editingMessageId === msg.id;

                                return (
                                    <Box
                                        key={msg.id || Math.random()}
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
                                                            <Button size="small" variant="contained" onClick={handleSaveEdit}>
                                                                Save
                                                            </Button>
                                                            <Button size="small" variant="outlined" onClick={handleCancelEdit}>
                                                                Cancel
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                        {msg.message}
                                                    </Typography>
                                                )}
                                            </Box>

                                            {isOwnMessage && !isEditing && (
                                                <Box display="flex" flexDirection="column" alignItems="flex-end">
                                                    <Box display="flex" gap={0.5}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleStartEdit(msg.id!, msg.message)}
                                                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                                                        >
                                                            <Edit2 size={14} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteMessage(msg.id!)}
                                                            sx={{ opacity: 0.7, '&:hover': { opacity: 1, color: 'error.main' } }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </IconButton>
                                                    </Box>
                                                    {/* Seen Indicator */}
                                                    {msg.seen_by && msg.seen_by.length > 0 && (
                                                        <Tooltip title={`Seen by ${msg.seen_by.length} users`}>
                                                            <Box display="flex" alignItems="center" mt={0.5} sx={{ opacity: 0.6 }}>
                                                                <Eye size={14} />
                                                                <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                                    {msg.seen_by.length}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            )}
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
                            {messages.length === 0 && isConnected && (
                                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="50%" opacity={0.5}>
                                    <MessageSquare size={32} />
                                    <Typography variant="caption">No messages yet</Typography>
                                </Box>
                            )}
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
                                            <IconButton
                                                edge="end"
                                                onClick={(e) => handleUserMenuOpen(e, u)}
                                            >
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
                                                    <Chip
                                                        label={u.role}
                                                        size="small"
                                                        color={u.role === 'admin' ? 'error' : 'warning'}
                                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={user?.username === u.username ? "You" : "Online"}
                                    />
                                </ListItem>
                            ))}
                            {users.length === 0 && (
                                <Typography variant="caption" sx={{ p: 2, display: 'block' }} color="text.secondary">
                                    No users online (Connecting...)
                                </Typography>
                            )}
                        </List>

                        {/* User Management Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleUserMenuClose}
                        >
                            <MenuItem onClick={() => handlePromoteUser('member')}>
                                <Users size={16} style={{ marginRight: 8 }} />
                                Make Member
                            </MenuItem>
                            <MenuItem onClick={() => handlePromoteUser('moderator')}>
                                <Shield size={16} style={{ marginRight: 8 }} />
                                Make Moderator
                            </MenuItem>
                            <MenuItem onClick={() => handlePromoteUser('admin')}>
                                <Shield size={16} style={{ marginRight: 8, color: '#f44336' }} />
                                Make Admin
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={handleMuteUser}>
                                <Volume2 size={16} style={{ marginRight: 8 }} />
                                Mute User
                            </MenuItem>
                            <MenuItem onClick={handleKickUser} sx={{ color: 'error.main' }}>
                                <UserX size={16} style={{ marginRight: 8 }} />
                                Kick User
                            </MenuItem>
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
                                disabled={!isConnected || !hasJoined}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={!isConnected || !newMessage.trim()}
                                sx={{ minWidth: 'auto' }}
                            >
                                Send
                            </Button>
                        </Box>
                    </form>
                </Box>
            )}
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Main Application Bar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <Menu />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        {room.name}
                    </Typography>

                    {/* Room Controls Header */}
                    <Box display="flex" alignItems="center" gap={2}>
                        <Chip label={room.topic || "General"} size="small" color="secondary" />
                        {unreadCount > 0 && (
                            <Chip
                                label={`${unreadCount} unread`}
                                size="small"
                                color="error"
                                sx={{ fontWeight: 'bold' }}
                            />
                        )}
                        <Button
                            color="inherit"
                            startIcon={<LogOut size={18} />}
                            onClick={handleLeaveRoom}
                        >
                            Leave
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Stage (Timer & Content) */}
            {hasJoined && (
                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, height: '100%', overflow: 'auto', bgcolor: 'background.default' }}>
                    <Container maxWidth="md">
                        <Box display="flex" flexDirection="column" gap={4} alignItems="center" mt={4}>

                            {/* Timer Placeholder */}
                            <Paper
                                elevation={3}
                                sx={{
                                    width: '100%',
                                    p: 6,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    borderRadius: 4,
                                    background: 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
                                }}
                            >
                                <Clock size={64} className="mb-4 text-blue-400" />
                                <Typography variant="h2" fontWeight="bold" sx={{ fontFamily: 'monospace', my: 2 }}>
                                    25:00
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                                    Focus Session (Waiting to start...)
                                </Typography>
                                <Box display="flex" gap={2} mt={2}>
                                    <Button variant="contained" color="success" size="large">Start</Button>
                                    <Button variant="outlined" color="error" size="large">Reset</Button>
                                </Box>
                            </Paper>

                            {/* Room Info */}
                            <Paper sx={{ width: '100%', p: 3 }}>
                                <Typography variant="h6" gutterBottom>Room Description</Typography>
                                <Typography variant="body1" color="text.secondary">
                                    {room.description || "No description provided."}
                                </Typography>

                                <Box mt={2}>
                                    <Typography variant="caption" display="block">
                                        Owner: {room.owner_username}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        Capacity: {room.capacity}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Box>
                    </Container>
                </Box>
            )}

            {/* Sidebar (Desktop: Persistent, Mobile: Temporary) */}
            {hasJoined && (
                <>
                    <Drawer
                        variant="persistent"
                        anchor="right"
                        open={isSidebarOpen}
                        sx={{
                            width: 320,
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: 320,
                                boxSizing: 'border-box',
                                mt: 8, // Offset for AppBar
                                height: 'calc(100% - 64px)'
                            },
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        {sidebarContent}
                    </Drawer>
                    {/* Mobile Sidebar */}
                    <Drawer
                        variant="temporary"
                        anchor="right"
                        open={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        sx={{
                            display: { xs: 'block', sm: 'none' },
                            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 320 },
                        }}
                    >
                        {sidebarContent}
                    </Drawer>
                </>
            )}

            {/* Join Room Confirmation Dialog */}
            <Dialog open={showJoinDialog} onClose={handleDeclineJoin}>
                <DialogTitle>Join Room?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Would you like to join "{room?.name}"? You'll be able to chat with other members and participate in study sessions.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeclineJoin} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleJoinRoom} variant="contained" color="primary">
                        Join Room
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}


