import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Chip,
    Box,
    Grid
} from "@mui/material";
import { Users, Lock, Unlock } from "lucide-react";
import type { Room } from "../../api/rooms";

interface RoomListProps {
    rooms: Room[];
}

export default function RoomList({ rooms }: RoomListProps) {
    const navigate = useNavigate();

    return (
        <Grid container spacing={3}>
            {rooms.map((room) => (
                <Grid item xs={12} sm={6} md={4} key={room.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Typography variant="h6" component="div" gutterBottom>
                                    {room.name}
                                </Typography>
                                {room.is_private ? (
                                    <Lock size={16} color="#757575" />
                                ) : (
                                    <Unlock size={16} color="#757575" />
                                )}
                            </Box>

                            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                                {room.topic && <Chip label={room.topic} size="small" color="primary" variant="outlined" />}
                                <Chip
                                    icon={<Users size={14} />}
                                    label={`${room.active_members_count}/${room.capacity}`}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                            }}>
                                {room.description || "No description provided."}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button
                                size="small"
                                variant="contained"
                                fullWidth
                                onClick={() => navigate(`/room/${room.id}`)}
                            >
                                Join Room
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}
