import { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Button, Paper, Chip, Tooltip } from '@mui/material';
import { Play, Pause, RotateCcw, Coffee, Brain, Sunrise } from 'lucide-react';
import { type PomodoroSession, updatePomodoroSession } from '../../api/rooms';

interface PomodoroTimerProps {
    roomId: string;
    session: PomodoroSession | null;
    canControl?: boolean; // true if user is owner/admin/moderator
}

export default function PomodoroTimer({ roomId, session, canControl = false }: PomodoroTimerProps) {
    const [displayTime, setDisplayTime] = useState(0);

    useEffect(() => {
        if (!session) return;

        // Capture time when we received this session state
        const receivedAt = Date.now();
        const baseRemaining = session.remaining;

        const updateTimer = () => {
            if (session.is_running) {
                const elapsed = (Date.now() - receivedAt) / 1000;
                setDisplayTime(Math.max(0, baseRemaining - elapsed));
            } else {
                setDisplayTime(baseRemaining);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [session]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAction = async (action: string, payload?: any) => {
        try {
            await updatePomodoroSession(roomId, action, payload);
        } catch (error) {
            console.error("Pomodoro action failed", error);
        }
    };

    if (!session) return null;

    const getPhaseLabel = (phase: string) => {
        switch (phase) {
            case 'work': return 'Focus Time';
            case 'short_break': return 'Short Break';
            case 'long_break': return 'Long Break';
            default: return phase;
        }
    };

    const getPhaseColor = (phase: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (phase) {
            case 'work': return 'error';
            case 'short_break': return 'success';
            case 'long_break': return 'info';
            default: return 'default';
        }
    };

    const getPhaseIcon = (phase: string) => {
        switch (phase) {
            case 'work': return <Brain size={16} />;
            case 'short_break': return <Coffee size={16} />;
            case 'long_break': return <Sunrise size={16} />;
            default: return null;
        }
    };

    return (
        <Paper
            elevation={4}
            sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(145deg, rgba(30,30,30,0.9), rgba(45,45,45,0.9))',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.1)'
            }}
        >
            {/* Phase indicator */}
            <Box display="flex" justifyContent="center" mb={2}>
                <Chip
                    icon={getPhaseIcon(session.phase)}
                    label={getPhaseLabel(session.phase)}
                    color={getPhaseColor(session.phase)}
                    sx={{ fontWeight: 600 }}
                />
            </Box>

            {/* Timer display */}
            <Typography
                variant="h2"
                component="div"
                sx={{
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    fontSize: { xs: '3rem', sm: '4rem' },
                    letterSpacing: 4,
                    my: 2,
                    textShadow: session.is_running ? '0 0 20px rgba(255,255,255,0.3)' : 'none'
                }}
            >
                {formatTime(displayTime)}
            </Typography>

            {/* Control buttons - Only for admins */}
            {canControl ? (
                <>
                    <Box display="flex" justifyContent="center" gap={2} mb={2}>
                        {!session.is_running ? (
                            <Button
                                variant="contained"
                                color="success"
                                size="large"
                                startIcon={<Play size={20} />}
                                onClick={() => handleAction('start')}
                                sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                            >
                                Start Focus
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="warning"
                                size="large"
                                startIcon={<Pause size={20} />}
                                onClick={() => handleAction('pause')}
                                sx={{ px: 4, py: 1.5, borderRadius: 2 }}
                            >
                                Pause
                            </Button>
                        )}
                        <Tooltip title="Reset Timer">
                            <IconButton
                                onClick={() => handleAction('reset')}
                                sx={{
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                }}
                            >
                                <RotateCcw size={20} />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Phase switchers */}
                    <Box display="flex" justifyContent="center" gap={1}>
                        <Tooltip title="Focus (25 min)">
                            <IconButton
                                size="small"
                                onClick={() => handleAction('set_phase', { phase: 'work' })}
                                sx={{
                                    bgcolor: session.phase === 'work' ? 'error.main' : 'transparent',
                                    border: '2px solid',
                                    borderColor: 'error.main',
                                    '&:hover': { bgcolor: 'error.dark' }
                                }}
                            >
                                <Brain size={16} color={session.phase === 'work' ? 'white' : undefined} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Short Break (5 min)">
                            <IconButton
                                size="small"
                                onClick={() => handleAction('set_phase', { phase: 'short_break' })}
                                sx={{
                                    bgcolor: session.phase === 'short_break' ? 'success.main' : 'transparent',
                                    border: '2px solid',
                                    borderColor: 'success.main',
                                    '&:hover': { bgcolor: 'success.dark' }
                                }}
                            >
                                <Coffee size={16} color={session.phase === 'short_break' ? 'white' : undefined} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Long Break (15 min)">
                            <IconButton
                                size="small"
                                onClick={() => handleAction('set_phase', { phase: 'long_break' })}
                                sx={{
                                    bgcolor: session.phase === 'long_break' ? 'info.main' : 'transparent',
                                    border: '2px solid',
                                    borderColor: 'info.main',
                                    '&:hover': { bgcolor: 'info.dark' }
                                }}
                            >
                                <Sunrise size={16} color={session.phase === 'long_break' ? 'white' : undefined} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {session.is_running ? 'Focus session in progress...' : 'Waiting for admin to start...'}
                </Typography>
            )}
        </Paper>
    );
}
