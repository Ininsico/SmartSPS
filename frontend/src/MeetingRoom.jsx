import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import Pusher from 'pusher-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useAuth } from '@clerk/clerk-react';
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
import { REACTIONS } from './components/MeetingRoom/Constants';
import { ScreenShare } from 'lucide-react';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const MeetingRoom = ({ roomId, onLeave, initialConfig, isHost: initialIsHost = false, isDarkMode, setIsDarkMode }) => {
    const { user } = useUser();
    const { getToken } = useAuth();

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
    const [adminMuted, setAdminMuted] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showReacts, setShowReacts] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Recording & AI State
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

    const [isHost, setIsHost] = useState(initialIsHost || sessionStorage.getItem(`host_${roomId}`) === 'true');

    // Refs
    const rtc = useRef(null);
    const localTracks = useRef({ audio: null, video: null });
    const screenTrack = useRef(null);
    const rtmReady = useRef(false);
    const mediaRecorder = useRef(null);
    const recChunks = useRef([]);
    const recTimer = useRef(null);
    const countdownRef = useRef(null);
    const audioContext = useRef(null);       // Web Audio context for recording mix
    const recDestination = useRef(null);    // MediaStreamDestinationNode
    const connectedNodes = useRef({});      // uid -> source node (to disconnect later)
    const sessionID = useRef(`${user?.id || 'guest'}_${Math.floor(Math.random() * 100000)}`).current;
    const numericUid = useRef(Math.floor(Math.random() * 1000000)).current;

    const D = isDarkMode;

    // --- Helpers ---
    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const upsertUser = (id, part) => {
        const strId = String(id);
        const numId = Number(id);
        if (strId === String(user?.id) || (!isNaN(numId) && numId === numericUid)) return;

        setRemoteUsers(prev => {
            // Priority 1: Match by the passed ID (could be clerk or agora)
            // Priority 2: Match by internal agoraUid
            const idx = prev.findIndex(u => String(u.id) === strId || (u.agoraUid && u.agoraUid === numId));
            if (idx > -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...part };
                return updated;
            }
            return [...prev, { id: strId, agoraUid: !isNaN(numId) ? numId : null, userName: '', userAvatar: '', videoTrack: null, audioTrack: null, ...part }];
        });
    };

    const mergeProfile = (uid, profile) => {
        const numId = Number(uid);
        const strId = String(uid);
        if (numId === numericUid || strId === String(user?.id)) return;

        setRemoteUsers(prev => {
            const idx = prev.findIndex(u => u.agoraUid === numId || String(u.id) === strId);
            if (idx > -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...profile };
                return updated;
            }
            return [...prev, { id: strId, agoraUid: numId, userName: '', userAvatar: '', videoTrack: null, audioTrack: null, ...profile }];
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

    const tryFetchTranscript = async (attempt = 1) => {
        const maxAttempts = 15;
        const waitTime = 10;
        setBotPhase('fetching');
        try {
            setPhaseMsg(`AI Transcribing... (Attempt ${attempt}/${maxAttempts})`);
            const res = await botFetch(`/transcript/${roomId}`);
            if (res.status === 200) {
                const data = await res.json();
                if (data.segments?.length > 0) {
                    setTranscript(data);
                    await runSummarize(data);
                    return;
                } else {
                    setBotPhase('error');
                    setPhaseMsg('Meeting too short or no audio detected.');
                    setBotRunning(false);
                    return;
                }
            }
            if (res.status >= 400) {
                throw new Error('Server error during transcription');
            }
            if (attempt < maxAttempts) {
                startCountdown(waitTime, () => tryFetchTranscript(attempt + 1));
            } else {
                setBotPhase('error');
                setPhaseMsg('Transcription taking longer than usual.');
                setBotRunning(false);
            }
        } catch (err) {
            if (attempt < maxAttempts) startCountdown(waitTime, () => tryFetchTranscript(attempt + 1));
        }
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
            await tryFetchTranscript(5);
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
            body: JSON.stringify({ uid: numericUid, name: user?.fullName || 'Guest', pic: user?.imageUrl })
        }).catch(() => { });
    };

    const syncState = async (state) => {
        const fullState = { ...state, adminMuted };
        setPeerStates(p => ({ ...p, [numericUid]: fullState }));
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/state/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ uid: numericUid, state: fullState })
        }).catch(() => { });
    };

    const sendMsg = async (txt) => {
        if (!txt?.trim()) return;
        const msg = { senderName: user?.fullName || user?.firstName || 'Guest', senderAvatar: user?.imageUrl, text: txt };
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
    const toggleMic = () => { if (adminMuted) return; setMicOn(prev => !prev); localTracks.current.audio?.setEnabled(!micOn); syncState({ muted: micOn, handRaised, adminMuted }); };
    const toggleVideo = () => { setVideoOn(prev => !prev); localTracks.current.video?.setEnabled(!videoOn); };
    const toggleHand = () => { setHandRaised(prev => !prev); syncState({ muted: !micOn, handRaised: !handRaised, adminMuted }); };

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
        if (isRecording) stopRecording();
        if (botRunning) botFetch(`/stop/${roomId}`, { method: 'DELETE' }).catch(() => { });
        const token = await getToken();
        await fetch(`${import.meta.env.VITE_API_URL}/meetings/leave/${roomId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => { });
        onLeave();
    };

    const stopShare = async () => {
        const track = screenTrack.current;
        screenTrack.current = null;
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
                            }
                        }
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
                    setRemoteUsers(prev => prev.filter(x => String(x.id) !== String(u.uid) && x.agoraUid !== Number(u.uid)));
                });

                rtc.current.on('volume-indicator', (volumes) => {
                    const highest = volumes.reduce((prev, curr) => (prev.level > curr.level) ? prev : curr, { uid: 0, level: 0 });
                    if (highest.level > 10) setActiveSpeaker(highest.uid === numericUid ? 'me' : highest.uid);
                    else setActiveSpeaker(null);
                });

                // Start RTC Join
                await rtc.current.join(APP_ID, roomId, null, numericUid);
                const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();

                // Ensure initial state is applied BEFORE publishing
                await audio.setEnabled(micOn);
                await video.setEnabled(videoOn);

                localTracks.current = { audio, video };
                await rtc.current.publish([audio, video]);

                rtmReady.current = true;
                broadcastProfile();
                const t = setInterval(() => { if (isMounted) broadcastProfile(); }, 10000);

                // Notify Join
                const token = await getToken();
                const res = await fetch(`${import.meta.env.VITE_API_URL}/meetings/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-session-id': sessionID },
                    body: JSON.stringify({ roomId, userName: user?.fullName, userAvatar: user?.imageUrl, agoraUid: numericUid }),
                });
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
                            const exists = next.findIndex(p => String(p.id) === String(o.userId) || (o.agoraUid && p.agoraUid === o.agoraUid));
                            if (exists === -1) {
                                next.push({ id: o.userId, agoraUid: o.agoraUid, userName: o.name, userAvatar: o.avatar, videoTrack: null, audioTrack: null });
                            } else {
                                next[exists] = { ...next[exists], agoraUid: o.agoraUid, userName: o.name, userAvatar: o.avatar };
                            }
                        });
                        return next;
                    });
                }

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
                            // Match by Clerk ID OR Agora UID
                            const idx = next.findIndex(n => String(n.id) === String(db.userId) || (db.agoraUid && n.agoraUid === db.agoraUid));

                            if (idx === -1) {
                                next.push({ id: db.userId, agoraUid: db.agoraUid, userName: db.name, userAvatar: db.avatar, videoTrack: null, audioTrack: null });
                                changed = true;
                            } else {
                                // Merge DB data into existing entry and stabilize ID
                                if (next[idx].id !== db.userId || next[idx].agoraUid !== db.agoraUid) {
                                    next[idx] = { ...next[idx], id: db.userId, agoraUid: db.agoraUid, userName: db.name, userAvatar: db.avatar };
                                    changed = true;
                                }
                            }
                        });
                        // Also cleanup anyone no longer in activeOthers
                        const filtered = next.filter(n => activeOthers.some(o => String(o.userId) === String(n.id) || (n.agoraUid && o.agoraUid === n.agoraUid)));

                        // CRITICAL DEDUPLICATION: Ensure no two tiles share the same Clerk ID or Agora UID
                        const seenIds = new Set();
                        const final = [];
                        filtered.forEach(item => {
                            if (!seenIds.has(String(item.id))) {
                                final.push(item);
                                seenIds.add(String(item.id));
                            }
                        });

                        if (final.length !== next.length) changed = true;
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
            await tryFetchTranscript(1);
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

            console.log(`[REC] Sending to backend | Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB | MIME: ${mimeType}`);
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
                console.error('[REC] Backend upload failed:', data);
                throw new Error(data.error || 'Upload failed');
            }

            console.log('[REC] Upload success:', data.url);

            // Kick off AI pipeline with the returned URL
            await triggerAI(data.url);

        } catch (err) {
            console.error('[REC] uploadRecording error:', err);
            setBotPhase('error');
            setPhaseMsg(`Upload failed: ${err.message}`);
            setTimeout(() => setBotPhase('idle'), 5000);
        } finally {
            setUploading(false);
            recChunks.current = [];
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
                        console.log('[REC] Local mic wired into recording mix');
                    }
                } catch (e) { console.warn('[REC] Could not wire local mic:', e); }
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
                            console.log(`[REC] Remote uid=${u.uid} wired into recording mix`);
                        }
                    } catch (e) { console.warn('[REC] Could not wire remote track:', u.uid, e); }
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
            console.log('[REC] Started | MIME:', mediaRecorder.current.mimeType);

            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                // Close audio context
                if (audioContext.current) {
                    audioContext.current.close().catch(() => { });
                    audioContext.current = null;
                    recDestination.current = null;
                    connectedNodes.current = {};
                }
                const blob = new Blob(recChunks.current, { type: window.__recordedMimeType || 'audio/webm' });
                console.log(`[REC] Stopped | Chunks: ${recChunks.current.length} | Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB | Type: ${blob.type}`);
                uploadRecording(blob);
            };

            mediaRecorder.current.start(1000);
            setIsRecording(true);
            setRecSeconds(0);
            recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000);

        } catch (err) {
            console.error('[REC] startRecording error:', err.name, err.message);
        }
    };

    const stopRecording = () => {
        clearInterval(recTimer.current);
        setIsRecording(false);
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop(); // triggers onstop -> uploadRecording
        }
    };

    const exportTranscript = (fmt) => {
        if (!transcript) return;
        let content, mime, ext;
        if (fmt === 'json') { content = JSON.stringify(transcript, null, 2); mime = 'application/json'; ext = 'json'; }
        else { content = 'Speaker,Text,Start\n' + (transcript.segments || []).map(s => `${s.speaker},"${s.text.replace(/"/g, '\'')}",${s.startTime}`).join('\n'); mime = 'text/csv'; ext = 'csv'; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = `smartmeet-transcript-${roomId}.${ext}`;
        a.click();
    };
    const sharingPeerId = Object.entries(peerStates).find(([, s]) => s?.screenSharing)?.[0];
    const sharingRemoteUser = remoteUsers.find(u => String(u.id) === String(sharingPeerId));
    const anyoneSharing = isSharing || !!sharingRemoteUser;
    const totalPeople = remoteUsers.length + 1;
    const myData = {
        id: user?.id || 'guest',
        userName: user?.fullName || 'Guest',
        userAvatar: user?.imageUrl || '',
        videoTrack: localTracks.current.video,
        videoOn: videoOn
    };
    return (
        <div className={cn("h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500", D ? "bg-premium-bg text-gray-100" : "bg-gray-100 text-gray-900")}>

            <MeetingHeader
                isRecording={isRecording}
                recSeconds={recSeconds}
                uploading={uploading}
                setShowInvite={setShowInvite}
                isDark={D}
            />

            <main className="flex-1 min-h-0 flex flex-col p-4 gap-4 overflow-hidden relative">
                {anyoneSharing ? (
                    <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
                        {/* Main Shared Screen */}
                        <div className="flex-[3] lg:flex-[4] relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 min-h-0 flex flex-col group">
                            {isSharing ? <ScreenSharePlayer track={screenTrack.current} /> : <RemoteVideoPlayer videoTrack={sharingRemoteUser?.videoTrack} />}
                            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10">
                                <ScreenShare size={14} className="text-premium-accent" />
                                <span className="text-xs font-bold text-white">{isSharing ? 'You are presenting' : `${sharingRemoteUser?.userName || 'Someone'} is presenting`}</span>
                            </div>
                        </div>

                        {/* Right Panel for Participants */}
                        <div className="md:w-[260px] lg:w-[300px] md:flex-[1] shrink-0 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:pr-2 scrollbar-none md:scrollbar-thin max-h-[160px] md:max-h-full">
                            <div className={cn(
                                "flex md:grid gap-3 h-full md:h-auto auto-rows-max min-w-max md:min-w-0",
                                totalPeople <= 3 ? "md:grid-cols-1" : "md:grid-cols-2"
                            )}>
                                <div className="w-[180px] md:w-full aspect-video shrink-0 transition-all duration-300" style={{ order: (!activeSpeaker || activeSpeaker === 'me') ? -1 : 999 }}>
                                    <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} activeSpeaker={activeSpeaker === 'me'} small />
                                </div>

                                {remoteUsers.map(u => (
                                    <div key={u.id} className="w-[180px] md:w-full aspect-video shrink-0 transition-all duration-300" style={{ order: (activeSpeaker === u.agoraUid || activeSpeaker === u.id) ? -1 : 1 }}>
                                        <UserTile
                                            user={u}
                                            isDark={D}
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
                        </div>
                    </div>
                ) : (
                    <div className={cn(
                        "flex-1 overflow-y-auto p-4 md:p-8 scrollbar-none grid place-content-center gap-4 md:gap-8 w-full mx-auto max-w-[1800px]",
                        totalPeople === 1 ? "grid-cols-1" :
                            totalPeople === 2 ? "grid-cols-1 md:grid-cols-2 max-w-[1400px]" :
                                totalPeople <= 4 ? "grid-cols-2 max-w-[1400px]" :
                                    "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    )}>
                        <div className={cn("w-full transition-all duration-500", totalPeople === 1 ? "max-w-5xl mx-auto aspect-video" : "aspect-video")}>
                            <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} activeSpeaker={activeSpeaker === 'me'} />
                        </div>
                        {remoteUsers.map(u => {
                            if (String(u.id) === String(user?.id)) return null;
                            return (
                                <div key={u.id} className="w-full aspect-video transition-all duration-500">
                                    <UserTile
                                        user={u}
                                        isDark={D}
                                        peerState={peerStates[u.agoraUid || u.id]}
                                        activeSpeaker={activeSpeaker === u.agoraUid || activeSpeaker === u.id}
                                        isHost={isHost}
                                        onForceMute={() => forceMutePeer(u.agoraUid || u.id)}
                                        onForceUnmute={() => forceUnmutePeer(u.agoraUid || u.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
                <BotHUD botPhase={botPhase} phaseMsg={phaseMsg} countdown={countdown} />
            </main>

            <MeetingFooter
                micOn={micOn} toggleMic={toggleMic}
                videoOn={videoOn} toggleVideo={toggleVideo}
                isSharing={isSharing} toggleShare={toggleShare}
                handRaised={handRaised} toggleHand={toggleHand}
                isRecording={isRecording} startRecording={startRecording} stopRecording={stopRecording}
                setShowReacts={setShowReacts}
                panel={panel} setPanel={setPanel}
                messages={messages}
                unread={unread} setUnread={setUnread}
                handleLeave={handleLeave}
                isDark={D}
            />

            <AnimatePresence>
                {panel === 'chat' && (
                    <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} className={cn("fixed right-0 top-0 bottom-0 w-full sm:w-[340px] z-[1000] border-l shadow-2xl flex flex-col backdrop-blur-3xl transition-all", D ? "bg-premium-surface/90 border-white/10" : "bg-white/95 border-gray-200")}>
                        <ChatPanel messages={messages} onSend={sendMsg} onClose={() => setPanel(null)} isDark={D} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTranscript && (
                    <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }} className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-[1001] shadow-2xl flex flex-col backdrop-blur-3xl transition-all">
                        <SummarySidebar transcript={transcript} summary={summary} onClose={() => setShowTranscript(false)} onExport={exportTranscript} isDark={D} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>{showReacts && <SelectionModal options={REACTIONS} onSelect={sendReact} onClose={() => setShowReacts(false)} isDark={D} />}</AnimatePresence>
            <AnimatePresence>{reactions.map(r => <FloatingReaction key={r.id} reactionKey={r.key} name={r.name} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />)}</AnimatePresence>
            <AnimatePresence>{showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} isDark={D} />}</AnimatePresence>
        </div>
    );
};

export default MeetingRoom;
