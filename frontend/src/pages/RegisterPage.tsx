import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

import {
    TextField,
    Button,
    Alert,
    Link,
    Box,
    Typography
} from "@mui/material";

import AuthCard from "../components/ui/AuthCard";
import { registerSchema, type RegisterFormData } from "../types/auth-schemas";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { register: registerUser } = useAuth({ fetchUser: false });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        setError(null);
        try {
            await registerUser({
                email: data.email,
                username: data.username,
                password: data.password,
                password2: data.password2,
            });
            // Redirect to login on success (or auto login if backend supported it)
            window.location.href = '/login';
        } catch (err: any) {
            const message = err.status === 400
                ? (err.data?.message || err.data || "Registration failed")
                : (err.message || "An error occurred");
            // Be careful if err.data is object, to stringify or pick first error?
            // Usually err.data from DRF is { field: [error] } or { detail: ... }
            if (typeof message === 'object') {
                setError(JSON.stringify(message));
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
            bgcolor="background.default"
            p={2}
        >
            <AuthCard
                title="Create Account"
                description="Sign up to start using the Virtual Study Room"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box display="flex" flexDirection="column" gap={2}>
                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error">{error}</Alert>
                        )}

                        {/* Username Field */}
                        <TextField
                            id="username"
                            label="Username"
                            variant="outlined"
                            fullWidth
                            error={!!errors.username}
                            helperText={errors.username?.message}
                            disabled={isLoading}
                            {...register("username")}
                        />

                        {/* Email Field */}
                        <TextField
                            id="email"
                            label="Email"
                            type="email"
                            variant="outlined"
                            fullWidth
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            disabled={isLoading}
                            {...register("email")}
                        />

                        {/* Password Field */}
                        <TextField
                            id="password"
                            label="Password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            error={!!errors.password}
                            helperText={errors.password?.message}
                            disabled={isLoading}
                            {...register("password")}
                        />

                        {/* Confirm Password Field */}
                        <TextField
                            id="password2"
                            label="Confirm Password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            error={!!errors.password2}
                            helperText={errors.password2?.message}
                            disabled={isLoading}
                            {...register("password2")}
                        />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={isLoading}
                            size="large"
                            startIcon={isLoading ? <Loader2 className="animate-spin" /> : null}
                        >
                            {isLoading ? "Creating Account..." : "Sign Up"}
                        </Button>

                        {/* Login Link */}
                        <Box textAlign="center" mt={2}>
                            <Typography variant="body2" color="text.secondary">
                                Already have an account?{" "}
                                <Link
                                    href="/login"
                                    variant="subtitle2"
                                    underline="hover"
                                    fontWeight="medium"
                                >
                                    Sign in
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </form>
            </AuthCard>
        </Box>
    );
}
