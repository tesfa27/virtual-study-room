import { apiClient, getCookie } from "./client";

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
    message_type?: 'chat' | 'file' | 'join' | 'leave' | 'system';
    reactions?: { [emoji: string]: string[] };
    replied_to_message?: {
        id: string;
        username: string;
        message: string;
        created_at: string;
    } | null;
    file?: RoomFile;
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

export interface RoomFile {
    id: string;
    room: string;
    uploaded_by: string; // User ID
    uploaded_by_username: string;
    file_url: string;
    original_filename: string;
    file_size_display: string;
    file_type: string;
    file_extension: string;
    is_image: boolean;
    description: string;
    download_count: number;
    created_at: string;
}

/**
 * Get all files in a room
 */
export async function getRoomFiles(roomId: string): Promise<RoomFile[]> {
    return apiClient<RoomFile[]>(`/rooms/${roomId}/files/`);
}

/**
 * Upload a file to a room
 */
export async function uploadRoomFile(roomId: string, file: File, description = ""): Promise<RoomFile> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);

    // Note: We don't use apiClient here because it stringifies body by default.
    // We need to send FormData. We'll reuse the auth token logic from `auth.ts` or localStorage.
    const token = getCookie("access_token"); // Assuming simple token storage

    // Using fetch directly for FormData support
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/rooms/${roomId}/files/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!res.ok) {
        throw new Error('Upload failed');
    }

    return res.json();
}

/**
 * Delete a file from a room
 */
export async function deleteRoomFile(roomId: string, fileId: string): Promise<void> {
    return apiClient<void>(`/rooms/${roomId}/files/${fileId}/`, {
        method: 'DELETE'
    });
}


// ============================================================================
// WebRTC Call API
// ============================================================================

export interface CallParticipant {
    id: string;
    user_id: string;
    username: string;
    is_audio_enabled: boolean;
    is_video_enabled: boolean;
    is_screen_sharing: boolean;
    is_connected: boolean;
    joined_at: string;
    left_at: string | null;
    is_active: boolean;
}

export interface CallSession {
    id: string;
    room: string;
    call_type: 'audio' | 'video';
    status: 'active' | 'ended';
    initiated_by: string;
    initiated_by_username: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number;
    max_participants: number;
    participant_count: number;
    participants: CallParticipant[];
}

export interface ICEServerConfig {
    iceServers: RTCIceServer[];
    iceCandidatePoolSize: number;
}

/**
 * Get active call in room
 */
export async function getRoomCall(roomId: string): Promise<CallSession | { active_call: null }> {
    return apiClient<CallSession | { active_call: null }>(`/rooms/${roomId}/call/`);
}

/**
 * Start or join a call
 */
export async function joinCall(
    roomId: string,
    options: { call_type?: 'audio' | 'video'; audio_enabled?: boolean; video_enabled?: boolean } = {}
): Promise<CallSession> {
    return apiClient<CallSession>(`/rooms/${roomId}/call/`, {
        method: 'POST',
        body: JSON.stringify(options)
    });
}

/**
 * Leave the current call
 */
export async function leaveCall(roomId: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/rooms/${roomId}/call/leave/`, {
        method: 'POST'
    });
}

/**
 * End the call (admin only)
 */
export async function endCall(roomId: string): Promise<{ message: string }> {
    return apiClient<{ message: string }>(`/rooms/${roomId}/call/end/`, {
        method: 'POST'
    });
}

/**
 * Get ICE server configuration
 */
export async function getICEServers(): Promise<ICEServerConfig> {
    return apiClient<ICEServerConfig>('/rooms/ice-servers/');
}

