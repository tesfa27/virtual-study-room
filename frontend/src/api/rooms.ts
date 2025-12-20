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

/**
 * Chat Message Type
 */
export interface ChatMessage {
    id: string;
    message: string;
    username: string;
    is_edited?: boolean;
    seen_by?: string[];
    created_at?: string;
}

/**
 * Join a room
 */
export async function joinRoom(id: string): Promise<{ message: string; role: string }> {
    return apiClient<{ message: string; role: string }>(
        `/rooms/${id}/join/`,
        {
            method: "POST",
        }
    );
}

/**
 * Get room messages
 */
export async function getRoomMessages(id: string): Promise<ChatMessage[]> {
    return apiClient<ChatMessage[]>(`/rooms/${id}/messages/`);
}
