import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

import {
    TextField,
    Button,
    Alert,
    Link as MuiLink,
    Box,
    Typography
} from "@mui/material";

import AuthCard from "../components/ui/AuthCard";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "../types/auth-schemas";

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { requestPasswordReset } = useAuth({ fetchUser: false });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await requestPasswordReset(data.email);
            setSuccessMessage("If an account exists with this email, a reset link has been sent.");
        } catch (err: any) {
            const message = err.status === 400
                ? (err.data?.message || err.data || "Request failed")
                : (err.message || "An error occurred");
            setError(message || "An error occurred");
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
                title="Forgot Password"
                description="Enter your email to receive a reset link"
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

                        {/* Email Field */}
                        <TextField
                            id="email"
                            label="Email"
                            type="email"
                            variant="outlined"
                            fullWidth
                            error={!!errors.email}
                            helperText={errors.email?.message}
                            disabled={isLoading || !!successMessage}
                            {...register("email")}
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
                            {isLoading ? "Sending..." : "Send Reset Link"}
                        </Button>

                        {/* Login Link */}
                        <Box textAlign="center" mt={2}>
                            <Typography variant="body2" color="text.secondary">
                                Remember your password?{" "}
                                <MuiLink
                                    href="/login"
                                    variant="subtitle2"
                                    underline="hover"
                                    fontWeight="medium"
                                >
                                    Sign in
                                </MuiLink>
                            </Typography>
                        </Box>
                    </Box>
                </form>
            </AuthCard>
        </Box>
    );
}
