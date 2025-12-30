import { useState, useRef, useCallback, useEffect } from 'react';
import { getICEServers, type CallSession } from '../api/rooms';

// Peer connection configuration
interface PeerConnection {
    pc: RTCPeerConnection;
    userId: string;
    username: string;
    stream?: MediaStream;
}

// WebRTC signaling message types (from WebSocket)
interface WebRTCOffer {
    type: 'webrtc_offer';
    from_user_id: string;
    from_username: string;
    offer: RTCSessionDescriptionInit;
    room_id: string;
}

interface WebRTCAnswer {
    type: 'webrtc_answer';
    from_user_id: string;
    from_username: string;
    answer: RTCSessionDescriptionInit;
    room_id: string;
}

interface ICECandidateMessage {
    type: 'ice_candidate';
    from_user_id: string;
    from_username: string;
    candidate: RTCIceCandidateInit | null;
    room_id: string;
}

interface CallMediaToggle {
    type: 'call_media_toggle';
    user_id: string;
    username: string;
    media_type: 'audio' | 'video' | 'screen';
    enabled: boolean;
}

interface CallParticipantJoined {
    type: 'call_participant_joined';
    call_id: string;
    user_id: string;
    username: string;
    is_audio_enabled: boolean;
    is_video_enabled: boolean;
}

interface CallParticipantLeft {
    type: 'call_participant_left';
    call_id: string;
    user_id: string;
    username: string;
}

interface CallStarted {
    type: 'call_started';
    call_id: string;
    call_type: 'audio' | 'video';
    initiated_by: string;
    initiated_by_id: string;
}

interface CallEnded {
    type: 'call_ended';
    call_id: string;
    reason: string;
    ended_by?: string;
}

export type WebRTCMessage =
    | WebRTCOffer
    | WebRTCAnswer
    | ICECandidateMessage
    | CallMediaToggle
    | CallParticipantJoined
    | CallParticipantLeft
    | CallStarted
    | CallEnded;

export interface RemoteStream {
    odID: string;
    username: string;
    stream: MediaStream;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
}

interface UseWebRTCOptions {
    roomId: string;
    userId: string;
    username: string;
    sendSignal: (data: object) => void; // Function to send via WebSocket
}

export const useWebRTC = ({ roomId, userId, username, sendSignal }: UseWebRTCOptions) => {
    // State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
    const [isInCall, setIsInCall] = useState(false);
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Media states
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Refs
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
    const iceServersRef = useRef<RTCIceServer[]>([]);

    // Initialize ICE servers on mount
    useEffect(() => {
        getICEServers()
            .then(config => {
                iceServersRef.current = config.iceServers;
            })
            .catch(err => {
                console.warn('Failed to fetch turn servers, using google stun:', err);
                iceServersRef.current = [{ urls: 'stun:stun.l.google.com:19302' }];
            });
    }, []);

    // Create RTCPeerConnection for a user
    const createPeerConnection = useCallback((targetUserId: string, targetUsername: string): RTCPeerConnection => {
        const config: RTCConfiguration = {
            iceServers: iceServersRef.current.length > 0
                ? iceServersRef.current
                : [{ urls: 'stun:stun.l.google.com:19302' }],
            iceCandidatePoolSize: 10,
        };

        const pc = new RTCPeerConnection(config);

        // Add local tracks to connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({
                    type: 'ice_candidate',
                    target_user_id: targetUserId,
                    candidate: event.candidate.toJSON(),
                });
            }
        };

        // ICE connection state (actual connection status)
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.warn(`Connection with ${targetUsername} ${pc.iceConnectionState}`);
            }
        };

        // Handle incoming tracks (remote video/audio)
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (remoteStream) {
                setRemoteStreams(prev => {
                    const updated = new Map(prev);
                    const existingEntry = prev.get(targetUserId);
                    const videoTracks = remoteStream.getVideoTracks();

                    updated.set(targetUserId, {
                        odID: targetUserId,
                        username: targetUsername,
                        stream: remoteStream,
                        isAudioEnabled: existingEntry?.isAudioEnabled ?? true,
                        isVideoEnabled: videoTracks.length > 0 && videoTracks[0].enabled,
                        isScreenSharing: existingEntry?.isScreenSharing ?? false,
                    });

                    return updated;
                });
            }
        };

        // Store the connection
        peerConnectionsRef.current.set(targetUserId, {
            pc,
            userId: targetUserId,
            username: targetUsername,
        });

        return pc;
    }, [sendSignal]);

    // Get user media (camera/mic)
    const getUserMedia = useCallback(async (video: boolean = true): Promise<MediaStream> => {
        const constraints = {
            audio: true,
            video: video ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
            } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
    }, []);

    // Start a call
    const startCall = useCallback(async (_callType: 'audio' | 'video' = 'video') => {
        try {
            setError(null);

            // Always start with audio only (no video access until user enables it)
            const stream = await getUserMedia(false);
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Disable audio by default too
            stream.getAudioTracks().forEach(track => { track.enabled = false; });

            setIsVideoEnabled(false);
            setIsAudioEnabled(false);
            setIsInCall(true);

            return true;
        } catch (err: any) {
            setError(err.message || 'Failed to start call');
            return false;
        }
    }, [getUserMedia]);

    // Create WebRTC Offer
    const createOffer = useCallback(async (targetUserId: string, targetUsername: string) => {
        const pc = createPeerConnection(targetUserId, targetUsername);

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendSignal({
                type: 'webrtc_offer',
                target_user_id: targetUserId,
                offer: pc.localDescription,
            });
        } catch (err) {
            console.error('Failed to create offer:', err);
        }
    }, [createPeerConnection, sendSignal]);

    // Handle incoming offer
    const handleOffer = useCallback(async (data: WebRTCOffer) => {
        if (!isInCall) return;

        const { from_user_id, from_username, offer } = data;

        // Check if we already have a connection
        let peerConn = peerConnectionsRef.current.get(from_user_id);
        let pc: RTCPeerConnection;

        if (peerConn) {
            pc = peerConn.pc;
        } else {
            pc = createPeerConnection(from_user_id, from_username);
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignal({
                type: 'webrtc_answer',
                target_user_id: from_user_id,
                answer: pc.localDescription,
            });
        } catch (err) {
            console.error('Failed to handle offer:', err);
        }
    }, [isInCall, createPeerConnection, sendSignal]);

    // Handle incoming answer
    const handleAnswer = useCallback(async (data: WebRTCAnswer) => {
        const { from_user_id, answer } = data;

        const peerConn = peerConnectionsRef.current.get(from_user_id);
        if (peerConn) {
            try {
                await peerConn.pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error('Failed to set remote description:', err);
            }
        }
    }, []);

    // Handle incoming ICE candidate
    const handleICECandidate = useCallback(async (data: ICECandidateMessage) => {
        const { from_user_id, candidate } = data;

        const peerConn = peerConnectionsRef.current.get(from_user_id);
        if (peerConn && candidate) {
            try {
                await peerConn.pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Failed to add ICE candidate:', err);
            }
        }
    }, []);

    // Handle participant joined
    const handleParticipantJoined = useCallback(async (data: CallParticipantJoined) => {
        if (!isInCall || data.user_id === userId) return;

        // Create offer to the new participant
        await createOffer(data.user_id, data.username);
    }, [isInCall, userId, createOffer]);

    // Handle participant left
    const handleParticipantLeft = useCallback((data: CallParticipantLeft) => {
        const { user_id } = data;

        // Close peer connection
        const peerConn = peerConnectionsRef.current.get(user_id);
        if (peerConn) {
            peerConn.pc.close();
            peerConnectionsRef.current.delete(user_id);
        }

        // Remove remote stream
        setRemoteStreams(prev => {
            const updated = new Map(prev);
            updated.delete(user_id);
            return updated;
        });
    }, []);

    // Handle media toggle from other participants
    const handleMediaToggle = useCallback((data: CallMediaToggle) => {
        const { user_id, media_type, enabled } = data;

        setRemoteStreams(prev => {
            const updated = new Map(prev);
            const stream = updated.get(user_id);
            if (stream) {
                updated.set(user_id, {
                    ...stream,
                    isAudioEnabled: media_type === 'audio' ? enabled : stream.isAudioEnabled,
                    isVideoEnabled: media_type === 'video' ? enabled : stream.isVideoEnabled,
                    isScreenSharing: media_type === 'screen' ? enabled : stream.isScreenSharing,
                });
            }
            return updated;
        });
    }, []);

    // Handle call started notification
    const handleCallStarted = useCallback((data: CallStarted) => {
        // Just note that another user started a call - update UI to show join button
        setActiveCall(prev => prev ? prev : {
            id: data.call_id,
            room: roomId,
            call_type: data.call_type,
            status: 'active',
            initiated_by: data.initiated_by_id,
            initiated_by_username: data.initiated_by,
            started_at: new Date().toISOString(),
            ended_at: null,
            duration_seconds: 0,
            max_participants: 10,
            participant_count: 1,
            participants: [],
            files: []
        });
    }, [roomId]);

    // Handle call ended notification
    const handleCallEnded = useCallback((_data: CallEnded) => {
        if (isInCall) {
            leaveCall();
        }
        setActiveCall(null);
    }, [isInCall]);

    // Helper to process incoming WebRTC messages (called from useWebSocket)
    const handleSignalingMessage = useCallback((message: WebRTCMessage) => {
        switch (message.type) {
            case 'webrtc_offer':
                handleOffer(message);
                break;
            case 'webrtc_answer':
                handleAnswer(message);
                break;
            case 'ice_candidate':
                handleICECandidate(message);
                break;
            case 'call_participant_joined':
                handleParticipantJoined(message);
                break;
            case 'call_participant_left':
                handleParticipantLeft(message);
                break;
            case 'call_media_toggle':
                handleMediaToggle(message);
                break;
            case 'call_started':
                handleCallStarted(message);
                break;
            case 'call_ended':
                handleCallEnded(message);
                break;
        }
    }, [handleOffer, handleAnswer, handleICECandidate, handleParticipantJoined, handleParticipantLeft, handleMediaToggle, handleCallStarted, handleCallEnded]);

    // Toggle audio
    const toggleAudio = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
                sendSignal({
                    type: 'call_toggle_audio',
                    enabled: audioTrack.enabled,
                });
            }
        }
    }, [sendSignal]);

    // Toggle video - requests camera access on first enable
    const toggleVideo = useCallback(async () => {
        if (!localStreamRef.current) return;

        const existingVideoTrack = localStreamRef.current.getVideoTracks()[0];

        if (existingVideoTrack) {
            // Toggle existing track
            existingVideoTrack.enabled = !existingVideoTrack.enabled;
            setIsVideoEnabled(existingVideoTrack.enabled);
            sendSignal({
                type: 'call_toggle_video',
                enabled: existingVideoTrack.enabled,
            });
        } else {
            // No video track - request camera access for the first time
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    }
                });

                const newVideoTrack = videoStream.getVideoTracks()[0];
                if (newVideoTrack && localStreamRef.current) {
                    // Add to local stream
                    localStreamRef.current.addTrack(newVideoTrack);

                    // Create new stream with all tracks to trigger React re-render
                    const updatedStream = new MediaStream(localStreamRef.current.getTracks());
                    localStreamRef.current = updatedStream;
                    setLocalStream(updatedStream);

                    // Add to all peer connections and RENEGOTIATE
                    for (const [peerId, { pc }] of peerConnectionsRef.current.entries()) {
                        try {
                            // Add the new video track
                            pc.addTrack(newVideoTrack, updatedStream);

                            // Create new offer to renegotiate
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);

                            // Send offer to peer
                            sendSignal({
                                type: 'webrtc_offer',
                                target_user_id: peerId,
                                offer: pc.localDescription,
                            });
                        } catch (err) {
                            console.error(`Failed to renegotiate with ${peerId}:`, err);
                        }
                    }

                    setIsVideoEnabled(true);
                    sendSignal({
                        type: 'call_toggle_video',
                        enabled: true,
                    });
                }
            } catch (err) {
                console.error('Failed to get video:', err);
            }
        }
    }, [sendSignal]);

    // Toggle screen sharing
    const toggleScreenShare = useCallback(async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }

            // Replace screen track with camera track in all connections
            if (localStreamRef.current) {
                const videoTrack = localStreamRef.current.getVideoTracks()[0];
                peerConnectionsRef.current.forEach(({ pc }) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender && videoTrack) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }

            setIsScreenSharing(false);
            sendSignal({ type: 'call_toggle_screen', enabled: false });
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });

                screenStreamRef.current = screenStream;

                const screenTrack = screenStream.getVideoTracks()[0];

                // Replace camera track with screen track in all connections
                peerConnectionsRef.current.forEach(({ pc }) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                // Listen for user stopping sharing via browser UI
                screenTrack.onended = () => {
                    toggleScreenShare(); // Toggle off
                };

                setIsScreenSharing(true);
                sendSignal({ type: 'call_toggle_screen', enabled: true });
            } catch (err) {
                console.error('Failed to get display media:', err);
            }
        }
    }, [isScreenSharing, sendSignal]);

    // Leave call
    const leaveCall = useCallback(() => {
        // Stop all tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
        }

        // Close all peer connections
        peerConnectionsRef.current.forEach(({ pc }) => pc.close());
        peerConnectionsRef.current.clear();

        setLocalStream(null);
        setRemoteStreams(new Map());
        setIsInCall(false);
        setIsAudioEnabled(false);
        setIsVideoEnabled(false);
        setIsScreenSharing(false);
        setActiveCall(null);

        // Notify server
        sendSignal({ type: 'call_left' });
    }, [sendSignal]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
            peerConnectionsRef.current.forEach(({ pc }) => pc.close());
        };
    }, []);

    return {
        localStream,
        remoteStreams: Array.from(remoteStreams.values()),
        isInCall,
        activeCall,
        error,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        startCall,
        leaveCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
        handleSignalingMessage,
    };
};
