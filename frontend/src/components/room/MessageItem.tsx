import { useState, useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    Avatar,
    Tooltip,
    IconButton,
    Menu,
    MenuItem,
    Chip,
    TextField,
    Button
} from '@mui/material';
import {
    User,
    File,
    FileText,
    Image as ImageIcon,
    Video,
    Music,
    Reply,
    Forward,
    Edit2,
    Trash2,
    Star,
    Smile,
    Plus,
    Check,
    CheckCheck,
    MoreVertical,
    Download
} from 'lucide-react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { createPortal } from 'react-dom';
import type { ChatMessage } from '../../api/rooms';
import { getCookie } from '../../api/client';

interface MessageItemProps {
    message: ChatMessage;
    user: any; // Current User
    isOwnMessage: boolean;
    showDateHeader?: boolean;
    dateHeader?: string;
    isEditing?: boolean; // New Prop
    // Actions
    onEdit?: (id: string, content: string) => void;
    onDelete?: (id: string) => void;
    onReply?: (message: ChatMessage) => void;
    onAddReaction?: (id: string, emoji: string) => void;
    onRemoveReaction?: (id: string, emoji: string) => void;

    // Edit Handlers
    onSaveEdit?: (id: string, newContent: string) => void;
    onCancelEdit?: () => void;
}

const formatMessageTime = (isoString?: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function MessageItem({
    message,
    user,
    isOwnMessage,
    showDateHeader,
    dateHeader,
    isEditing,
    onEdit,
    onDelete,
    onReply,
    onAddReaction,
    onRemoveReaction,
    onSaveEdit,
    onCancelEdit
}: MessageItemProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
    const reactionBtnRef = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [editContent, setEditContent] = useState(message.message);

    // Update local edit content when entering edit mode
    useEffect(() => {
        if (isEditing) {
            setEditContent(message.message);
        }
    }, [isEditing, message.message]);

    const handleFileDownload = () => {
        if (!message.file) return;
        const token = getCookie("access_token");
        const fileId = message.file.id;
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/rooms/${message.file.room}/files/${fileId}/`;

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = message.file?.original_filename || 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(err => console.error("Download failed", err));
    };

    const getFileIcon = (fileName: string, type: string) => {
        if (type.startsWith('image/')) return <ImageIcon size={24} color="#4caf50" />;
        if (fileName.endsWith('.pdf')) return <FileText size={24} color="#f44336" />;
        // ... simple icon logic
        return <File size={24} color="#9e9e9e" />;
    };

    // Menu handlers
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Reaction Picker Logic
    const openPicker = (event: React.MouseEvent<HTMLElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();

        let left = rect.left;
        let top = rect.bottom + 8;

        // Adjust constraints
        if (left + 350 > window.innerWidth) {
            left = window.innerWidth - 360;
        }
        if (top + 450 > window.innerHeight) {
            top = rect.top - 460;
        }

        setPickerPosition({ top, left });
        setShowPicker(true);
        handleMenuClose();
    };

    const handleEmojiSelect = (emoji: any) => {
        if (onAddReaction) {
            onAddReaction(message.id!, emoji.native);
        }
        setShowPicker(false);
    };

    const handleReactionClick = (emoji: string) => {
        const reactions = message.reactions || {};
        const userIds = reactions[emoji] || [];
        const hasReacted = userIds.includes(String(user?.id));

        if (hasReacted) {
            onRemoveReaction?.(message.id!, emoji);
        } else {
            onAddReaction?.(message.id!, emoji);
        }
    };

    const handleSave = () => {
        if (onSaveEdit) {
            onSaveEdit(message.id!, editContent);
        }
    };

    // Render logic
    const reactions = message.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0;

    return (
        <Box
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{ mb: 1, px: 2 }}
        >
            {showDateHeader && (
                <Box display="flex" justifyContent="center" my={2}>
                    <Chip
                        label={dateHeader}
                        size="small"
                        sx={{ fontSize: '0.75rem', height: 24, opacity: 0.8 }}
                    />
                </Box>
            )}

            <Box
                display="flex"
                flexDirection={isOwnMessage ? 'row-reverse' : 'row'}
                alignItems="flex-start"
                gap={1}
            >
                {/* Avatar (only for others) */}
                {!isOwnMessage && (
                    <Avatar
                        sx={{ width: 32, height: 32, mt: 0.5 }}
                    >
                        {message.username?.charAt(0).toUpperCase()}
                    </Avatar>
                )}

                {/* Message Content Bubble */}
                <Box
                    sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                    }}
                >
                    {/* Username (only for others) */}
                    {!isOwnMessage && (
                        <Typography variant="caption" sx={{ ml: 1, mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                            {message.username}
                        </Typography>
                    )}

                    <Box
                        sx={{
                            position: 'relative',
                            bgcolor: isOwnMessage ? 'primary.dark' : 'action.hover',
                            color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                            p: 1.5,
                            borderRadius: 2,
                            borderTopRightRadius: isOwnMessage ? 0 : 2,
                            borderTopLeftRadius: !isOwnMessage ? 0 : 2,
                            boxShadow: 1,
                            minWidth: 120
                        }}
                    >
                        {/* Replied Message Preview */}
                        {message.replied_to_message && (
                            <Box
                                sx={{
                                    mb: 1,
                                    pb: 1,
                                    borderLeft: 3,
                                    borderColor: isOwnMessage ? 'primary.light' : 'primary.main',
                                    pl: 1,
                                    opacity: 0.8,
                                    bgcolor: isOwnMessage ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: 0.5,
                                    p: 0.5
                                }}
                            >
                                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                                    {message.replied_to_message.username}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        opacity: 0.7,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.7rem'
                                    }}
                                >
                                    {message.replied_to_message.message}
                                </Typography>
                            </Box>
                        )}

                        {isEditing ? (
                            <Box mt={1} minWidth={200}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoFocus
                                    multiline
                                    maxRows={4}
                                    sx={{
                                        bgcolor: 'background.paper',
                                        borderRadius: 1,
                                        '& .MuiOutlinedInput-root': { color: 'text.primary' }
                                    }}
                                />
                                <Box display="flex" gap={1} mt={1} justifyContent="flex-end">
                                    <Button size="small" variant="contained" onClick={handleSave} sx={{ minWidth: 60 }}>Save</Button>
                                    <Button size="small" variant="text" onClick={onCancelEdit} sx={{ minWidth: 60, color: 'inherit' }}>Cancel</Button>
                                </Box>
                            </Box>
                        ) : (
                            <>
                                {message.message_type === 'file' && message.file ? (
                                    message.file.is_image ? (
                                        <Box sx={{ mt: 0.5, mb: 1 }}>
                                            <img
                                                src={message.file.file_url}
                                                alt={message.file.original_filename}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: 300,
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    border: '1px solid rgba(0,0,0,0.1)'
                                                }}
                                                loading="lazy"
                                                onClick={() => window.open(message.file!.file_url, '_blank')}
                                            />
                                        </Box>
                                    ) : (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                mb: message.message ? 1 : 0,
                                                p: 1,
                                                bgcolor: 'rgba(0,0,0,0.1)',
                                                borderRadius: 1,
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'rgba(0,0,0,0.15)' }
                                            }}
                                            onClick={handleFileDownload}
                                        >
                                            <Box p={1} bgcolor="background.paper" borderRadius={1}>
                                                {getFileIcon(message.file.original_filename, message.file.file_type)}
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                                                    {message.file.original_filename}
                                                </Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                    {message.file.file_size_display}
                                                </Typography>
                                            </Box>
                                            <IconButton size="small" sx={{ ml: 'auto' }}>
                                                <Download size={16} />
                                            </IconButton>
                                        </Box>
                                    )
                                ) : null}

                                {message.message && (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            lineHeight: 1.5
                                        }}
                                    >
                                        {message.message}
                                        {message.is_edited && (
                                            <Typography component="span" variant="caption" sx={{ fontStyle: 'italic', opacity: 0.7, ml: 0.5, fontSize: '0.65rem' }}>
                                                (edited)
                                            </Typography>
                                        )}
                                    </Typography>
                                )}
                            </>
                        )}

                        {/* Metadata Row (Time + Status) */}
                        <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5} mt={0.5} sx={{ opacity: 0.7 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                {formatMessageTime(message.created_at)}
                            </Typography>
                            {isOwnMessage && (
                                <Box display="flex" alignItems="center">
                                    {(message.seen_by && message.seen_by.length > 0) ? (
                                        <CheckCheck size={14} color="#4caf50" />
                                    ) : (
                                        <Check size={14} />
                                    )}
                                </Box>
                            )}
                        </Box>

                        {/* Reactions Bar (Inside Bubble or Attached) */}
                        {(hasReactions || showPicker) && (
                            <Box
                                display="flex"
                                flexWrap="wrap"
                                gap={0.5}
                                mt={1}
                                pt={1}
                                borderTop={1}
                                borderColor="divider"
                            >
                                {Object.entries(reactions).map(([emoji, userIds]) => {
                                    const hasReacted = userIds.includes(String(user?.id));
                                    return (
                                        <Chip
                                            key={emoji}
                                            label={`${emoji} ${userIds.length} `}
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReactionClick(emoji);
                                            }}
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                bgcolor: hasReacted ? 'primary.main' : 'rgba(0,0,0,0.05)',
                                                color: hasReacted ? 'white' : 'text.primary',
                                                '&:hover': {
                                                    bgcolor: hasReacted ? 'primary.dark' : 'rgba(0,0,0,0.1)'
                                                },
                                                transition: 'all 0.2s',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    );
                                })}

                                {/* Add Reaction Button (Small) */}
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openPicker(e);
                                    }}
                                    sx={{
                                        width: 20,
                                        height: 20,
                                        bgcolor: 'rgba(0,0,0,0.05)',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                                    }}
                                >
                                    <Plus size={12} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>

                    {/* Quick Action Buttons (Visible on Hover) */}
                    <Box
                        sx={{
                            opacity: isHovered || Boolean(anchorEl) ? 1 : 0,
                            transition: 'opacity 0.2s',
                            mt: 0.5,
                            display: 'flex',
                            gap: 0.5,
                            visibility: isHovered || Boolean(anchorEl) ? 'visible' : 'hidden'
                        }}
                    >
                        <Tooltip title="Reply">
                            <IconButton size="small" onClick={() => onReply?.(message)}>
                                <Reply size={16} />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Add Reaction">
                            <IconButton size="small" onClick={openPicker}>
                                <Smile size={16} />
                            </IconButton>
                        </Tooltip>

                        <IconButton size="small" onClick={handleMenuOpen}>
                            <MoreVertical size={16} />
                        </IconButton>
                    </Box>
                </Box>
            </Box>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: { minWidth: 150 }
                }}
            >
                <MenuItem onClick={() => {
                    handleMenuClose();
                    onReply?.(message);
                }}>
                    <Reply size={16} style={{ marginRight: 8 }} /> Reply
                </MenuItem>
                <MenuItem onClick={handleMenuClose} disabled>
                    <Forward size={16} style={{ marginRight: 8 }} /> Forward (Soon)
                </MenuItem>
                {isOwnMessage && [
                    <MenuItem key="edit" onClick={() => {
                        handleMenuClose();
                        onEdit?.(message.id!, message.message);
                    }}>
                        <Edit2 size={16} style={{ marginRight: 8 }} /> Edit
                    </MenuItem>,
                    <MenuItem key="delete" onClick={() => {
                        handleMenuClose();
                        onDelete?.(message.id!);
                    }} sx={{ color: 'error.main' }}>
                        <Trash2 size={16} style={{ marginRight: 8 }} /> Delete
                    </MenuItem>
                ]}
            </Menu>

            {/* Emoji Picker Portal */}
            {showPicker && createPortal(
                <>
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 9998
                        }}
                        onClick={() => setShowPicker(false)}
                    />
                    <Box
                        sx={{
                            position: 'fixed',
                            top: pickerPosition.top,
                            left: pickerPosition.left,
                            zIndex: 9999,
                            boxShadow: 24,
                            borderRadius: 4,
                            bgcolor: 'background.paper'
                        }}
                    >
                        <Picker
                            data={data}
                            onEmojiSelect={handleEmojiSelect}
                            theme="auto"
                        />
                    </Box>
                </>,
                document.body
            )}
        </Box>
    );
}
