import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography
} from "@mui/material";

interface JoinRoomDialogProps {
    open: boolean;
    roomName?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function JoinRoomDialog({ open, roomName, onConfirm, onCancel }: JoinRoomDialogProps) {
    return (
        <Dialog open={open} onClose={onCancel}>
            <DialogTitle>Join Room?</DialogTitle>
            <DialogContent>
                <Typography>
                    Would you like to join "{roomName}"? You'll be able to chat with other members and participate in study sessions.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">
                    Cancel
                </Button>
                <Button onClick={onConfirm} variant="contained" color="primary">
                    Join Room
                </Button>
            </DialogActions>
        </Dialog>
    );
}
