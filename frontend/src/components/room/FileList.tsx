import {
    Box, Typography, List, ListItem, ListItemText, ListItemIcon,
    IconButton, Tooltip, ListItemSecondaryAction
} from '@mui/material';
import {
    FileText, Image, Music, FileCode, Archive, File as FileIcon,
    Download, Trash2
} from 'lucide-react';
import { type RoomFile, deleteRoomFile } from '../../api/rooms';
import { getCookie } from '../../api/client';

interface FileListProps {
    roomId: string;
    files: RoomFile[];
    canUpload: boolean;
    canDelete: (file: RoomFile) => boolean;
}

export default function FileList({ roomId, files, canDelete }: FileListProps) {
    // Header Removed - Upload moved to Chat

    const handleDelete = async (fileId: string) => {
        if (confirm("Are you sure you want to delete this file?")) {
            try {
                await deleteRoomFile(roomId, fileId);
            } catch (error) {
                console.error("Delete failed", error);
                alert("Failed to delete file.");
            }
        }
    };

    const getFileIcon = (file: RoomFile) => {
        if (file.is_image) return <Image size={24} color="#4caf50" />;
        const ext = file.file_extension;
        if (['.mp3', '.wav'].includes(ext)) return <Music size={24} color="#e91e63" />;
        if (['.zip', '.rar', '.7z'].includes(ext)) return <Archive size={24} color="#ff9800" />;
        if (['.js', '.ts', '.py', '.html', '.css', '.json'].includes(ext)) return <FileCode size={24} color="#2196f3" />;
        if (['.pdf', '.doc', '.docx', '.txt', '.md'].includes(ext)) return <FileText size={24} color="#607d8b" />;
        return <FileIcon size={24} color="#9e9e9e" />;
    };

    const handleDownload = (file: RoomFile) => {
        const token = getCookie("access_token");
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/rooms/${roomId}/files/${file.id}/`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.original_filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => console.error("Download failed", err));
    };

    return (
        <Box display="flex" flexDirection="column" height="100%">
            {/* Header Removed - Upload moved to Chat */}

            {/* File List */}
            <Box flexGrow={1} overflow="auto">
                {files.length === 0 ? (
                    <Box p={3} textAlign="center">
                        <Typography color="text.secondary">No files shared yet.</Typography>
                    </Box>
                ) : (
                    <List>
                        {files.map((file) => (
                            <ListItem
                                key={file.id}
                                sx={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {getFileIcon(file)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" noWrap title={file.original_filename} fontWeight={500}>
                                            {file.original_filename}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box display="flex" flexDirection="column" gap={0.5}>
                                            <Typography variant="caption" color="text.secondary">
                                                {file.file_size_display} • {file.uploaded_by_username}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(file.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </Typography>
                                            {file.description && (
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {file.description}
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <Tooltip title="Download">
                                        <IconButton edge="end" size="small" onClick={() => handleDownload(file)} sx={{ mr: 1 }}>
                                            <Download size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    {canDelete(file) && (
                                        <Tooltip title="Delete">
                                            <IconButton edge="end" size="small" color="error" onClick={() => handleDelete(file.id)}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
}
