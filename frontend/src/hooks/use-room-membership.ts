import { useState, useEffect, useCallback } from 'react';
import { getRoomMessages, joinRoom } from '../api/rooms';
import { ApiError } from '../api/client';

interface UseRoomMembershipReturn {
    hasJoined: boolean;
    showJoinDialog: boolean;
    isLoading: boolean;
    checkMembership: () => Promise<void>;
    handleJoin: () => Promise<void>;
    handleDeclineJoin: () => void;
}

export function useRoomMembership(roomId: string | undefined, user: any, onJoinSuccess?: () => void): UseRoomMembershipReturn {
    const [hasJoined, setHasJoined] = useState(false);
    const [showJoinDialog, setShowJoinDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkMembership = useCallback(async () => {
        if (!roomId || !user) {
            setIsLoading(false);
            return;
        }

        try {
            // Try to fetch messages to check membership
            await getRoomMessages(roomId);
            // If successful, user is a member
            setHasJoined(true);
        } catch (error: any) {
            // Check if error is 403 Forbidden (Not a member)
            const isForbidden = error instanceof ApiError && error.status === 403;

            if (isForbidden) {
                setShowJoinDialog(true);
            } else {
                console.error("Membership check failed, prompting join anyway:", error);
                // Safe fail: assume not joined if we can't verify
                setShowJoinDialog(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [roomId, user]);

    useEffect(() => {
        checkMembership();
    }, [checkMembership]);

    const handleJoin = async () => {
        if (!roomId) return;

        try {
            await joinRoom(roomId);
            setHasJoined(true);
            setShowJoinDialog(false);
            if (onJoinSuccess) {
                onJoinSuccess();
            } else {
                // Default behavior if no callback provided
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to join room:', error);
            alert('Failed to join room. Please try again.');
        }
    };

    const handleDeclineJoin = () => {
        // This typically navigates away, but logic belongs in consumer?
        // We can accept a callback or use window location here if simpler.
        // Better to let component handle navigation.
        window.location.href = '/';
    };

    return {
        hasJoined,
        showJoinDialog,
        isLoading,
        checkMembership,
        handleJoin,
        handleDeclineJoin
    };
}
