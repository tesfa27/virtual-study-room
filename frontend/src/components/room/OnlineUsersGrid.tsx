import { Box, Avatar, Typography, Paper, Tooltip, Chip } from '@mui/material';
import { Video, VideoOff } from 'lucide-react';
import type { OnlineUser } from '../../hooks/use-websocket';

interface OnlineUsersGridProps {
    users: OnlineUser[];
    currentUserId?: string;
}

export default function OnlineUsersGrid({ users, currentUserId }: OnlineUsersGridProps) {
    if (users.length === 0) {
        return (
            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 2
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    No one else is here yet. Invite others to study together!
                </Typography>
            </Paper>
        );
    }

    const getRoleColor = (role?: string) => {
        switch (role) {
            case 'admin': return 'error';
            case 'moderator': return 'warning';
            default: return 'default';
        }
    };

    const getInitials = (username: string) => {
        return username.slice(0, 2).toUpperCase();
    };

    const getAvatarColor = (username: string) => {
        // Generate consistent color based on username
        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7',
            '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
            '#009688', '#4caf50', '#8bc34a', '#cddc39',
            '#ffc107', '#ff9800', '#ff5722', '#795548'
        ];
        const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                    Study Together
                </Typography>
                <Chip
                    label={`${users.length} online`}
                    size="small"
                    color="success"
                    variant="outlined"
                />
            </Box>

            {/* Users Grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 2
                }}
            >
                {users.map((user) => (
                    <Tooltip
                        key={user.id}
                        title={`${user.username}${user.role && user.role !== 'member' ? ` (${user.role})` : ''}`}
                        arrow
                    >
                        <Paper
                            elevation={user.id === currentUserId ? 4 : 1}
                            sx={{
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1,
                                background: user.id === currentUserId
                                    ? 'linear-gradient(145deg, rgba(76,175,80,0.2), rgba(76,175,80,0.05))'
                                    : 'rgba(255,255,255,0.03)',
                                border: user.id === currentUserId ? '2px solid' : '1px solid',
                                borderColor: user.id === currentUserId ? 'success.main' : 'rgba(255,255,255,0.1)',
                                borderRadius: 2,
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 3
                                },
                                position: 'relative',
                                minHeight: 140
                            }}
                        >
                            {/* Video placeholder - Avatar for now */}
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: getAvatarColor(user.username),
                                    position: 'relative'
                                }}
                            >
                                <Typography
                                    variant="h4"
                                    sx={{
                                        color: 'white',
                                        fontWeight: 600
                                    }}
                                >
                                    {getInitials(user.username)}
                                </Typography>

                                {/* Video indicator - placeholder for future */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 4,
                                        right: 4,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        borderRadius: 1,
                                        p: 0.5,
                                        display: 'flex'
                                    }}
                                >
                                    <VideoOff size={12} color="#999" />
                                </Box>
                            </Box>

                            {/* Username */}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 500,
                                    textAlign: 'center',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {user.id === currentUserId ? 'You' : user.username}
                            </Typography>

                            {/* Role badge */}
                            {user.role && user.role !== 'member' && (
                                <Chip
                                    label={user.role}
                                    size="small"
                                    color={getRoleColor(user.role) as any}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.65rem',
                                        position: 'absolute',
                                        top: 8,
                                        right: 8
                                    }}
                                />
                            )}

                            {/* Online indicator */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: 8,
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: 'success.main',
                                    boxShadow: '0 0 8px rgba(76,175,80,0.6)'
                                }}
                            />
                        </Paper>
                    </Tooltip>
                ))}
            </Box>
        </Box>
    );
}
