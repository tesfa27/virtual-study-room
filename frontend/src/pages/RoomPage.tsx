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
    TextField
} from "@mui/material";
import {
    MessageSquare,
    Users,
    Clock,
    LogOut,
    Menu,
    Calendar,
    Settings
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
    const { messages, sendMessage, isConnected } = useWebSocket(id || "");
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage("");
        }
    };

    const handleLeaveRoom = () => {
        // In the future: WebSocket disconnect + Cleanup
        navigate('/');
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
                            {messages.map((msg, idx) => (
                                <Box key={idx} sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                        {msg.username}
                                    </Typography>
                                    <Typography variant="body2">{msg.message}</Typography>
                                </Box>
                            ))}
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
                    <List>
                        {/* Placeholder for User List */}
                        <ListItem>
                            <Avatar sx={{ mr: 2 }}>{user?.username?.charAt(0).toUpperCase()}</Avatar>
                            <ListItemText primary={user?.username} secondary="You" />
                        </ListItem>
                        <Divider component="li" />
                        <Typography variant="caption" sx={{ p: 2, display: 'block' }} color="text.secondary">
                            Real-time user list coming soon
                        </Typography>
                    </List>
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
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={!isConnected}
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

            {/* Sidebar (Desktop: Persistent, Mobile: Temporary) */}
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
        </Box>
    );
}

// Helper component import was missing in previous steps, adding simplified Chip alias here if needed or importing from MUI
import { Chip } from "@mui/material";
