import {
    Box,
    Typography,
    Paper,
    Chip
} from "@mui/material";
import { Users, Info } from "lucide-react";
import type { Room } from "../../api/rooms";

interface RoomStageProps {
    room: Room;
}

export default function RoomStage({ room }: RoomStageProps) {
    return (
        <Box>
            {/* Room Info Card - Compact */}
            {room.description && (
                <Paper
                    elevation={1}
                    sx={{
                        p: 2,
                        mb: 3,
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 2
                    }}
                >
                    <Box display="flex" alignItems="flex-start" gap={1.5}>
                        <Info size={18} style={{ marginTop: 2, opacity: 0.6 }} />
                        <Box flex={1}>
                            <Typography variant="body2" color="text.secondary">
                                {room.description}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Room Stats - Inline Chips */}
            <Box display="flex" gap={1} flexWrap="wrap">
                <Chip
                    icon={<Users size={14} />}
                    label={`${room.active_members_count} / ${room.capacity} members`}
                    size="small"
                    variant="outlined"
                />
                {room.topic && (
                    <Chip
                        label={room.topic}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                )}
            </Box>
        </Box>
    );
}
