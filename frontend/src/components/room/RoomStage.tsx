import {
    Box,
    Typography,
    Paper,
    Button,
    Container
} from "@mui/material";
import { Clock } from "lucide-react";
import type { Room } from "../../api/rooms";

interface RoomStageProps {
    room: Room;
}

export default function RoomStage({ room }: RoomStageProps) {
    return (
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
    );
}
