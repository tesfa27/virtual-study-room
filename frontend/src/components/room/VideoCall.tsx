import React, { useRef, useEffect } from 'react';
import {
    Box,
    IconButton,
    Typography,
    Tooltip,
    Badge,
    Paper,
    Avatar,
    Chip,
} from '@mui/material';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorUp,
    PhoneOff,
    Users,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { type RemoteStream } from '../../hooks/use-webrtc';

interface VideoCallProps {
    localStream: MediaStream | null;
    remoteStreams: RemoteStream[];
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    username: string;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
    onLeave: () => void;
    participantCount: number;
}

// Individual video tile component
const VideoTile: React.FC<{
    stream: MediaStream | null;
    username: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
    isLocal?: boolean;
    isScreenShare?: boolean;
}> = ({ stream, username, isMuted, isVideoOff, isLocal, isScreenShare }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 150,
                bgcolor: '#1a1a2e',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Video element */}
            {stream && !isVideoOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: isScreenShare ? 'contain' : 'cover',
                        transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
                    }}
                />
            ) : (
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        fontSize: '2rem',
                        bgcolor: 'primary.main',
                    }}
                >
                    {username.charAt(0).toUpperCase()}
                </Avatar>
            )}

            {/* Name badge */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                }}
            >
                <Chip
                    label={isLocal ? `${username} (You)` : username}
                    size="small"
                    sx={{
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        backdropFilter: 'blur(4px)',
                    }}
                />
                {isMuted && (
                    <Box
                        sx={{
                            p: 0.5,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            display: 'flex',
                        }}
                    >
                        <MicOff size={12} color="white" />
                    </Box>
                )}
            </Box>

            {/* Screen share indicator */}
            {isScreenShare && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                    }}
                >
                    <Chip
                        icon={<MonitorUp size={14} />}
                        label="Screen"
                        size="small"
                        color="primary"
                        sx={{ bgcolor: 'primary.main' }}
                    />
                </Box>
            )}
        </Box>
    );
};

export const VideoCall: React.FC<VideoCallProps> = ({
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    username,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onLeave,
    participantCount,
}) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate grid layout based on participant count
    const totalParticipants = 1 + remoteStreams.length; // local + remote
    const gridCols = totalParticipants <= 2 ? 1 : totalParticipants <= 4 ? 2 : 3;

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <Paper
            ref={containerRef}
            elevation={4}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                bgcolor: '#0f0f23',
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: 'rgba(255,255,255,0.05)',
                }}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Badge badgeContent={participantCount} color="primary">
                        <Users size={20} color="white" />
                    </Badge>
                    <Typography color="white" fontWeight={500}>
                        Video Call
                    </Typography>
                </Box>
                <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                    <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Video Grid */}
            <Box
                sx={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                    gap: 1,
                    p: 1,
                    overflow: 'auto',
                }}
            >
                {/* Local video */}
                <VideoTile
                    stream={localStream}
                    username={username}
                    isMuted={!isAudioEnabled}
                    isVideoOff={!isVideoEnabled}
                    isLocal
                    isScreenShare={isScreenSharing}
                />

                {/* Remote videos */}
                {remoteStreams.map((remote) => (
                    <VideoTile
                        key={remote.odID}
                        stream={remote.stream}
                        username={remote.username}
                        isMuted={!remote.isAudioEnabled}
                        isVideoOff={!remote.isVideoEnabled}
                        isScreenShare={remote.isScreenSharing}
                    />
                ))}
            </Box>

            {/* Controls */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'rgba(255,255,255,0.05)',
                }}
            >
                {/* Mic toggle */}
                <Tooltip title={isAudioEnabled ? 'Mute' : 'Unmute'}>
                    <IconButton
                        onClick={onToggleAudio}
                        sx={{
                            bgcolor: isAudioEnabled ? 'rgba(255,255,255,0.1)' : 'error.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: isAudioEnabled ? 'rgba(255,255,255,0.2)' : 'error.dark',
                            },
                            width: 48,
                            height: 48,
                        }}
                    >
                        {isAudioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
                    </IconButton>
                </Tooltip>

                {/* Video toggle */}
                <Tooltip title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}>
                    <IconButton
                        onClick={onToggleVideo}
                        sx={{
                            bgcolor: isVideoEnabled ? 'rgba(255,255,255,0.1)' : 'error.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: isVideoEnabled ? 'rgba(255,255,255,0.2)' : 'error.dark',
                            },
                            width: 48,
                            height: 48,
                        }}
                    >
                        {isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
                    </IconButton>
                </Tooltip>

                {/* Screen share toggle */}
                <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
                    <IconButton
                        onClick={onToggleScreenShare}
                        sx={{
                            bgcolor: isScreenSharing ? 'primary.main' : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            '&:hover': {
                                bgcolor: isScreenSharing ? 'primary.dark' : 'rgba(255,255,255,0.2)',
                            },
                            width: 48,
                            height: 48,
                        }}
                    >
                        <MonitorUp size={22} />
                    </IconButton>
                </Tooltip>

                {/* Leave call */}
                <Tooltip title="Leave call">
                    <IconButton
                        onClick={onLeave}
                        sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            width: 56,
                            height: 48,
                            borderRadius: 3,
                        }}
                    >
                        <PhoneOff size={22} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default VideoCall;
