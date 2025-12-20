import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useRooms } from "../hooks/use-rooms";
import {
    Container,
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    TextField,
    InputAdornment,
    Pagination
} from "@mui/material";
import { Plus, Search, LogOut } from "lucide-react";
import RoomList from "../components/rooms/RoomList";
import CreateRoomModal from "../components/rooms/CreateRoomModal";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { rooms, isLoading, isError, createRoom } = useRooms(page, search);

    // We assume default page size is 10 based on backend default
    const PAGE_SIZE = 10;
    const totalPages = rooms ? Math.ceil(rooms.count / PAGE_SIZE) : 0;

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        Study Rooms
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Welcome back, {user?.username}!
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        startIcon={<LogOut size={18} />}
                        onClick={() => logout()}
                    >
                        Sign Out
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        Create Room
                    </Button>
                </Box>
            </Box>

            {/* Search Bar */}
            <Box mb={4}>
                <TextField
                    fullWidth
                    placeholder="Search by name or topic..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1); // Reset to first page on search
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search color="#action" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Content */}
            {isLoading ? (
                <Box display="flex" justifyContent="center" py={8}>
                    <CircularProgress />
                </Box>
            ) : isError ? (
                <Alert severity="error">Failed to load rooms. Please try again later.</Alert>
            ) : !rooms?.results?.length ? (
                <Box textAlign="center" py={8}>
                    <Typography variant="h6" color="text.secondary">
                        No active rooms found. Why not create one?
                    </Typography>
                </Box>
            ) : (
                <>
                    <RoomList rooms={rooms.results} />
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box display="flex" justifyContent="center" mt={4}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                                size="large"
                            />
                        </Box>
                    )}
                </>
            )}

            {/* Modals */}
            <CreateRoomModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={async (data) => { await createRoom(data); }}
            />
        </Container>
    );
}
