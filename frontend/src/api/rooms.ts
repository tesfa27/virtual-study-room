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
    message_type?: 'chat' | 'join' | 'leave' | 'system';
    reactions?: { [emoji: string]: string[] };
    replied_to_message?: {
        id: string;
        username: string;
        message: string;
        created_at: string;
    } | null;
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

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

/**
 * Get room messages
 */
export async function getRoomMessages(id: string, page = 1): Promise<PaginatedResponse<ChatMessage>> {
    return apiClient<PaginatedResponse<ChatMessage>>(`/rooms/${id}/messages/?page=${page}`);
}

/**
 * Leave a room
 */
export async function leaveRoom(id: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(
        `/rooms/${id}/leave/`,
        {
            method: "POST",
        }
    );
}

export interface RoomMember {
    id: string; // Membership ID
    room: string;
    user: string; // User ID
    username: string;
    role: string;
    joined_at: string;
}

/**
 * Get room members
 */
export async function getRoomMembers(id: string): Promise<RoomMember[]> {
    return apiClient<RoomMember[]>(`/rooms/${id}/members/`);
}

export interface PomodoroSession {
    id: string;
    phase: 'work' | 'short_break' | 'long_break';
    is_running: boolean;
    start_time: string | null;
    remaining: number; // calculated remaining seconds
    work_duration: number;
    short_break_duration: number;
    long_break_duration: number;
    current_time: string; // server time
}

export async function getPomodoroSession(id: string): Promise<PomodoroSession> {
    return apiClient<PomodoroSession>(`/rooms/${id}/pomodoro/`);
}

export async function updatePomodoroSession(id: string, action: string, data?: any): Promise<PomodoroSession> {
    return apiClient<PomodoroSession>(`/rooms/${id}/pomodoro/`, {
        method: 'POST',
        body: JSON.stringify({ action, ...data })
    });
}
