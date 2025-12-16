import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import {
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    Alert,
    Link,
    Box,
    Typography
} from "@mui/material";

import AuthCard from "../components/ui/AuthCard";
import { loginSchema, type LoginFormData } from "../types/auth-schemas";
import { useAuth } from "../hooks/use-auth";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth({ fetchUser: false });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            rememberMe: false,
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);
        try {
            await login({
                email: data.email,
                username: data.email,
                password: data.password,
            });
            window.location.href = '/';
        } catch (err: any) {
            const message = err.status === 401
                ? "Invalid credentials"
                : (err.message || "Login failed");
            setError(message);
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
                title="Sign In"
                description="Enter your credentials to access your account"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box display="flex" flexDirection="column" gap={2}>
                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error">{error}</Alert>
                        )}

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
                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                {/* Label is handled by TextField, but we want the forgot link above or separate */}
                            </Box>
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
                            <Box display="flex" justifyContent="flex-end" mt={0.5}>
                                <Link
                                    href="/forgot-password"
                                    variant="body2"
                                    underline="hover"
                                    color="primary"
                                >
                                    Forgot password?
                                </Link>
                            </Box>
                        </Box>

                        {/* Remember Me Checkbox */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    id="rememberMe"
                                    color="primary"
                                    disabled={isLoading}
                                    {...register("rememberMe")}
                                />
                            }
                            label={
                                <Typography variant="body2" color="text.secondary">
                                    Remember me for 30 days
                                </Typography>
                            }
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
                            {isLoading ? "Signing in..." : "Sign In"}
                        </Button>

                        {/* Register Link */}
                        <Box textAlign="center" mt={2}>
                            <Typography variant="body2" color="text.secondary">
                                Don't have an account?{" "}
                                <Link
                                    href="/register"
                                    variant="subtitle2"
                                    underline="hover"
                                    fontWeight="medium"
                                >
                                    Sign up
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </form>
            </AuthCard>
        </Box>
    );
}
