import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../hooks/use-auth"; // Relative path adjusted
import { Box, Typography } from "@mui/material";

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    // Determine current path
    const pathname = window.location.pathname;
    const { isAuthenticated, isLoading } = useAuth(); // Removed tenantId

    // Detect auth pages to avoid redirect loops
    const isAuthPage = pathname.startsWith(`/login`) ||
        pathname.startsWith(`/register`) ||
        pathname.startsWith(`/forgot-password`) ||
        pathname.startsWith(`/reset-password`);

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isAuthPage) {
            // Standard window redirect
            window.location.href = '/login';
        }
    }, [isAuthenticated, isLoading, isAuthPage]); // Removed unnecessary dependencies

    if (isLoading) {
        return (
            <Box
                display="flex"
                height="100vh"
                alignItems="center"
                justifyContent="center"
            >
                <Box textAlign="center">
                    {/* Used MUI CircularProgress but kept Loader2 if preferred, 
                         switched to CircularProgress for Material consistency 
                         but can easily swap back. 
                         Using Lucide Loader2 as requested in code block.
                     */}
                    <Loader2 className="animate-spin" style={{ width: 32, height: 32, margin: '0 auto', color: '#666' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading...
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (!isAuthenticated && !isAuthPage) {
        return null;
    }

    return <>{children}</>;
}
