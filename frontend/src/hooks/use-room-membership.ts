import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRoomMessages, joinRoom } from '../api/rooms';

export function useRoomMembership(roomId: string | undefined, user: any) {
    const queryClient = useQueryClient();

    // 1. Check Membership (by trying to fetch messages)
    // We use this strictly as a "Permission Check".
    const membershipQuery = useQuery({
        queryKey: ['room', roomId, 'membership'],
        queryFn: async () => {
            if (!roomId) throw new Error("No room ID");
            return getRoomMessages(roomId);
        },
        enabled: !!roomId && !!user,
        retry: false, // Fail immediately if 403
    });

    // Determine states based on Query result
    const hasJoined = membershipQuery.isSuccess;

    // Show dialog if we got an error (403 Forbidden or even 500 Fail-Safe)
    const showJoinDialog = membershipQuery.isError;

    // 2. Join Mutation
    const joinMutation = useMutation({
        mutationFn: () => {
            if (!roomId) throw new Error("No room ID");
            return joinRoom(roomId);
        },
        onSuccess: () => {
            // Invalidate to re-check (though we reload page anyway)
            queryClient.invalidateQueries({ queryKey: ['room', roomId, 'membership'] });
            // Reload to ensure WebSocket connects with clean permissions
            window.location.reload();
        },
        onError: (error) => {
            console.error('Failed to join room:', error);
            alert('Failed to join room. Please try again.');
        }
    });

    return {
        hasJoined,
        showJoinDialog,
        isLoading: membershipQuery.isLoading,
        checkMembership: membershipQuery.refetch,
        handleJoin: joinMutation.mutateAsync,
        handleDeclineJoin: () => window.location.href = '/',
        isJoining: joinMutation.isPending
    };
}
