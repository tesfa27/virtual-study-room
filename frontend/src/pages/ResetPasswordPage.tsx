import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useParams, useNavigate } from "react-router-dom";

import {
    TextField,
    Button,
    Alert,
    Box,
    CircularProgress
} from "@mui/material";

import AuthCard from "../components/ui/AuthCard";
import { resetPasswordSchema, type ResetPasswordFormData } from "../types/auth-schemas";

export default function ResetPasswordPage() {
    const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
    const navigate = useNavigate();

    // States
    const [isVerifying, setIsVerifying] = useState(true);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [tokenError, setTokenError] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { validateResetToken, resetPassword } = useAuth({ fetchUser: false });

    useEffect(() => {
        const verify = async () => {
            if (!uidb64 || !token) {
                setTokenError("Invalid password reset link.");
                setIsVerifying(false);
                return;
            }

            try {
                await validateResetToken(uidb64, token);
                setIsTokenValid(true);
            } catch (err) {
                setTokenError("This link is invalid or has expired.");
            } finally {
                setIsVerifying(false);
            }
        };
        verify();
    }, [uidb64, token]);


    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!uidb64 || !token) return;

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await resetPassword({
                uidb64,
                token,
                password: data.password,
                password2: data.password2
            });
            setSuccessMessage("Password reset successful! Redirecting to login...");
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            const message = err.status === 400
                ? (err.data?.message || err.data.error || "Reset failed")
                : (err.message || "An error occurred");

            if (typeof message === 'object') {
                setError(JSON.stringify(message));
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerifying) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
                bgcolor="background.default"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!isTokenValid) {
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
                    title="Invalid Link"
                    description="This password reset link is invalid or has expired."
                >
                    <Alert severity="error" sx={{ mb: 2 }}>{tokenError}</Alert>
                    <Box textAlign="center">
                        <Button variant="contained" onClick={() => navigate('/login')}>
                            Return to Login
                        </Button>
                    </Box>
                </AuthCard>
            </Box>
        );
    }

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
                title="Reset Password"
                description="Enter your new password below"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Box display="flex" flexDirection="column" gap={2}>
                        {/* Error Alert */}
                        {error && (
                            <Alert severity="error">{error}</Alert>
                        )}
                        {/* Success Alert */}
                        {successMessage && (
                            <Alert severity="success">{successMessage}</Alert>
                        )}

                        {/* Password Field */}
                        <TextField
                            id="password"
                            label="New Password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            error={!!errors.password}
                            helperText={errors.password?.message}
                            disabled={isLoading || !!successMessage}
                            {...register("password")}
                        />

                        {/* Password 2 Field */}
                        <TextField
                            id="password2"
                            label="Confirm New Password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            error={!!errors.password2}
                            helperText={errors.password2?.message}
                            disabled={isLoading || !!successMessage}
                            {...register("password2")}
                        />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={isLoading || !!successMessage}
                            size="large"
                            startIcon={isLoading ? <Loader2 className="animate-spin" /> : null}
                        >
                            {isLoading ? "Reseting..." : "Reset Password"}
                        </Button>
                    </Box>
                </form>
            </AuthCard>
        </Box>
    );
}
