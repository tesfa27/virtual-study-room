import { API_URL } from "./config";

class ApiError extends Error {
    public status: number;
    public data?: any;

    constructor(
        message: string,
        status: number,
        data?: any
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

interface FetchOptions extends RequestInit {
    skipAuth?: boolean;
    _retry?: boolean;
}

/**
 * Token refresh queue handling
 */
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: any = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/**
 * Helper to get cookie value
 */
function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

/**
 * Base fetch wrapper with error handling
 */
export async function apiClient<T = any>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { skipAuth, _retry, ...fetchOptions } = options;

    // Construct full URL
    // Ensure endpoint starts with / if not present
    let cleanEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
    const url = `${API_URL}/api${cleanEndpoint}`;

    // Add Authorization header if access token exists
    // (Since access_token cookie is not HttpOnly, we can read it)
    const accessToken = getCookie("access_token");
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
    };

    if (accessToken && !skipAuth) {
        (headers as any)["Authorization"] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: "include", // Include cookies for authentication
        });

        /**
         * 204 No Content
         */
        if (response.status === 204) {
            return {} as T;
        }

        /**
         * Intercept 401 → attempt token refresh
         */
        if (response.status === 401 && !skipAuth && !_retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return apiClient<T>(endpoint, { ...options, _retry: true });
                });
            }

            isRefreshing = true;

            try {
                // Call refresh endpoint
                // Note: We rely on the backend reading the 'refresh_token' HttpOnly cookie.
                // OR we rely on a middleware that accepts the cookie.
                const refreshResponse = await fetch(
                    `${API_URL}/api/auth/token/refresh/`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                    }
                );

                if (!refreshResponse.ok) {
                    throw new Error("Token refresh failed");
                }

                // If successful, backend should have set a new access_token cookie
                // We process queue and retry original request
                processQueue(null, true);
                isRefreshing = false;

                return apiClient<T>(endpoint, { ...options, _retry: true });
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                // Fall through to error handling (which will likely redirect)
            }
        }

        /**
         * Parse JSON response
         */
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // Check if it was an error status with non-JSON body
            if (!response.ok) {
                throw new ApiError(response.statusText || "Unknown Error", response.status);
            }
            data = {};
        }

        /**
         * Handle error responses
         */
        if (!response.ok) {
            if (response.status === 401 && !skipAuth) {
                const pathname = window.location.pathname;
                const isAuthPage =
                    pathname.includes("/login") ||
                    pathname.includes("/register") ||
                    pathname.includes("/reset-password");

                if (!isAuthPage) {
                    // Redirect to login
                    // Use window.location for hard redirect to clear state
                    window.location.href = "/login";
                }
            }

            throw new ApiError(
                data?.detail || data?.error || data?.message || "An error occurred",
                response.status,
                data
            );
        }

        return data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            "Network error. Please check your connection.",
            0
        );
    }
}
