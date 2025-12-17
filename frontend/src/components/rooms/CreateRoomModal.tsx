import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRoomSchema, type CreateRoomFormData } from "../../types/room-schemas";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Checkbox,
    Alert,
    Box
} from "@mui/material";

interface CreateRoomModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateRoomFormData) => Promise<void>;
}

export default function CreateRoomModal({ open, onClose, onSubmit }: CreateRoomModalProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateRoomFormData>({
        resolver: zodResolver(createRoomSchema),
        defaultValues: {
            capacity: 10,
            is_private: false,
        }
    });

    const handleFormSubmit = async (data: CreateRoomFormData) => {
        setIsSubmitting(true);
        setServerError(null);
        try {
            await onSubmit(data);
            reset();
            onClose();
        } catch (err: any) {
            const message = err.status === 400
                ? (err.data?.message || JSON.stringify(err.data) || "Creation failed")
                : (err.message || "An error occurred");
            setServerError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create New Study Room</DialogTitle>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2}>
                        {serverError && <Alert severity="error">{serverError}</Alert>}

                        <TextField
                            label="Room Name"
                            fullWidth
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            disabled={isSubmitting}
                            {...register("name")}
                        />
                        <TextField
                            label="Topic (e.g., Python, Math)"
                            fullWidth
                            error={!!errors.topic}
                            helperText={errors.topic?.message}
                            disabled={isSubmitting}
                            {...register("topic")}
                        />
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            fullWidth
                            error={!!errors.description}
                            helperText={errors.description?.message}
                            disabled={isSubmitting}
                            {...register("description")}
                        />
                        <TextField
                            label="Capacity"
                            type="number"
                            fullWidth
                            error={!!errors.capacity}
                            helperText={errors.capacity?.message}
                            disabled={isSubmitting}
                            {...register("capacity")}
                        />
                        <FormControlLabel
                            control={<Checkbox {...register("is_private")} disabled={isSubmitting} />}
                            label="Private Room (Invite Only)"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Room'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
