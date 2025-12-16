import { apiClient } from "./client";

/**
 * Authentication API Types
 */
export interface LoginRequest {
    email?: string;
    username?: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    password2: string;
}

export interface User {
    id: string;
    email: string;
    username: string;
    is_room_owner: boolean;
    focus_streak: number;
}

export interface LoginResponse {
    message: string;
    // user is not returned in login response by default in our backend
}

export interface RegisterResponse {
    id: string;
    email: string;
    username: string;
}

export interface ValidatedTokenResponse {
    success: boolean;
    message: string;
    uidb64: string;
    token: string;
}

/**
 * Authentication API Functions
 */

/**
 * Login user
 */
export async function loginUser(
    credentials: LoginRequest
): Promise<LoginResponse> {
    return apiClient<LoginResponse>(
        "/auth/login/",
        {
            method: "POST",
            body: JSON.stringify(credentials),
            skipAuth: true,
        }
    );
}

/**
 * Register new user
 */
export async function registerUser(
    data: RegisterRequest
): Promise<RegisterResponse> {
    return apiClient<RegisterResponse>(
        "/auth/register/",
        {
            method: "POST",
            body: JSON.stringify(data),
            skipAuth: true,
        }
    );
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<{ message: string }> {
    return apiClient<{ message: string }>(
        "/auth/logout/",
        {
            method: "POST",
        }
    );
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User> {
    return apiClient<User>("/auth/me/");
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<{ access: string }> {
    return apiClient<{ access: string }>(
        "/auth/token/refresh/",
        {
            method: "POST",
        }
    );
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
    email: string
): Promise<{ message: string }> {
    return apiClient<{ message: string }>(
        "/auth/forgot-password/",
        {
            method: "POST",
            body: JSON.stringify({ email }),
            skipAuth: true,
        }
    );
}

/**
 * Validate password reset token
 */
export async function validateResetToken(
    uidb64: string,
    token: string
): Promise<ValidatedTokenResponse> {
    return apiClient<ValidatedTokenResponse>(
        `/auth/reset-password/${uidb64}/${token}/`,
        {
            skipAuth: true,
        }
    );
}

/**
 * Reset password
 */
export async function resetPassword(
    data: any
): Promise<{ message: string }> {
    return apiClient<{ message: string }>(
        "/auth/reset-password/",
        {
            method: "POST",
            body: JSON.stringify(data),
            skipAuth: true,
        }
    );
}
