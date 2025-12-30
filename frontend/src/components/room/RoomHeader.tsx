import React from "react";
import {
    Box,
    Typography,
    IconButton,
    AppBar,
    Toolbar,
    Button,
    Chip
} from "@mui/material";
import { Menu, LogOut } from "lucide-react";
import type { Room } from "../../api/rooms";

interface RoomHeaderProps {
    room: Room;
    unreadCount: number;
    onLeave: () => void;
    onToggleSidebar: () => void;
    callButton?: React.ReactNode;
}

export default function RoomHeader({ room, unreadCount, onLeave, onToggleSidebar, callButton }: RoomHeaderProps) {
    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={onToggleSidebar}
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

                    {/* Call Button */}
                    {callButton}

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
                        onClick={onLeave}
                    >
                        Leave
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

