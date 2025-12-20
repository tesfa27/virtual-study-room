import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getRooms, getRoom, createRoom } from "../api/rooms";
import type { CreateRoomRequest, RoomListResponse } from "../api/rooms";

export const useRooms = (page = 1, search = "") => {
    const queryClient = useQueryClient();

    // Fetch rooms list
    const roomsQuery = useQuery<RoomListResponse>({
        queryKey: ["rooms", page, search],
        queryFn: () => getRooms(page, search),
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000, // 1 minute
    });

    // Create room mutation
    const createRoomMutation = useMutation({
        mutationFn: (data: CreateRoomRequest) => createRoom(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rooms"] });
        },
    });

    return {
        rooms: roomsQuery.data,
        isLoading: roomsQuery.isLoading,
        isError: roomsQuery.isError,
        error: roomsQuery.error,
        createRoom: createRoomMutation.mutateAsync,
        isCreating: createRoomMutation.isPending,
    };
};

export const useRoom = (id: string, enabled = true) => {
    return useQuery({
        queryKey: ["room", id],
        queryFn: () => getRoom(id),
        enabled: enabled && !!id,
        staleTime: 30 * 1000, // 30 seconds
    });
};
