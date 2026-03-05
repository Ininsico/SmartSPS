import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import Pusher from 'pusher-js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Silence Third-party SDK logs
AgoraRTC.setLogLevel(4); // 4 = NONE in some versions, but to be sure we often use the explicit method if available
Pusher.logToConsole = false;
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from './AuthContext';
import { cn } from './utils';

// Modular Components
import UserTile, { RemoteVideoPlayer, ScreenSharePlayer } from './components/MeetingRoom/UserTile';
import FloatingReaction from './components/MeetingRoom/FloatingReaction';
import ChatPanel from './components/MeetingRoom/ChatPanel';
import InviteModal from './components/MeetingRoom/InviteModal';
import SelectionModal from './components/MeetingRoom/SelectionModal';
import MeetingFooter from './components/MeetingRoom/MeetingFooter';
import MeetingHeader from './components/MeetingRoom/MeetingHeader';
import BotHUD from './components/MeetingRoom/BotHUD';
import SummarySidebar from './components/MeetingRoom/SummarySidebar';
import NotesPanel from './components/MeetingRoom/NotesPanel';
import ParticipantsPanel from './components/MeetingRoom/ParticipantsPanel';
import { REACTIONS } from './components/MeetingRoom/Constants';
import { ScreenShare, Users, LogIn, LogOut, Info, AlertCircle, X, PhoneOff, Loader2 } from 'lucide-react';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const MeetingRoom = ({ roomId, onLeave, initialConfig, isHost: initialIsHost = false }) => {
    const { user, getToken } = useAuthContext();

    // UI State
    const [micOn, setMicOn] = useState(initialConfig?.micOn ?? true);
    const [videoOn, setVideoOn] = useState(initialConfig?.videoOn ?? true);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [peerStates, setPeerStates] = useState({});
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [panel, setPanel] = useState(null);
    const panelRef = useRef(null);
    const [unread, setUnread] = useState(0);
    const [handRaised, setHandRaised] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [activeSpeaker, setActiveSpeaker] = useState(null);
    const [endMessage, setEndMessage] = useState(null);
    const [adminMuted, setAdminMuted] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showReacts, setShowReacts] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [personalNotes, setPersonalNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [screenTrackState, setScreenTrackState] = useState(null); // mirrors screenTrack ref for rendering

    // Save Notes Debounce
    const notesTimeout = useRef(null);

    // --- State Ref to fix stale closures in callbacks ---
    const stateRef = useRef({ micOn, handRaised, adminMuted, isSharing });
    useEffect(() => {
        stateRef.current = { micOn, handRaised, adminMuted, isSharing };
    }, [micOn, handRaised, adminMuted, isSharing]);
    useEffect(() => {
        if (panel === 'notes') {
            if (notesTimeout.current) clearTimeout(notesTimeout.current);
            notesTimeout.current = setTimeout(async () => {
                setIsSavingNotes(true);
                const token = await getToken();
                fetch(`${import.meta.env.VITE_API_URL}/meetings/notes/${roomId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        'x-user-name': user?.name || 'User',
                        'x-user-avatar': user?.avatar || ''
                    },
                    body: JSON.stringify({ content: personalNotes })
                }).finally(() => setIsSavingNotes(false));
            }, 1000);
        }
        return () => { if (notesTimeout.current) clearTimeout(notesTimeout.current); };
    }, [personalNotes, roomId]);

    // Fetch notes on load
    useEffect(() => {
        const fetchNotes = async () => {
            const token = await getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/meetings/notes/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPersonalNotes(data.content || '');
            }
        };
        fetchNotes();
    }, [roomId]);

    // Recording & AI State — Audio-only (for AI pipeline)
    const [isRecording, setIsRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [botRunning, setBotRunning] = useState(false);
    const [transcript, setTranscript] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);
    const [botPhase, setBotPhase] = useState('idle');
    const [phaseMsg, setPhaseMsg] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [summary, setSummary] = useState(null);

    // Screen+Audio Recording State — for Dashboard recordings section
    const [isScreenRecording, setIsScreenRecording] = useState(false);
    const [screenRecSeconds, setScreenRecSeconds] = useState(0);

    const addNotification = ({ type, title, message }) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };
    const [screenUploading, setScreenUploading] = useState(false);

    const [isHost, setIsHost] = useState(initialIsHost || sessionStorage.getItem(`host_${roomId}`) === 'true');

    // Refs — Audio-only AI recording
    const rtc = useRef(null);
    const localTracks = useRef({ audio: null, video: null });
    const screenTrack = useRef(null);
    const rtmReady = useRef(false);
    const mediaRecorder = useRef(null);
    const recChunks = useRef([]);
    const recTimer = useRef(null);
    const countdownRef = useRef(null);
    const audioContext = useRef(null);
    const recDestination = useRef(null);
    const connectedNodes = useRef({});
    // Refs — Screen+Audio dashboard recording
    const screenMediaRecorder = useRef(null);
    const screenRecChunks = useRef([]);
    const screenRecTimer = useRef(null);
    const screenRecSeconds_ref = useRef(0);
    const sessionID = useRef(`${user?.id || 'guest'}_${Math.floor(Math.random() * 100000)}`).current;
    const numericUid = useRef(Math.floor(Math.random() * 1000000)).current;



    // --- Helpers ---
    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const upsertUser = (id, part) => {
        const strId = String(id);
        const numId = Number(id);
        if (strId === String(user?.id) || (!isNaN(numId) && numId === numericUid)) return;

        setRemoteUsers(prev => {
            const idx = prev.findIndex(u =>
                String(u.id) === strId ||
                (u.agoraUid && Number(u.agoraUid) === numId)
            );

            if (idx > -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...part };
                return updated;
            }
            // Add new with default fallback ID if not yet established
            return [...prev, {
                id: strId,
                agoraUid: !isNaN(numId) ? numId : null,
                userName: '',
                userAvatar: '/defaultpic.png',
                videoTrack: null,
                audioTrack: null,
                ...part
            }];
        });
    };

    const mergeProfile = (uid, profile) => {
        const numId = Number(uid);
        const strId = String(uid);
        if (numId === numericUid || strId === String(user?.id)) return;

        setRemoteUsers(prev => {
            const idx = prev.findIndex(u =>
                Number(u.agoraUid) === numId || String(u.id) === strId
            );
            if (idx > -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...profile };
                return updated;
            }
            // DO NOT create new entries — mergeProfile only updates existing users
            return prev;
        });
    };

    const botFetch = async (path, opts = {}) => {
        const token = await getToken();
        return fetch(`${import.meta.env.VITE_API_URL}/vexa${path}`, {
            ...opts,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
        });
    };

    const clearCountdown = () => {
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };

    const startCountdown = (seconds, onDone) => {
        clearCountdown();
        setCountdown(seconds);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearCountdown(); onDone(); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const runSummarize = async (transcriptData) => {
        setBotPhase('summarizing');
        setPhaseMsg('Generating AI meeting summary…');
        try {
            const res = await botFetch('/summarize', {
                method: 'POST',
                body: JSON.stringify({
                    meetingId: roomId,
                    segments: transcriptData.segments || [],
                    participants: transcriptData.participants || [],
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
            }
        } catch (e) {
            console.error('Summary error:', e);
            setBotPhase('error');
            setPhaseMsg('AI Analysis failed.');
        }
        setBotPhase('done');
        setTimeout(() => setPhaseMsg(''), 3000);
        setShowTranscript(true);
    };

    const tryFetchTranscript = async () => {
        setBotPhase('fetching');
        const pollWait = 2000;

        const poll = async () => {
            try {
                const msgs = [
                    'Analyzing meeting dynamics...',
                    'Extracting key outcomes...',
                    'Identifying participant roles...',
                    'Cataloging action items...',
                    'Finalizing project documentation...'
                ];
                setPhaseMsg(msgs[Math.floor(Math.random() * msgs.length)]);

                const res = await botFetch(`/transcript/${roomId}`);
                if (res.status === 200) {
                    const data = await res.json();
                    if (data.segments?.length > 0) {
                        setTranscript(data);
                        if (data.summary?.overview) {
                            setSummary(data.summary);
                            setBotPhase('done');
                            setPhaseMsg('AI Meeting Notes Compiled.');
                            setShowTranscript(true);
                            setTimeout(() => setBotPhase('idle'), 3000);
                            return; // Stop polling
                        }
                        // Summary not ready yet, background task is running. 
                        // Just keep polling every 2s to catch it.
                    }
                }
                setTimeout(poll, pollWait);
            } catch (err) {
                setTimeout(poll, pollWait);
            }
        };
        poll();
    };

    const toggleBot = async () => {
        if (botPhase === 'summarizing' || botPhase === 'fetching') return;
        const lastRecUrl = localStorage.getItem(`last_rec_url_${roomId}`);
        if (!lastRecUrl) {
            setBotPhase('error');
            setPhaseMsg('Start recording first to get AI notes.');
            setTimeout(() => setBotPhase('idle'), 3000);
            return;
        }
        setBotPhase('starting');
        setPhaseMsg('Processing recording for AI notes…');
        try {
            const res = await botFetch('/start', {
                method: 'POST',
                body: JSON.stringify({ meetingId: roomId, recordingUrl: lastRecUrl })
            });
            if (!res.ok) throw new Error('Transcription failed to start');
            setBotRunning(true);
            setBotPhase('fetching');
            setPhaseMsg('Transcribing meeting…');
            await tryFetchTranscript();
        } catch (err) {
            setBotPhase('error');
            setPhaseMsg('Failed to process recording.');
            setTimeout(() => setBotPhase('idle'), 3000);
        }
    };

    // --- Communication ---
    const broadcastProfile = async () => {
        if (!rtmReady.current) return;
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/profile/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ uid: numericUid, name: user?.name || 'Guest', pic: user?.avatar })
        }).catch(() => { });
    };

    const syncState = async (state) => {
        const nextState = {
            muted: !stateRef.current.micOn,
            handRaised: stateRef.current.handRaised,
            adminMuted: stateRef.current.adminMuted,
            screenSharing: stateRef.current.isSharing,
            ...state
        };
        setPeerStates(p => ({ ...p, [numericUid]: nextState }));
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/state/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ uid: numericUid, state: nextState })
        }).catch(() => { });
    };

    const sendMsg = async (txt) => {
        if (!txt?.trim()) return;
        const msg = { senderName: user?.name || 'Guest', senderAvatar: user?.avatar, text: txt };
        setMessages(p => [...p, { id: Date.now(), from: user?.id || 'me', userName: msg.senderName, text: txt, userAvatar: msg.senderAvatar }]);
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/chat/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text: txt, senderName: msg.senderName, senderAvatar: msg.senderAvatar })
        }).catch(() => { });
    };

    const sendReact = async (key) => {
        const name = user?.fullName || user?.firstName || 'Guest';
        setReactions(p => [...p, { id: Date.now(), key, name: 'You' }]);
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/react/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key, name })
        }).catch(() => { });
    };

    // --- Control Handlers ---
    const toggleMic = async () => {
        if (stateRef.current.adminMuted) return;
        setMicOn(prev => {
            const next = !prev;
            if (localTracks.current.audio) {
                localTracks.current.audio.setEnabled(next).catch(e => console.error(e));
            }
            syncState({ muted: !next, handRaised: stateRef.current.handRaised, adminMuted: false });
            return next;
        });
    };

    const toggleVideo = async () => {
        setVideoOn(prev => {
            const next = !prev;
            if (localTracks.current.video) {
                localTracks.current.video.setEnabled(next).catch(e => console.error(e));
            }
            return next;
        });
    };

    const toggleHand = () => {
        setHandRaised(prev => {
            const next = !prev;
            syncState({ muted: !stateRef.current.micOn, handRaised: next, adminMuted: stateRef.current.adminMuted });
            return next;
        });
    };

    const forceMutePeer = async (targetUid) => {
        if (!isHost || !targetUid) {
            console.warn('[HOST] Cannot mute: ', { isHost, targetUid });
            return;
        }
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/admin-mute/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ targetUid, action: 'mute' })
        }).catch(() => { });
    };

    const forceUnmutePeer = async (targetUid) => {
        if (!isHost || !targetUid) return;
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/admin-mute/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ targetUid, action: 'unmute' })
        }).catch(() => { });
    };

    const handleLeave = async () => {
        if (isRecording) await stopRecording();
        if (botRunning) botFetch(`/stop/${roomId}`, { method: 'DELETE' }).catch(() => { });
        const token = await getToken();
        await fetch(`${import.meta.env.VITE_API_URL}/meetings/leave/${roomId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
        onLeave();
    };



    const handleEndMeeting = async () => {
        if (isRecording) {
            setPhaseMsg('Saving final recording...');
            await stopRecording();
        }
        try {
            const token = await getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/meetings/end/${roomId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) console.warn('[MEETING] End request returned status:', res.status);
        } catch (err) {
            console.error('[MEETING] End request failed:', err);
        }
        onLeave();
    };

    const stopShare = async () => {
        const track = screenTrack.current;
        screenTrack.current = null;
        setScreenTrackState(null);
        setIsSharing(false);
        syncState({ muted: !micOn, handRaised, screenSharing: false });
        if (track) {
            await rtc.current?.unpublish(track).catch(() => { });
            track.close();
        }
        if (localTracks.current.video && videoOn) await rtc.current?.publish(localTracks.current.video).catch(() => { });
    };

    const toggleShare = async () => {
        if (isSharing) { await stopShare(); return; }
        try {
            const result = await AgoraRTC.createScreenVideoTrack({ encoderConfig: '720p_1', optimizationMode: 'detail' }, 'disable');
            const track = Array.isArray(result) ? result[0] : result;
            if (localTracks.current.video) await rtc.current.unpublish(localTracks.current.video).catch(() => { });
            await rtc.current.publish(track);
            screenTrack.current = track;
            setScreenTrackState(track);
            setIsSharing(true);
            syncState({ muted: !micOn, handRaised, screenSharing: true });
            track.on('track-ended', () => stopShare());
        } catch (err) { setIsSharing(false); }
    };

    // --- Agora Logic ---
    useEffect(() => {
        if (!APP_ID) return;
        let isMounted = true;
        let pusherInstance = null;
        let channel = null;

        const init = async () => {
            try {
                rtc.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                rtc.current.enableAudioVolumeIndicator();

                // Setup Pusher - ONLY if keys are present
                const pKey = import.meta.env.VITE_PUSHER_KEY;
                const pCluster = import.meta.env.VITE_PUSHER_CLUSTER;

                if (pKey && pCluster) {
                    pusherInstance = new Pusher(pKey, {
                        cluster: pCluster,
                        encrypted: true
                    });
                    channel = pusherInstance.subscribe(`room-${roomId}`);

                    channel.bind('chat-message', (data) => {
                        if (!isMounted) return;
                        if (String(data.senderId) !== String(user?.id)) {
                            setMessages(p => {
                                const exists = p.some(m => m.timestamp === data.timestamp || (m.text === data.text && m.from === data.senderId));
                                if (exists) return p;
                                return [...p, { id: Date.now(), from: data.senderId, userName: data.senderName, text: data.text, userAvatar: data.senderAvatar }];
                            });
                            if (panelRef.current !== 'chat') setUnread(v => v + 1);
                        }
                    });

                    channel.bind('react', (data) => {
                        if (!isMounted) return;
                        setReactions(p => [...p, { id: Date.now(), key: data.key, name: data.name }]);
                    });

                    channel.bind('profile', (data) => {
                        if (!isMounted) return;
                        mergeProfile(data.uid, { userName: data.name, userAvatar: data.pic });
                    });

                    channel.bind('state', (data) => {
                        if (!isMounted) return;
                        if (String(data.uid) !== String(numericUid)) {
                            setPeerStates(p => ({ ...p, [data.uid]: data.state }));
                        }
                    });

                    channel.bind('admin-mute', (data) => {
                        if (!isMounted) return;
                        if (Number(data.targetUid) === numericUid) {
                            const shouldMute = data.action === 'mute';
                            setAdminMuted(shouldMute);
                            if (shouldMute) {
                                setMicOn(false);
                                localTracks.current.audio?.setEnabled(false);
                                syncState({ muted: true, handRaised: stateRef.current.handRaised, adminMuted: true });
                                addNotification({ type: 'alert', title: 'Admin Muted You', message: 'You have been muted by a host.' });
                            } else {
                                syncState({ muted: !stateRef.current.micOn, handRaised: stateRef.current.handRaised, adminMuted: false });
                            }
                        }
                    });

                    channel.bind('meeting-ended', () => {
                        if (!isMounted) return;
                        setEndMessage("Host terminated the session.");
                        setTimeout(() => handleLeave(), 2500);
                    });

                    channel.bind('user-joined', (data) => {
                        if (!isMounted) return;
                        if (String(data.userId) === String(user?.id)) return;
                        addNotification({ type: 'join', title: 'Participant Joined', message: `${data.userName} entered the room.` });
                    });

                    channel.bind('user-left', (data) => {
                        if (!isMounted) return;
                        if (String(data.userId) === String(user?.id)) return;
                        addNotification({ type: 'leave', title: 'Participant Left', message: `${data.userName} left the meeting.` });
                    });
                } else {
                    console.log('[CHAT] Pusher keys missing, using polling fallback');
                }

                rtc.current.on('user-published', async (u, type) => {
                    if (!isMounted) return;
                    await rtc.current.subscribe(u, type);
                    upsertUser(u.uid, { [type === 'video' ? 'videoTrack' : 'audioTrack']: u[type === 'video' ? 'videoTrack' : 'audioTrack'] });
                    if (type === 'audio') {
                        u.audioTrack.play();
                        broadcastProfile();
                        if (audioContext.current && recDestination.current && u.audioTrack) {
                            try {
                                const ms = u.audioTrack.getMediaStreamTrack();
                                if (ms) {
                                    const src = audioContext.current.createMediaStreamSource(new MediaStream([ms]));
                                    src.connect(recDestination.current);
                                    connectedNodes.current[u.uid] = src;
                                }
                            } catch (e) { }
                        }
                    }
                });

                rtc.current.on('user-unpublished', (u, type) => {
                    if (!isMounted) return;
                    upsertUser(u.uid, { [type === 'video' ? 'videoTrack' : 'audioTrack']: null });
                    if (type === 'audio' && connectedNodes.current[u.uid]) {
                        try { connectedNodes.current[u.uid].disconnect(); } catch (e) { }
                        delete connectedNodes.current[u.uid];
                    }
                });

                rtc.current.on('user-left', (u) => {
                    const leaveUid = Number(u.uid);
                    setRemoteUsers(prev => prev.filter(x =>
                        String(x.id) !== String(leaveUid) &&
                        Number(x.agoraUid) !== leaveUid
                    ));
                });

                rtc.current.on('volume-indicator', (volumes) => {
                    const highest = volumes.reduce((prev, curr) => (prev.level > curr.level) ? prev : curr, { uid: 0, level: 0 });
                    if (highest.level > 10) setActiveSpeaker(highest.uid === numericUid ? 'me' : highest.uid);
                    else setActiveSpeaker(null);
                });
                await rtc.current.join(APP_ID, roomId, null, numericUid);
                const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();

                localTracks.current = { audio, video };
                await rtc.current.publish([audio, video]);
                const token = await getToken();
                const res = await fetch(`${import.meta.env.VITE_API_URL}/meetings/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-session-id': sessionID },
                    body: JSON.stringify({ roomId: roomId.trim(), userName: user?.name, userAvatar: user?.avatar, agoraUid: numericUid }),
                });

                if (!res.ok) {
                    const errData = await res.json();
                    alert(errData.error || 'Failed to join meeting');
                    onLeave();
                    return;
                }

                const joinData = await res.json();
                if (joinData.isHost) {
                    setIsHost(true);
                    sessionStorage.setItem(`host_${roomId}`, 'true');
                }

                if (joinData.meeting?.chat) {
                    setMessages(joinData.meeting.chat.map(m => ({ id: m._id, from: m.senderId, userName: m.senderName, text: m.text, userAvatar: m.senderAvatar, timestamp: m.timestamp })));
                }

                if (joinData.meeting?.participants) {
                    const others = joinData.meeting.participants.filter(p => p.isActive && String(p.userId) !== String(user?.id));
                    setRemoteUsers(prev => {
                        const next = [...prev];
                        others.forEach(o => {
                            const dbUid = o.agoraUid ? Number(o.agoraUid) : null;
                            const exists = next.findIndex(p =>
                                String(p.id) === String(o.userId) ||
                                (dbUid && Number(p.agoraUid) === dbUid)
                            );
                            if (exists === -1) {
                                next.push({ id: o.userId, agoraUid: dbUid, userName: o.name, userAvatar: o.avatar, videoTrack: null, audioTrack: null });
                            } else {
                                next[exists] = { ...next[exists], id: o.userId, agoraUid: dbUid, userName: o.name, userAvatar: o.avatar };
                            }
                        });
                        // Deduplicate by Clerk ID
                        const seen = new Set();
                        return next.filter(u => {
                            const key = u.id;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });
                    });
                }

                // Apply pre-join mic/camera state AFTER the DB write — do NOT await setEnabled,
                // Agora's internal mutex may not be ready immediately after publish
                try { if (!micOn) audio.setEnabled(false); } catch (_) { }
                try { if (!videoOn) video.setEnabled(false); } catch (_) { }

                rtmReady.current = true;
                broadcastProfile();
                const t = setInterval(() => { if (isMounted) broadcastProfile(); }, 10000);

                return () => {
                    clearInterval(t);
                    if (rtc.current) rtc.current.leave();
                    if (pusherInstance) pusherInstance.disconnect();
                };

            } catch (e) { console.error("Agora/Pusher Init Error", e); }
        };

        const initPromise = init();
        return () => {
            isMounted = false;
            initPromise.then(fn => fn && fn());
            if (localTracks.current.audio) localTracks.current.audio.close();
            if (localTracks.current.video) localTracks.current.video.close();
        };
    }, [roomId]);

    // --- Communication Fallback ---
    useEffect(() => {
        const pKey = import.meta.env.VITE_PUSHER_KEY;
        const poll = async () => {
            try {
                const token = await getToken();
                // Chat Polling
                const chatRes = await fetch(`${import.meta.env.VITE_API_URL}/meetings/chat/${roomId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (chatRes.ok) {
                    const dbMessages = await chatRes.json();
                    setMessages(p => {
                        const newMsgs = dbMessages.filter(db => !p.some(local =>
                            (local.text === db.text && (String(local.from) === String(db.senderId) || local.from === 'me'))
                        ));
                        if (newMsgs.length > 0) {
                            if (panelRef.current !== 'chat') setUnread(v => v + newMsgs.length);
                            return [...p, ...newMsgs.map(m => ({ id: m._id || Date.now() + Math.random(), from: m.senderId, userName: m.senderName, text: m.text, userAvatar: m.senderAvatar }))];
                        }
                        return p;
                    });
                }

                // Participant Polling
                const partRes = await fetch(`${import.meta.env.VITE_API_URL}/meetings/participants/${roomId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (partRes.ok) {
                    const dbParts = await partRes.json();
                    const activeOthers = dbParts.filter(p => p.isActive && String(p.userId) !== String(user?.id));
                    setRemoteUsers(prev => {
                        let changed = false;
                        const next = [...prev];
                        activeOthers.forEach(db => {
                            const dbUid = db.agoraUid ? Number(db.agoraUid) : null;
                            const dbClerkId = String(db.userId);

                            const idx = next.findIndex(n =>
                                String(n.id) === dbClerkId ||
                                (dbUid && Number(n.agoraUid) === dbUid)
                            );

                            if (idx === -1) {
                                next.push({
                                    id: dbClerkId,
                                    agoraUid: dbUid,
                                    userName: db.name,
                                    userAvatar: db.avatar,
                                    videoTrack: null,
                                    audioTrack: null
                                });
                                changed = true;
                            } else {
                                // Update existing but favor Clerk ID as the primary key
                                if (String(next[idx].id) !== dbClerkId ||
                                    (dbUid && Number(next[idx].agoraUid) !== dbUid)) {
                                    next[idx] = {
                                        ...next[idx],
                                        id: dbClerkId,
                                        agoraUid: dbUid,
                                        userName: db.name,
                                        userAvatar: db.avatar
                                    };
                                    changed = true;
                                }
                            }
                        });

                        // Cleanup and strict deduplication
                        const filtered = next.filter(n =>
                            activeOthers.some(o =>
                                String(o.userId) === String(n.id) ||
                                (n.agoraUid && o.agoraUid && Number(o.agoraUid) === Number(n.agoraUid))
                            )
                        );

                        const seen = new Set();
                        const final = [];
                        filtered.forEach(item => {
                            const key = item.id || `agora-${item.agoraUid}`;
                            if (!seen.has(key)) {
                                final.push(item);
                                seen.add(key);
                            }
                        });

                        if (final.length !== prev.length) return final;
                        return changed ? final : prev;
                    });
                }
            } catch (err) { }
        };

        const t = setInterval(poll, pKey ? 10000 : 3000);
        return () => clearInterval(t);
    }, [roomId]);

    useEffect(() => { panelRef.current = panel; }, [panel]);
    useEffect(() => { window.__getClerkToken = getToken; }, [getToken]);

    const triggerAI = async (recordingUrl) => {
        localStorage.setItem(`last_rec_url_${roomId}`, recordingUrl);
        setBotPhase('starting');
        setPhaseMsg('Sending to AI for transcription…');
        try {
            const res = await botFetch('/start', {
                method: 'POST',
                body: JSON.stringify({ meetingId: roomId, recordingUrl })
            });
            if (!res.ok) throw new Error('Transcription failed to start');
            setBotRunning(true);
            setBotPhase('fetching');
            setPhaseMsg('Transcribing meeting…');
            await tryFetchTranscript();
        } catch (err) {
            setBotPhase('error');
            setPhaseMsg(`AI failed: ${err.message}`);
            setTimeout(() => setBotPhase('idle'), 5000);
        }
    };

    const uploadRecording = async (blob) => {
        if (!blob || blob.size === 0) {
            setPhaseMsg('Recording was empty. Try again.');
            setTimeout(() => setBotPhase('idle'), 4000);
            return;
        }

        setUploading(true);
        setBotPhase('starting');
        setPhaseMsg('Uploading recording…');

        try {
            const mimeType = blob.type || 'audio/webm';
            let ext = 'webm';
            if (mimeType.includes('mp4')) ext = 'mp4';
            else if (mimeType.includes('ogg')) ext = 'ogg';

            const filename = `rec_${roomId}_${Date.now()}.${ext}`;
            const title = `Meeting ${roomId.toUpperCase()} — ${new Date().toLocaleDateString()}`;

            const token = await getToken();
            const form = new FormData();
            form.append('file', blob, filename);
            form.append('roomId', roomId);
            form.append('title', title);
            form.append('duration', String(recSeconds));

            const res = await fetch(`${import.meta.env.VITE_API_URL}/recordings/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });

            const data = await res.json();

            if (!res.ok || !data.url) {
                throw new Error(data.error || 'Upload failed');
            }
            await triggerAI(data.url);

        } catch (err) {
            setBotPhase('error');
            setPhaseMsg(`Upload failed: ${err.message}`);
            setTimeout(() => setBotPhase('idle'), 5000);
        } finally {
            setUploading(false);
            recChunks.current = [];
        }
    };

    // Upload screen recording to dashboard (no AI)
    const uploadScreenRecording = async (blob) => {
        if (!blob || blob.size === 0) return;
        setScreenUploading(true);
        try {
            const mimeType = blob.type || 'video/webm';
            let ext = 'webm';
            if (mimeType.includes('mp4')) ext = 'mp4';

            const filename = `screen_${roomId}_${Date.now()}.${ext}`;
            const title = `📹 ${roomId.toUpperCase()} Screen — ${new Date().toLocaleDateString()}`;

            const token = await getToken();
            const form = new FormData();
            form.append('file', blob, filename);
            form.append('roomId', roomId);
            form.append('title', title);
            form.append('duration', String(screenRecSeconds_ref.current));

            const res = await fetch(`${import.meta.env.VITE_API_URL}/recordings/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });

            if (!res.ok) throw new Error('Screen recording upload failed');
        } catch (err) {
            console.error('[SCREEN-REC] Upload error:', err.message);
        } finally {
            setScreenUploading(false);
            screenRecChunks.current = [];
        }
    };

    const startRecording = async () => {
        try {
            // === Web Audio API approach: capture ALL Agora audio directly ===
            // This ensures Gladia gets every voice in the meeting.

            const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const destination = ctx.createMediaStreamDestination();
            audioContext.current = ctx;
            recDestination.current = destination;
            connectedNodes.current = {};

            // 1. Wire in LOCAL microphone track
            const localAudioTrack = localTracks.current.audio;
            if (localAudioTrack) {
                try {
                    const micMs = localAudioTrack.getMediaStreamTrack();
                    if (micMs) {
                        const localSrc = ctx.createMediaStreamSource(new MediaStream([micMs]));
                        localSrc.connect(destination);
                        connectedNodes.current['__local'] = localSrc;
                    }
                } catch (e) { }
            }

            // 2. Wire in ALL current remote audio tracks
            const currentRemotes = rtc.current?.remoteUsers || [];
            for (const u of currentRemotes) {
                if (u.audioTrack) {
                    try {
                        const ms = u.audioTrack.getMediaStreamTrack();
                        if (ms) {
                            const src = ctx.createMediaStreamSource(new MediaStream([ms]));
                            src.connect(destination);
                            connectedNodes.current[u.uid] = src;
                        }
                    } catch (e) { }
                }
            }

            // 3. The destination.stream only has audio — that's perfect for Gladia
            const audioOnlyStream = destination.stream;
            console.log('[REC] Audio tracks in stream:', audioOnlyStream.getAudioTracks().length);

            recChunks.current = [];

            // Pick best supported codec (prefer opus for audio quality)
            const codecs = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                ''
            ];
            const mimeType = codecs.find(c => c === '' || MediaRecorder.isTypeSupported(c)) || '';
            const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 };

            mediaRecorder.current = new MediaRecorder(audioOnlyStream, options);
            window.__recordedMimeType = mediaRecorder.current.mimeType;

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                // Handled in stopRecording wrapper now
            };

            mediaRecorder.current.start(1000);
            setIsRecording(true);
            setRecSeconds(0);
            recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000);

        } catch (err) {
            console.error('[REC] startRecording error:', err.name, err.message);
        }
    };

    // We'll use this ref to wait for uploads at checkout
    const stopRecordingPromise = useRef(null);

    const stopRecording = () => {
        if (!isRecording) return Promise.resolve();

        // Return existing promise if we're already stopping
        if (stopRecordingPromise.current) return stopRecordingPromise.current;

        stopRecordingPromise.current = new Promise((resolve) => {
            clearInterval(recTimer.current);
            setIsRecording(false);

            if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                // The onstop handler will call uploadRecording which will eventually resolve this promise
                mediaRecorder.current.onstop = async () => {
                    // Close audio context
                    if (audioContext.current) {
                        try { await audioContext.current.close(); } catch (e) { }
                        audioContext.current = null;
                        recDestination.current = null;
                        connectedNodes.current = {};
                    }
                    const blob = new Blob(recChunks.current, { type: window.__recordedMimeType || 'audio/webm' });
                    await uploadRecording(blob);
                    resolve();
                    stopRecordingPromise.current = null;
                };
                mediaRecorder.current.stop();
            } else {
                resolve();
                stopRecordingPromise.current = null;
            }
        });

        return stopRecordingPromise.current;
    };

    // ── Screen+Audio recording (for Dashboard) ──
    const startScreenRecording = async () => {
        try {
            // Capture display (screen/window/tab)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: true // capture system audio if browser supports
            });

            // Also mix in microphone
            const micTrack = localTracks.current.audio?.getMediaStreamTrack?.();
            const combinedStream = new MediaStream([
                ...displayStream.getTracks(),
                ...(micTrack ? [micTrack] : [])
            ]);

            screenRecChunks.current = [];
            screenRecSeconds_ref.current = 0;

            const codecs = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', ''];
            const mimeType = codecs.find(c => c === '' || MediaRecorder.isTypeSupported(c)) || '';
            const options = mimeType ? { mimeType } : {};

            screenMediaRecorder.current = new MediaRecorder(combinedStream, options);
            window.__screenRecordedMimeType = screenMediaRecorder.current.mimeType;

            screenMediaRecorder.current.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) screenRecChunks.current.push(e.data);
            };

            // If user stops sharing via browser UI, auto-stop recording
            displayStream.getVideoTracks()[0].onended = () => {
                if (screenMediaRecorder.current?.state !== 'inactive') stopScreenRecording();
            };

            screenMediaRecorder.current.start(1000);
            setIsScreenRecording(true);
            setScreenRecSeconds(0);
            screenRecTimer.current = setInterval(() => {
                screenRecSeconds_ref.current += 1;
                setScreenRecSeconds(s => s + 1);
            }, 1000);
        } catch (err) {
            // User cancelled screen picker or permission denied — silently ignore
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.error('[SCREEN-REC] Error:', err.message);
            }
        }
    };

    const stopScreenRecording = () => {
        if (!isScreenRecording && screenMediaRecorder.current?.state === 'inactive') return;
        clearInterval(screenRecTimer.current);
        setIsScreenRecording(false);

        if (screenMediaRecorder.current && screenMediaRecorder.current.state !== 'inactive') {
            screenMediaRecorder.current.onstop = async () => {
                const blob = new Blob(screenRecChunks.current, { type: window.__screenRecordedMimeType || 'video/webm' });
                await uploadScreenRecording(blob);
                // Stop all tracks to release screen capture indicator
                screenMediaRecorder.current?.stream?.getTracks().forEach(t => t.stop());
            };
            screenMediaRecorder.current.stop();
        }
    };

    const exportTranscript = (fmt) => {
        if (!transcript) return;
        const s = summary || { overview: 'No summary generated.', roles: [], keyPoints: [], actionItems: [], decisions: [] };

        if (fmt === 'pdf') {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;

            // 1. Header & Title
            doc.setFillColor(0, 0, 0);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('SMARTMEET AI REPORT', margin, 25);
            doc.setFontSize(10);
            doc.text(`Meeting Room: ${roomId.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, margin, 35);

            let y = 55;
            doc.setTextColor(0, 0, 0);

            // 2. Executive Overview
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EXECUTIVE OVERVIEW', margin, y);
            y += 8;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(s.overview, pageWidth - (margin * 2));
            doc.text(lines, margin, y);
            y += (lines.length * 6) + 15;

            // 3. Roles & Responsibilities
            if (s.roles?.length > 0) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('ROLES & RESPONSIBILITIES', margin, y);
                autoTable(doc, {
                    startY: y + 5,
                    head: [['PERSON', 'ROLE', 'PRIMARY RESPONSIBILITIES']],
                    body: s.roles.map(r => [r.person, r.role, r.responsibilities?.join(', ') || 'N/A']),
                    theme: 'striped',
                    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9 },
                    styles: { fontSize: 8, cellPadding: 4 },
                    margin: { left: margin }
                });
                y = doc.lastAutoTable.finalY + 15;
            }

            // 4. Key Discussion Points
            if (s.keyPoints?.length > 0) {
                if (y > 250) { doc.addPage(); y = 20; }
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('KEY DISCUSSION POINTS', margin, y);
                y += 10;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                s.keyPoints.forEach(pt => {
                    const l = doc.splitTextToSize(`• ${pt}`, pageWidth - (margin * 2));
                    doc.text(l, margin, y);
                    y += (l.length * 5) + 3;
                    if (y > 270) { doc.addPage(); y = 20; }
                });
                y += 10;
            }

            // 5. Action Items & Decisions
            if (s.actionItems?.length > 0 || s.decisions?.length > 0) {
                if (y > 240) { doc.addPage(); y = 20; }
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('ACTION ITEMS & DECISIONS', margin, y);
                y += 10;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                [...(s.actionItems || []), ...(s.decisions || [])].forEach((item, i) => {
                    const l = doc.splitTextToSize(`[${i + 1}] ${item}`, pageWidth - (margin * 2));
                    doc.text(l, margin, y);
                    y += (l.length * 5) + 3;
                    if (y > 270) { doc.addPage(); y = 20; }
                });
            }

            doc.save(`smartmeet-report-${roomId}.pdf`);
            return;
        }

        let content, mime, ext;
        if (fmt === 'json') {
            const exportData = { meetingId: roomId, exportDate: new Date(), ...s, fullTranscript: transcript.segments };
            content = JSON.stringify(exportData, null, 2); mime = 'application/json'; ext = 'json';
        } else {
            content = 'Speaker,Text,Start\n' + (transcript.segments || []).map(s => `${s.speaker},"${s.text.replace(/"/g, '\'')}",${s.startTime}`).join('\n');
            mime = 'text/csv'; ext = 'csv';
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = `smartmeet-data-${roomId}.${ext}`;
        a.click();
    };
    const sharingPeerId = Object.entries(peerStates).find(([, s]) => s?.screenSharing)?.[0];
    const sharingRemoteUser = remoteUsers.find(u => String(u.id) === String(sharingPeerId));
    const anyoneSharing = isSharing || !!sharingPeerId;
    const totalPeople = remoteUsers.length + 1;
    const myData = {
        id: user?.id || 'guest',
        userName: user?.name || 'Guest',
        userAvatar: user?.avatar || '/defaultpic.png',
        videoTrack: localTracks.current.video,
        videoOn: videoOn
    };
    return (
        <div className="h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500 bg-gray-50 text-black">

            <MeetingHeader
                isRecording={isRecording}
                recSeconds={recSeconds}
                uploading={uploading}
                setShowInvite={setShowInvite}
                participantCount={remoteUsers.length + 1}
                setShowParticipants={setShowParticipants}
                isHost={isHost}
                handleLeave={handleLeave}
                onEnd={() => setShowEndConfirm(true)}
            />

            {/* Notifications Popups */}
            <div className="fixed top-20 left-6 z-[2000] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {notifications.map(n => (
                        <motion.div
                            key={n.id}
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            className="w-72 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl p-4 shadow-2xl flex items-start gap-3 pointer-events-auto"
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                n.type === 'join' ? "bg-green-100 text-green-600" :
                                    n.type === 'leave' ? "bg-red-100 text-red-600" :
                                        "bg-amber-100 text-amber-600"
                            )}>
                                {n.type === 'join' ? <LogIn size={18} /> :
                                    n.type === 'leave' ? <LogOut size={18} /> :
                                        n.type === 'alert' ? <AlertCircle size={18} /> :
                                            <Info size={18} />}
                            </div>
                            <div className="flex-1 min-w-0 mt-0.5">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 truncate">{n.title}</h4>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                            </div>
                            <button
                                onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                                className="text-gray-300 hover:text-gray-900 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <main className="flex-1 min-h-0 relative flex flex-col bg-white overflow-hidden">
                {anyoneSharing ? (
                    <div className="flex-1 h-full flex flex-col sm:flex-row min-h-0 p-2 sm:p-4 gap-4">
                        {/* Participants strip - Desktop only */}
                        <div className="hidden sm:flex w-64 shrink-0 flex-col gap-4 overflow-y-auto pr-2 scrollbar-none border-r border-white/5">
                            <div className="aspect-video w-full shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
                                <UserTile
                                    isYou user={myData}
                                    peerState={{ muted: !micOn, handRaised, adminMuted }}
                                    activeSpeaker={activeSpeaker === 'me'}
                                    small
                                    hideVideo={isSharing}
                                />
                            </div>
                            {remoteUsers.map(u => (
                                <div key={u.id} className="aspect-video w-full shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/5">
                                    <UserTile
                                        user={u}
                                        peerState={peerStates[u.agoraUid || u.id]}
                                        activeSpeaker={activeSpeaker === u.agoraUid || activeSpeaker === u.id}
                                        isHost={isHost}
                                        onForceMute={() => forceMutePeer(u.agoraUid)}
                                        onForceUnmute={() => forceUnmutePeer(u.agoraUid)}
                                        small
                                        hideVideo={String(u.id) === String(sharingPeerId) || String(u.agoraUid) === String(sharingPeerId)}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Main Stage */}
                        <div className="flex-1 h-full min-h-0 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-black shadow-2xl border border-black/10 group">
                            {isSharing ? (
                                <ScreenSharePlayer track={screenTrackState} />
                            ) : (
                                <RemoteVideoPlayer videoTrack={sharingRemoteUser?.videoTrack} fit="contain" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-gray-900/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 backdrop-blur-md text-white shadow-xl border border-white/10">
                                        <ScreenShare size={14} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {isSharing ? 'Currently Presenting' : `Viewing ${sharingRemoteUser?.userName || 'Participant'}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── NORMAL MODE ── */
                    <div className="flex-1 h-full flex flex-col min-h-0">
                        {/* Mobile: Full Speaker Mode */}
                        <div className="sm:hidden flex-1 h-full relative">
                            {(() => {
                                const speaker = remoteUsers.find(u => activeSpeaker === u.agoraUid || activeSpeaker === u.id) || myData;
                                const isMe = speaker.id === myData.id;
                                return (
                                    <div className="absolute inset-0 m-2 rounded-2xl overflow-hidden bg-white border border-black/10 shadow-xl">
                                        <UserTile
                                            isYou={isMe} user={speaker}
                                            peerState={isMe ? { muted: !micOn, handRaised, adminMuted } : peerStates[speaker.agoraUid || speaker.id]}
                                            activeSpeaker={true}
                                            isHost={isHost}
                                            onForceMute={!isMe ? () => forceMutePeer(speaker.agoraUid) : undefined}
                                            onForceUnmute={!isMe ? () => forceUnmutePeer(speaker.agoraUid) : undefined}
                                        />
                                        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center p-4">
                                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border border-black/5 shadow-xl">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-black uppercase tracking-widest">
                                                    {isMe ? 'Listening to You' : `Viewing ${speaker.userName}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Desktop: Grid View */}
                        <div className="hidden sm:flex flex-col flex-1 min-h-0 h-full p-4 overflow-hidden">
                            <div className={cn(
                                "flex-1 min-h-0 grid gap-4 place-items-center",
                                totalPeople === 1 ? "grid-cols-1" : "grid-cols-2"
                            )}>
                                {/* Me */}
                                <div className={cn(
                                    "relative rounded-3xl overflow-hidden bg-white border border-black/10 shadow-2xl w-full h-full",
                                    totalPeople === 1 && "max-w-4xl max-h-[80%]"
                                )}>
                                    <UserTile
                                        isYou user={myData}
                                        peerState={{ muted: !micOn, handRaised, adminMuted }}
                                        activeSpeaker={activeSpeaker === 'me'}
                                    />
                                    {activeSpeaker === 'me' && (
                                        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center py-4">
                                            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/10 shadow-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-black uppercase tracking-widest">Speaking</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Active or First Remote Peer */}
                                {remoteUsers.length > 0 && (() => {
                                    const primary = remoteUsers.find(u => activeSpeaker === u.agoraUid || activeSpeaker === u.id) || remoteUsers[0];
                                    return (
                                        <div key={primary.id} className="relative w-full h-full rounded-3xl overflow-hidden bg-white border border-black/10 shadow-2xl transition-all">
                                            <UserTile
                                                user={primary}
                                                peerState={peerStates[primary.agoraUid || primary.id]}
                                                activeSpeaker={activeSpeaker === primary.agoraUid || activeSpeaker === primary.id}
                                                isHost={isHost}
                                                onForceMute={() => forceMutePeer(primary.agoraUid)}
                                                onForceUnmute={() => forceUnmutePeer(primary.agoraUid)}
                                            />
                                            {(activeSpeaker === primary.agoraUid || activeSpeaker === primary.id) && (
                                                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center py-4">
                                                    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/10 shadow-md">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-black uppercase tracking-widest">{primary.userName}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Desktop Overflow Strip */}
                            {remoteUsers.length > 1 && (
                                <div className="shrink-0 flex gap-4 overflow-x-auto scrollbar-none py-2">
                                    {remoteUsers.slice(1).map(u => (
                                        <div key={u.id} className="w-56 aspect-video shrink-0 rounded-2xl overflow-hidden border border-black/10 bg-white shadow-xl">
                                            <UserTile
                                                user={u}
                                                peerState={peerStates[u.agoraUid || u.id]}
                                                activeSpeaker={activeSpeaker === u.agoraUid || activeSpeaker === u.id}
                                                isHost={isHost}
                                                onForceMute={() => forceMutePeer(u.agoraUid)}
                                                onForceUnmute={() => forceUnmutePeer(u.agoraUid)}
                                                small
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <BotHUD botPhase={botPhase} phaseMsg={phaseMsg} countdown={countdown} />

                {/* Session Ended Overlay */}
                <AnimatePresence>
                    {endMessage && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 text-center"
                        >
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="space-y-6">
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                                    <PhoneOff size={32} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white mb-2">Session Ended</h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{endMessage}</p>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-black uppercase tracking-[0.2em]">
                                    <Loader2 size={14} className="animate-spin" /> Redirecting...
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <MeetingFooter
                micOn={micOn} toggleMic={toggleMic}
                videoOn={videoOn} toggleVideo={toggleVideo}
                isSharing={isSharing} toggleShare={toggleShare}
                handRaised={handRaised} toggleHand={toggleHand}
                isRecording={isRecording} startRecording={startRecording} stopRecording={stopRecording}
                isScreenRecording={isScreenRecording}
                startScreenRecording={startScreenRecording}
                stopScreenRecording={stopScreenRecording}
                screenRecSeconds={screenRecSeconds}
                screenUploading={screenUploading}
                setShowReacts={setShowReacts}
                panel={panel} setPanel={setPanel}
                messages={messages}
                unread={unread} setUnread={setUnread}
                handleLeave={handleLeave}
                isHost={isHost}
                onEnd={() => setShowEndConfirm(true)}
                hasAiSummary={!!summary}
                showTranscript={showTranscript}
                setShowTranscript={setShowTranscript}
            />

            <AnimatePresence>
                {showEndConfirm && (
                    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100"
                        >
                            <h3 className="text-xl font-black mb-2">End Meeting?</h3>
                            <p className="text-sm opacity-60 mb-6 font-medium">This will end the meeting for all participants. This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowEndConfirm(false)}
                                    className="flex-1 py-3 rounded-xl border border-gray-100 font-bold hover:bg-gray-50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEndMeeting}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all cursor-pointer border-none shadow-lg shadow-red-600/20"
                                >
                                    End Session
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {panel === 'chat' && (
                    <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} className="fixed right-0 top-0 bottom-0 w-full sm:w-[340px] z-[1000] border-l shadow-2xl flex flex-col backdrop-blur-3xl transition-all bg-white border-gray-200">
                        <ChatPanel messages={messages} onSend={sendMsg} onClose={() => setPanel(null)} />
                    </motion.div>
                )}
                {panel === 'notes' && (
                    <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} className="fixed right-0 top-0 bottom-0 w-full sm:w-[340px] z-[1000] border-l shadow-2xl flex flex-col backdrop-blur-3xl transition-all bg-white border-gray-200">
                        <NotesPanel notes={personalNotes} setNotes={setPersonalNotes} isSaving={isSavingNotes} onClose={() => setPanel(null)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTranscript && (
                    <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-[1001] shadow-2xl flex flex-col backdrop-blur-3xl transition-all">
                        <SummarySidebar transcript={transcript} summary={summary} onClose={() => setShowTranscript(false)} onExport={exportTranscript} />
                    </motion.div>
                )}
                {showParticipants && (
                    <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} className="fixed right-0 top-0 bottom-0 w-full sm:w-[340px] z-[1000] border-l shadow-2xl flex flex-col backdrop-blur-3xl transition-all bg-white border-gray-200">
                        <ParticipantsPanel
                            participants={[myData, ...remoteUsers]}
                            onClose={() => setShowParticipants(false)}
                            isHost={isHost}
                            myId={user?.id}
                            peerStates={peerStates}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{showReacts && <SelectionModal options={REACTIONS} onSelect={sendReact} onClose={() => setShowReacts(false)} />}</AnimatePresence>
            <AnimatePresence>{reactions.map(r => <FloatingReaction key={r.id} reactionKey={r.key} name={r.name} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />)}</AnimatePresence>
            <AnimatePresence>{showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} />}</AnimatePresence>
        </div>
    );
};

export default MeetingRoom;
