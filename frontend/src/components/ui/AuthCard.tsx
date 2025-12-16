import type { ReactNode } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    Typography,
    Box
} from "@mui/material";
import { styled } from "@mui/material/styles";

interface AuthCardProps {
    title: string;
    description: string;
    children: ReactNode;
}

const StyledCard = styled(Card)(({ theme }) => ({
    width: '100%',
    maxWidth: 450,
    borderRadius: (theme.shape.borderRadius as number) * 2,
    boxShadow: theme.shadows[3],
    margin: '0 auto', // Center horizontally if used in a flex container
}));

export default function AuthCard({
    title,
    description,
    children,
}: AuthCardProps) {
    return (
        <StyledCard>
            <CardHeader
                title={
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" component="h1" fontWeight="bold">
                            {title}
                        </Typography>
                    </Box>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                        {description}
                    </Typography>
                }
            />
            <CardContent>
                {children}
            </CardContent>
        </StyledCard>
    );
}
