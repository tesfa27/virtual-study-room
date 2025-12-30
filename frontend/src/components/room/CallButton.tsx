import React from 'react';
import {
    Box,
    Button,
    ButtonGroup,
    Tooltip,
    Chip,
} from '@mui/material';
import { Video, Phone, Users } from 'lucide-react';
import { type CallSession } from '../../api/rooms';

interface CallButtonProps {
    activeCall: CallSession | null;
    isInCall: boolean;
    isLoading?: boolean;
    onStartVideoCall: () => void;
    onStartAudioCall: () => void;
    onJoinCall: () => void;
}

export const CallButton: React.FC<CallButtonProps> = ({
    activeCall,
    isInCall,
    isLoading,
    onStartVideoCall,
    onStartAudioCall,
    onJoinCall,
}) => {
    // If already in call, don't show the button
    if (isInCall) return null;

    // If there's an active call, show join button
    if (activeCall && activeCall.status === 'active') {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                <Chip
                    icon={<Users size={14} />}
                    label={`${activeCall.participant_count} in call`}
                    size="small"
                    color="success"
                    variant="outlined"
                />
                <Button
                    variant="contained"
                    color="success"
                    startIcon={activeCall.call_type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                    onClick={onJoinCall}
                    disabled={isLoading}
                    sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                    }}
                >
                    Join Call
                </Button>
            </Box>
        );
    }

    // No active call - show start call buttons
    return (
        <ButtonGroup variant="contained" size="small" sx={{ borderRadius: 2 }}>
            <Tooltip title="Start video call">
                <Button
                    onClick={onStartVideoCall}
                    disabled={isLoading}
                    sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                    }}
                >
                    <Video size={18} />
                </Button>
            </Tooltip>
            <Tooltip title="Start audio call">
                <Button
                    onClick={onStartAudioCall}
                    disabled={isLoading}
                    sx={{
                        textTransform: 'none',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' },
                    }}
                >
                    <Phone size={18} />
                </Button>
            </Tooltip>
        </ButtonGroup>
    );
};

export default CallButton;
