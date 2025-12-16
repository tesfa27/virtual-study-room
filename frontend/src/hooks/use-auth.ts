import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCurrentUser, logoutUser, refreshToken, loginUser, registerUser,
    requestPasswordReset, validateResetToken, resetPassword
} from "../api/auth";
import type { User, LoginRequest, RegisterRequest } from "../api/auth";

export const useAuth = (options: { fetchUser?: boolean } = { fetchUser: true }) => {
    const queryClient = useQueryClient();

    // Fetch current user
    const {
        data: user,
        isLoading,
        isError,
        refetch,
    } = useQuery<User | null>({
        queryKey: ["auth", "user"],
        queryFn: async () => {
            try {
                // Modified: In our backend 'getCurrentUser' returns the User object directly now
                // (based on my previous api/auth.ts implementation)
                const user = await getCurrentUser();
                return user;
            } catch (error) {
                return null;
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options.fetchUser,
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async (credentials: LoginRequest) => {
            return await loginUser(credentials);
        },
        onSuccess: () => {
            // Invalidate user query to trigger refetch
            queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
        },
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: async (data: RegisterRequest) => {
            return await registerUser(data);
        },
        onSuccess: () => {
            // After register, we might want to login automatically or just redirect to login
            // For now, let's assume we redirect to login (or component handles it)
            // But if we want to auto-login, we'd need to chain that. 
            // Often registration returns the user or tokens. Our backend might just return created user data.
            // If backend doesn't auto-login, user needs to login.
            // Let's just invalidate for safety.
            queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
        },
    });

    // Forgot Password mutation
    const forgotPasswordMutation = useMutation({
        mutationFn: async (email: string) => {
            return await requestPasswordReset(email);
        }
    });

    // Reset Password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async (data: any) => {
            return await resetPassword(data);
        }
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: async () => {
            await logoutUser();
        },
        onSuccess: () => {
            // Clear all queries
            queryClient.clear();
            // Redirect to login using standard window.location to ensure full clear
            window.location.href = '/login';
        },
    });

    // Token refresh mutation
    const refreshMutation = useMutation({
        mutationFn: async () => {
            return await refreshToken();
        },
        onSuccess: () => {
            // Refetch user data after token refresh
            refetch();
        },
        onError: () => {
            // If refresh fails, logout
            logoutMutation.mutate();
        },
    });

    // Auto-refresh token before expiry
    const handleTokenRefresh = async () => {
        try {
            await refreshMutation.mutateAsync();
        } catch (error) {
            console.error("Token refresh failed:", error);
        }
    };

    return {
        user,
        isLoading,
        // If we have a user and no error, we are authenticated
        isAuthenticated: !!user && !isError,
        isError,
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout: () => logoutMutation.mutate(),
        requestPasswordReset: forgotPasswordMutation.mutateAsync,
        resetPassword: resetPasswordMutation.mutateAsync,
        validateResetToken, // Directly expose the async function as it might not need mutation wrapper for simple check (or useQuery if fetching data)
        refreshToken: handleTokenRefresh,
        refetch,
    };
};
