import React, { useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Avatar, Paper } from '@mui/material';
import {
    Video, VideoOff, Mic, MicOff, MonitorUp, PhoneOff,
    Users, Sparkles
} from 'lucide-react';
import type { RemoteStream } from '../../hooks/use-webrtc';

interface CallParticipant {
    odID: string;
    username: string;
    stream: MediaStream | null;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isLocal?: boolean;
}

interface StudyStreamGridProps {
    // Local user info
    localStream: MediaStream | null;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    username: string;
    userId: string;  // Current user ID to filter duplicates

    // Remote participants
    remoteStreams: RemoteStream[];

    // Controls
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
    onLeaveCall: () => void;

    // State
    isInCall: boolean;

    // Active participants (for preview when not in call)
    callParticipants?: { id: string, username: string }[];
}

// Video tile component for each participant
const ParticipantTile: React.FC<{
    participant: CallParticipant;
    isLarge?: boolean;
}> = ({ participant, isLarge }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Connect stream to video element whenever stream or video state changes
    useEffect(() => {
        const video = videoRef.current;
        if (video && participant.stream) {
            // Only update srcObject if it's different
            if (video.srcObject !== participant.stream) {
                video.srcObject = participant.stream;
                console.log(`[Video] ${participant.username} - Set new srcObject`);
            }

            const videoTracks = participant.stream.getVideoTracks();
            console.log(`[Video] ${participant.username} - Video tracks:`, videoTracks.length, 'Enabled:', videoTracks[0]?.enabled, 'ReadyState:', videoTracks[0]?.readyState);

            // Add event handlers for debugging
            video.onloadedmetadata = () => {
                console.log(`[Video] ${participant.username} - Metadata loaded, dimensions: ${video.videoWidth}x${video.videoHeight}`);
            };

            video.onplay = () => {
                console.log(`[Video] ${participant.username} - Started playing`);
            };

            video.onerror = (e) => {
                console.error(`[Video] ${participant.username} - Error:`, e);
            };

            // Only try to play if video has tracks and is paused
            if (videoTracks.length > 0 && video.paused) {
                video.play().catch(err => {
                    if (err.name !== 'AbortError') {
                        console.warn(`[Video] ${participant.username} - Play error:`, err);
                    }
                });
            }
        }
    }, [participant.stream, participant.isVideoEnabled, participant.username]);

    const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

    const getGradient = (name: string) => {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        ];
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
        return gradients[index];
    };

    const showVideo = participant.stream && participant.isVideoEnabled;

    // Debug log
    if (participant.stream) {
        console.log(`[Tile] ${participant.username} - isVideoEnabled: ${participant.isVideoEnabled}, showVideo: ${showVideo}`);
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'relative',
                aspectRatio: isLarge ? '16/9' : '4/3',
                borderRadius: 3,
                overflow: 'hidden',
                background: '#1a1a2e',
                border: participant.isLocal ? '2px solid rgba(102, 126, 234, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                },
            }}
        >
            {/* Video element - always rendered, visibility controlled by CSS */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={participant.isLocal}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: participant.isScreenSharing ? 'contain' : 'cover',
                    transform: participant.isLocal && !participant.isScreenSharing ? 'scaleX(-1)' : 'none',
                    display: showVideo ? 'block' : 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                }}
            />

            {/* Avatar fallback - shown when video is off */}
            {!showVideo && (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: getGradient(participant.username),
                    }}
                >
                    <Avatar
                        sx={{
                            width: isLarge ? 100 : 70,
                            height: isLarge ? 100 : 70,
                            fontSize: isLarge ? '2.5rem' : '1.8rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)',
                            border: '3px solid rgba(255,255,255,0.2)',
                        }}
                    >
                        {getInitials(participant.username)}
                    </Avatar>
                </Box>
            )}

            {/* Overlay gradient */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    pointerEvents: 'none',
                }}
            />

            {/* Name tag */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <Typography
                    variant="body2"
                    sx={{
                        color: 'white',
                        fontWeight: 600,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    }}
                >
                    {participant.isLocal ? 'You' : participant.username}
                </Typography>
                {participant.isLocal && (
                    <Box
                        sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: 'rgba(102, 126, 234, 0.8)',
                            fontSize: '0.65rem',
                            color: 'white',
                            fontWeight: 600,
                        }}
                    >
                        HOST
                    </Box>
                )}
            </Box>

            {/* Status indicators */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    display: 'flex',
                    gap: 0.5,
                }}
            >
                {!participant.isAudioEnabled && (
                    <Box
                        sx={{
                            p: 0.5,
                            borderRadius: '50%',
                            bgcolor: 'rgba(239, 68, 68, 0.9)',
                            display: 'flex',
                        }}
                    >
                        <MicOff size={14} color="white" />
                    </Box>
                )}
                {!participant.isVideoEnabled && (
                    <Box
                        sx={{
                            p: 0.5,
                            borderRadius: '50%',
                            bgcolor: 'rgba(107, 114, 128, 0.9)',
                            display: 'flex',
                        }}
                    >
                        <VideoOff size={14} color="white" />
                    </Box>
                )}
                {participant.isScreenSharing && (
                    <Box
                        sx={{
                            p: 0.5,
                            borderRadius: '50%',
                            bgcolor: 'rgba(59, 130, 246, 0.9)',
                            display: 'flex',
                        }}
                    >
                        <MonitorUp size={14} color="white" />
                    </Box>
                )}
            </Box>

            {/* Live indicator for video */}
            {showVideo && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(239, 68, 68, 0.9)',
                    }}
                >
                    <Box
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'white',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.5 },
                            },
                        }}
                    />
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.65rem' }}>
                        LIVE
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

// Main Grid Component
export const StudyStreamGrid: React.FC<StudyStreamGridProps> = ({
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    username,
    remoteStreams,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onLeaveCall,
    isInCall,
    callParticipants = [],
    userId,
}) => {
    // Build participants list
    const participants: CallParticipant[] = [];

    // Add local user if in call
    if (isInCall) {
        participants.push({
            odID: 'local',
            username,
            stream: localStream,
            isAudioEnabled,
            isVideoEnabled,
            isScreenSharing,
            isLocal: true,
        });
    }

    // Add remote participants (filter out current user to prevent duplicates)
    remoteStreams
        .filter(remote => remote.odID !== userId && remote.username !== username)
        .forEach((remote) => {
            participants.push({
                odID: remote.odID,
                username: remote.username,
                stream: remote.stream,
                isAudioEnabled: remote.isAudioEnabled,
                isVideoEnabled: remote.isVideoEnabled,
                isScreenSharing: remote.isScreenSharing,
                isLocal: false,
            });
        });

    // Calculate grid columns
    const getGridColumns = () => {
        const count = participants.length;
        if (count <= 1) return 1;
        if (count <= 2) return 2;
        if (count <= 4) return 2;
        if (count <= 6) return 3;
        return 4;
    };

    if (!isInCall) {
        return (
            <Paper
                elevation={4}
                sx={{
                    p: 6,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                {callParticipants.length > 0 ? (
                    <>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                gap: 2,
                                mb: 3,
                            }}
                        >
                            {callParticipants.map((p) => {
                                // Generate color based on username
                                const getGradient = (name: string) => {
                                    const gradients = [
                                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                    ];
                                    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
                                    return gradients[index];
                                };

                                return (
                                    <Tooltip key={p.id} title={p.username}>
                                        <Avatar
                                            sx={{
                                                width: 60,
                                                height: 60,
                                                background: getGradient(p.username),
                                                border: '2px solid rgba(255,255,255,0.2)',
                                                fontSize: '1.2rem',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {p.username.slice(0, 2).toUpperCase()}
                                        </Avatar>
                                    </Tooltip>
                                );
                            })}
                        </Box>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                            Join {callParticipants.length} others in the call
                        </Typography>
                    </>
                ) : (
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        <Users size={40} color="white" />
                    </Box>
                )}

                {!callParticipants.length && (
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                        Ready to Focus Together?
                    </Typography>
                )}

                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                    Join the video call to study with others in real-time
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <Sparkles size={16} color="#667eea" />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Click "Start Video" or "Start Audio" in the header to begin
                    </Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <Box
            sx={{
                width: '100%',
                borderRadius: 4,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    px: 3,
                    py: 2,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                        Focus Session
                    </Typography>
                    <Box
                        sx={{
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            bgcolor: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                        }}
                    >
                        <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600 }}>
                            {participants.length} {participants.length === 1 ? 'person' : 'people'} focusing
                        </Typography>
                    </Box>
                </Box>

                {/* Control buttons */}
                <Box display="flex" gap={1}>
                    <Tooltip title={isAudioEnabled ? 'Mute' : 'Unmute'}>
                        <IconButton
                            onClick={onToggleAudio}
                            sx={{
                                bgcolor: isAudioEnabled ? 'rgba(255,255,255,0.1)' : '#ef4444',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: isAudioEnabled ? 'rgba(255,255,255,0.2)' : '#dc2626'
                                },
                            }}
                        >
                            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}>
                        <IconButton
                            onClick={onToggleVideo}
                            sx={{
                                bgcolor: isVideoEnabled ? 'rgba(255,255,255,0.1)' : '#ef4444',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: isVideoEnabled ? 'rgba(255,255,255,0.2)' : '#dc2626'
                                },
                            }}
                        >
                            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
                        <IconButton
                            onClick={onToggleScreenShare}
                            sx={{
                                bgcolor: isScreenSharing ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: isScreenSharing ? '#2563eb' : 'rgba(255,255,255,0.2)'
                                },
                            }}
                        >
                            <MonitorUp size={20} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Leave call">
                        <IconButton
                            onClick={onLeaveCall}
                            sx={{
                                bgcolor: '#ef4444',
                                color: 'white',
                                '&:hover': { bgcolor: '#dc2626' },
                            }}
                        >
                            <PhoneOff size={20} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Participants Grid */}
            <Box sx={{ p: 2 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
                        gap: 2,
                    }}
                >
                    {participants.map((participant) => (
                        <ParticipantTile
                            key={participant.odID}
                            participant={participant}
                            isLarge={participants.length <= 2}
                        />
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default StudyStreamGrid;
