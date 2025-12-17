import { apiClient } from "./client";

/**
 * Room API Types
 */
export interface Room {
    id: string;
    name: string;
    description: string;
    topic: string;
    is_private: boolean;
    capacity: number;
    owner: string; // ID
    owner_username: string;
    created_at: string;
    active_members_count: number;
}

export interface RoomListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Room[];
}

export interface CreateRoomRequest {
    name: string;
    description?: string;
    topic?: string;
    capacity?: number;
    is_private?: boolean;
}

/**
 * Get all rooms (paginated)
 */
export async function getRooms(page = 1, search = ""): Promise<RoomListResponse> {
    const queryParams = new URLSearchParams();
    if (page > 1) queryParams.append("page", page.toString());
    if (search) queryParams.append("search", search);

    return apiClient<RoomListResponse>(
        `/rooms/?${queryParams.toString()}`
    );
}

/**
 * Get single room by ID
 */
export async function getRoom(id: string): Promise<Room> {
    return apiClient<Room>(`/rooms/${id}/`);
}

/**
 * Create a new room
 */
export async function createRoom(data: CreateRoomRequest): Promise<Room> {
    return apiClient<Room>(
        "/rooms/",
        {
            method: "POST",
            body: JSON.stringify(data),
        }
    );
}
