import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRoomMembers } from "../api/rooms";
import {
    Box,
    Drawer,
    CircularProgress,
    Container,
    Alert,
    Button
} from "@mui/material";

// Hooks
import { useRoom } from "../hooks/use-rooms";
import { useAuth } from "../hooks/use-auth";
import { useWebSocket } from "../hooks/use-websocket";
import { useRoomMembership } from "../hooks/use-room-membership";

// Components
import RoomHeader from "../components/room/RoomHeader";
import RoomStage from "../components/room/RoomStage";
import ChatSidebar from "../components/room/ChatSidebar";
import JoinRoomDialog from "../components/room/JoinRoomDialog";

export default function RoomPage() {
    const { id = "" } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // 1. Fetch Room Details
    const { data: room, isLoading: isRoomLoading, isError } = useRoom(id);

    // 2. Manage Room Membership
    const {
        hasJoined,
        showJoinDialog,
        handleJoin,
        handleDeclineJoin,
        handleLeave
    } = useRoomMembership(id, user);

    // 3. WebSocket Connection
    // Note: We pass the ID. The hook handles connection logic internally.
    const ws = useWebSocket(id);

    // 4. UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');

    const { data: members = [] } = useQuery({
        queryKey: ['room', id, 'members'],
        queryFn: () => getRoomMembers(id),
        enabled: !!id
    });

    // Loading State
    if (isRoomLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // Error State
    if (isError || !room) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">
                    Room not found or failed to load.
                    <Button onClick={() => navigate('/')} sx={{ ml: 2 }}>Return Home</Button>
                </Alert>
            </Container>
        );
    }

    const drawerContent = (
        <ChatSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            messages={ws.messages}
            users={ws.users}
            allMembers={members}
            typingUsers={ws.typingUsers}
            isConnected={ws.isConnected}
            user={user}
            // Actions
            onSendMessage={ws.sendMessage}
            onEditMessage={ws.editMessage}
            onDeleteMessage={ws.deleteMessage}
            onSendTyping={ws.sendTyping}
            onMarkSeen={ws.markSeen}
            onKickUser={ws.kickUser}
            onPromoteUser={ws.promoteUser}
            onMuteUser={ws.muteUser}
            onAddReaction={ws.addReaction}
            onRemoveReaction={ws.removeReaction}
            // Pagination
            onLoadMore={ws.loadMoreMessages}
            hasMore={ws.hasMore}
            isLoadingMore={ws.isLoadingMore}
            isLoading={ws.isLoading}
        />
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

            {/* Header */}
            <RoomHeader
                room={room}
                unreadCount={ws.unreadCount}
                onLeave={handleLeave}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Main Stage (Content) - Gated by Join Status */}
            {hasJoined && (
                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, height: '100%', overflow: 'auto', bgcolor: 'background.default' }}>
                    <RoomStage room={room} />
                </Box>
            )}

            {/* Sidebar Drawers - Gated by Join Status */}
            {hasJoined && (
                <>
                    {/* Desktop Sidebar */}
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
                                mt: 8,
                                height: 'calc(100% - 64px)'
                            },
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        {drawerContent}
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
                        {drawerContent}
                    </Drawer>
                </>
            )}

            {/* Join Dialog */}
            <JoinRoomDialog
                open={showJoinDialog}
                roomName={room.name}
                onConfirm={handleJoin}
                onCancel={handleDeclineJoin}
            />
        </Box>
    );
}
