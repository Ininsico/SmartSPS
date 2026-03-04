import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
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
    const rtm = useRef(null);
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

    const D = isDarkMode;

    // --- Helpers ---
    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const upsertUser = (id, part) => {
        setRemoteUsers(prev => {
            const idx = prev.findIndex(u => u.id === id);
            if (idx > -1) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...part };
                return updated;
            }
            return [...prev, { id, userName: '', userAvatar: '', videoTrack: null, audioTrack: null, ...part }];
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

    // --- AI Logic ---
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

    // --- Agora Logic ---
    useEffect(() => {
        if (!APP_ID) return;
        let isMounted = true;
        const numericUid = Math.floor(Math.random() * 1000000);

        const init = async () => {
            try {
                rtc.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                rtc.current.enableAudioVolumeIndicator();
                rtm.current = new AgoraRTM.RTM(APP_ID, sessionID);

                rtc.current.on('user-published', async (u, type) => {
                    if (!isMounted) return;
                    await rtc.current.subscribe(u, type);
                    upsertUser(u.uid, { [type === 'video' ? 'videoTrack' : 'audioTrack']: u[type === 'video' ? 'videoTrack' : 'audioTrack'] });
                    if (type === 'audio') {
                        u.audioTrack.play();
                        // If recording is active, wire this remote audio into the mix
                        if (audioContext.current && recDestination.current && u.audioTrack) {
                            try {
                                const ms = u.audioTrack.getMediaStreamTrack();
                                if (ms) {
                                    const src = audioContext.current.createMediaStreamSource(new MediaStream([ms]));
                                    src.connect(recDestination.current);
                                    connectedNodes.current[u.uid] = src;
                                }
                            } catch (e) { console.warn('[REC] Failed to wire remote track:', e); }
                        }
                    }
                });

                rtc.current.on('user-unpublished', (u, type) => {
                    if (!isMounted) return;
                    upsertUser(u.uid, { [type === 'video' ? 'videoTrack' : 'audioTrack']: null });
                    // Disconnect from recording mix
                    if (type === 'audio' && connectedNodes.current[u.uid]) {
                        try { connectedNodes.current[u.uid].disconnect(); } catch (e) { }
                        delete connectedNodes.current[u.uid];
                    }
                });

                rtc.current.on('user-left', (u) => setRemoteUsers(p => p.filter(x => x.id !== u.uid)));

                rtc.current.on('volume-indicator', (volumes) => {
                    const highest = volumes.reduce((prev, curr) => (prev.level > curr.level) ? prev : curr, { uid: 0, level: 0 });
                    if (highest.level > 10) setActiveSpeaker(highest.uid === numericUid ? 'me' : highest.uid);
                    else setActiveSpeaker(null);
                });

                const broadcastProfile = () => {
                    if (isMounted && rtm.current) {
                        rtm.current.publish(roomId, JSON.stringify({ type: 'profile', name: user?.fullName || 'Guest', pic: user?.imageUrl })).catch(() => { });
                    }
                };

                rtm.current.on('message', async (ev) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(ev.message);
                        if (data.type === 'profile') upsertUser(ev.publisher, { userName: data.name, userAvatar: data.pic });
                        else if (data.type === 'chat') {
                            setMessages(p => [...p, { id: Date.now(), from: ev.publisher, userName: data.name, text: data.text, userAvatar: data.pic }]);
                            if (panel !== 'chat') setUnread(v => v + 1);
                        } else if (data.type === 'react') setReactions(p => [...p, { id: Date.now(), key: data.key, name: data.name }]);
                        else if (data.type === 'state') setPeerStates(p => ({ ...p, [ev.publisher]: data.state }));
                        else if (data.type === 'force_mute' && String(data.target) === String(numericUid)) {
                            setMicOn(false);
                            setAdminMuted(true);
                            if (localTracks.current.audio) localTracks.current.audio.setEnabled(false);
                            syncState({ muted: true, handRaised, adminMuted: true });
                        }
                        else if (data.type === 'force_unmute' && String(data.target) === String(numericUid)) {
                            setAdminMuted(false);
                        }
                        else if (data.type === 'end_meeting') {
                            onLeave();
                        }
                    } catch (e) { }
                });

                rtm.current.on('presence', (ev) => { if (isMounted && (ev.eventType === 'SNAPSHOT' || ev.eventType === 'REMOTE_JOIN')) broadcastProfile(); });

                // Start Join
                await rtc.current.join(APP_ID, roomId, null, numericUid);
                const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracks.current = { audio, video };
                await rtc.current.publish([audio, video]);
                audio.setEnabled(micOn);
                video.setEnabled(videoOn);

                console.log('[RTM] Logging in...');
                await rtm.current.login();
                await rtm.current.subscribe(roomId, { withMessage: true, withPresence: true });
                rtmReady.current = true;
                broadcastProfile();
                const t = setInterval(() => { if (isMounted) broadcastProfile(); }, 4000);

                // Notify Join
                const token = await getToken();
                const res = await fetch(`${import.meta.env.VITE_API_URL}/meetings/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-session-id': sessionID },
                    body: JSON.stringify({ roomId, userName: user?.fullName, userAvatar: user?.imageUrl }),
                });
                const joinData = await res.json();
                if (joinData.isHost) {
                    setIsHost(true);
                    sessionStorage.setItem(`host_${roomId}`, 'true');
                }
                if (joinData.meeting?.chat) {
                    setMessages(joinData.meeting.chat.map(m => ({ id: m._id, from: m.senderId, userName: m.senderName, text: m.text, userAvatar: m.senderAvatar, timestamp: m.timestamp })));
                }

                return () => {
                    clearInterval(t);
                    if (rtc.current) rtc.current.leave();
                    if (rtm.current) rtm.current.logout();
                };

            } catch (e) { console.error("Agora Init Error", e); }
        };

        const initPromise = init();
        return () => {
            isMounted = false;
            rtmReady.current = false;
            initPromise.then(fn => fn && fn());
            if (localTracks.current.audio) localTracks.current.audio.close();
            if (localTracks.current.video) localTracks.current.video.close();
        };
    }, [roomId]);

    // --- Communication ---
    const rtmPublish = (payload) => {
        if (!rtm.current || !rtmReady.current) return;
        rtm.current.publish(roomId, JSON.stringify(payload)).catch(() => { });
    };

    const syncState = (state) => {
        const fullState = { ...state, adminMuted };
        setPeerStates(p => ({ ...p, [sessionID]: fullState }));
        rtmPublish({ type: 'state', state: fullState });
    };

    const sendMsg = async (txt) => {
        if (!txt?.trim()) return;
        const msg = { type: 'chat', text: txt, name: user?.fullName || user?.firstName || 'Guest', pic: user?.imageUrl };
        if (rtmReady.current) rtmPublish(msg);
        setMessages(p => [...p, { id: Date.now(), from: 'me', userName: msg.name, text: msg.text, userAvatar: msg.pic }]);
        const token = await getToken();
        fetch(`${import.meta.env.VITE_API_URL}/meetings/chat/${roomId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text: txt, senderName: msg.name, senderAvatar: msg.pic })
        }).catch(() => { });
    };

    const sendReact = (key) => {
        const name = user?.fullName || user?.firstName || 'Guest';
        rtmPublish({ type: 'react', key, name });
        setReactions(p => [...p, { id: Date.now(), key, name: 'You' }]);
    };

    // --- Control Handlers ---
    const toggleMic = () => { if (adminMuted) return; setMicOn(prev => !prev); localTracks.current.audio?.setEnabled(!micOn); syncState({ muted: micOn, handRaised, adminMuted }); };
    const toggleVideo = () => { setVideoOn(prev => !prev); localTracks.current.video?.setEnabled(!videoOn); };
    const toggleHand = () => { setHandRaised(prev => !prev); syncState({ muted: !micOn, handRaised: !handRaised, adminMuted }); };

    const forceMutePeer = (targetUid) => {
        if (!isHost) return;
        rtmPublish({ type: 'force_mute', target: String(targetUid) });
    };

    const forceUnmutePeer = (targetUid) => {
        if (!isHost) return;
        rtmPublish({ type: 'force_unmute', target: String(targetUid) });
    };

    const handleLeave = async () => {
        if (isRecording) stopRecording();
        if (botRunning) botFetch(`/stop/${roomId}`, { method: 'DELETE' }).catch(() => { });
        const token = await getToken();
        await fetch(`${import.meta.env.VITE_API_URL}/meetings/end/${roomId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        if (isHost) rtmPublish({ type: 'end_meeting' });
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

    // Recording logic
    useEffect(() => { window.__getClerkToken = getToken; }, [getToken]);

    const triggerAI = async (recordingUrl) => {
        // Store URL first so toggleBot can read it
        localStorage.setItem(`last_rec_url_${roomId}`, recordingUrl);

        setBotPhase('starting');
        setPhaseMsg('Sending to AI for transcription…');

        try {
            const res = await botFetch('/start', {
                method: 'POST',
                body: JSON.stringify({ meetingId: roomId, recordingUrl })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('[AI] Start failed:', errData);
                throw new Error(errData.error || 'Transcription failed to start');
            }

            setBotRunning(true);
            setBotPhase('fetching');
            setPhaseMsg('Transcribing meeting…');
            await tryFetchTranscript(1);
        } catch (err) {
            console.error('[AI] triggerAI error:', err);
            setBotPhase('error');
            setPhaseMsg(`AI failed: ${err.message}`);
            setTimeout(() => setBotPhase('idle'), 5000);
        }
    };

    const uploadRecording = async (blob) => {
        if (!blob || blob.size === 0) {
            console.error('[REC] Empty blob — nothing to upload');
            setBotPhase('error');
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

    // --- Render Logic ---
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
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 min-h-0 group">
                            {isSharing ? <ScreenSharePlayer track={screenTrack.current} /> : <RemoteVideoPlayer videoTrack={sharingRemoteUser?.videoTrack} />}
                            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10">
                                <ScreenShare size={14} className="text-premium-accent" />
                                <span className="text-xs font-bold text-white">{isSharing ? 'You are presenting' : `${sharingRemoteUser?.userName || 'Someone'} is presenting`}</span>
                            </div>
                        </div>
                        <div className="h-32 flex gap-3 overflow-x-auto overflow-y-hidden pb-1 scrollbar-none shrink-0">
                            <div className="w-[180px] sm:w-[220px] flex-shrink-0"><UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} activeSpeaker={activeSpeaker === 'me'} small /></div>
                            {remoteUsers.map(u => (
                                <div key={u.id} className="w-[180px] sm:w-[220px] flex-shrink-0">
                                    <UserTile user={u} isDark={D} peerState={peerStates[u.id]} activeSpeaker={activeSpeaker === u.id} isHost={isHost} onForceMute={() => forceMutePeer(u.id)} onForceUnmute={() => forceUnmutePeer(u.id)} small />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-none flex flex-wrap items-center justify-center content-center gap-4">
                        <div className={cn("transition-all duration-500", totalPeople === 1 ? "w-full max-w-4xl aspect-video" : totalPeople === 2 ? "w-full md:w-[calc(50%-1rem)] aspect-video" : "w-[calc(45%)] md:w-[calc(30%)] aspect-video")}>
                            <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} activeSpeaker={activeSpeaker === 'me'} />
                        </div>
                        {remoteUsers.map(u => (
                            <div key={u.id} className={cn("transition-all duration-500", totalPeople === 2 ? "w-full md:w-[calc(50%-1rem)] aspect-video" : "w-[calc(45%)] md:w-[calc(30%)] aspect-video")}>
                                <UserTile user={u} isDark={D} peerState={peerStates[u.id]} activeSpeaker={activeSpeaker === u.id} isHost={isHost} onForceMute={() => forceMutePeer(u.id)} onForceUnmute={() => forceUnmutePeer(u.id)} />
                            </div>
                        ))}
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
