import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
    MessageSquare, PhoneOff, Hand, X, Send, Circle, Loader2, Sparkles, Link2,
    Heart, ThumbsUp, Smile, Frown, Flame, Rocket, CheckCircle2 as CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser, useAuth } from '@clerk/clerk-react';

import { cn } from './utils';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const REACTIONS = [
    { key: 'heart', icon: Heart, color: 'text-red-500' },
    { key: 'thumbsup', icon: ThumbsUp, color: 'text-blue-500' },
    { key: 'laugh', icon: Smile, color: 'text-yellow-500' },
    { key: 'sad', icon: Frown, color: 'text-blue-400' },
    { key: 'fire', icon: Flame, color: 'text-orange-500' },
    { key: 'rocket', icon: Rocket, color: 'text-purple-500' },
    { key: 'check', icon: CheckCircle, color: 'text-green-500' }
];

const reactionByKey = REACTIONS.reduce((acc, r) => ({ ...acc, [r.key]: r }), {});

const FloatingReaction = ({ reactionKey, name, onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
    const r = reactionByKey[reactionKey];
    if (!r) return null;
    const Icon = r.icon;
    return (
        <motion.div initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -200, scale: 1.5 }} transition={{ duration: 3, ease: 'easeOut' }}
            className="fixed bottom-28 right-[40px] z-[900] pointer-events-none text-center"
            style={{ right: `${Math.random() * 200 + 40}px` }}
        >
            <div className={cn("mb-1 p-3 rounded-full bg-black/40 backdrop-blur-sm shadow-2xl", r.color)}>
                <Icon size={32} fill="currentColor" />
            </div>
            <div className="text-[10px] text-white bg-black/60 rounded-md px-2 py-0.5 font-bold uppercase tracking-wider">{name}</div>
        </motion.div>
    );
};

const RemoteVideoPlayer = ({ videoTrack, audioTrack }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoTrack && videoRef.current) videoTrack.play(videoRef.current);
    }, [videoTrack]);
    useEffect(() => {
        if (audioTrack) audioTrack.play();
    }, [audioTrack]);
    return <div key={videoTrack?._ID || 'no-track'} ref={videoRef} className="w-full h-full object-cover block" />;
};

const ScreenSharePlayer = ({ track }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (track && ref.current) track.play(ref.current);
    }, [track]);
    return <div ref={ref} className="w-full h-full bg-black" />;
};

const UserTile = ({ user, isDark, isYou = false, peerState, small = false, activeSpeaker = false, isHost = false, onForceMute, onForceUnmute }) => {
    const initials = user.userName ? user.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    const isMuted = peerState?.muted ?? false;
    const handUp = peerState?.handRaised ?? false;
    const isRemoteAdminMuted = peerState?.adminMuted ?? false;
    const videoRef = useRef(null);

    useEffect(() => {
        if (isYou && user.videoTrack && videoRef.current) {
            user.videoTrack.play(videoRef.current);
        }
    }, [isYou, user.videoTrack]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative overflow-hidden bg-[#0a0a0a] transition-all duration-300 border flex items-center justify-center",
                small ? "h-full w-full rounded-xl" : "aspect-video w-full rounded-2xl",
                activeSpeaker ? "border-premium-accent shadow-[0_0_20px_rgba(129,138,248,0.4)] ring-2 ring-premium-accent/20" :
                    handUp ? "border-[#f6c90e] shadow-[0_0_15px_rgba(246,201,14,0.3)]" : "border-white/5 shadow-2xl"
            )}
        >
            {isYou ? (
                <div ref={videoRef} className="w-full h-full object-cover block" />
            ) : user.videoTrack ? (
                <RemoteVideoPlayer videoTrack={user.videoTrack} audioTrack={user.audioTrack} />
            ) : null}

            {(!user.videoTrack || (isYou && !user.videoOn)) && (
                <div className={cn(
                    "absolute inset-0 z-[1] flex items-center justify-center transition-colors duration-500",
                    isDark ? "bg-[#140c0c]" : "bg-gray-200"
                )}>
                    <div className={cn(
                        "rounded-full overflow-hidden flex items-center justify-center border-[3px] border-white/10 transition-all duration-500 scale-100",
                        small ? "w-[42px] h-[42px]" : "w-20 h-20",
                        isDark ? "bg-[#2a1a1a]" : "bg-gray-300",
                        activeSpeaker && "ring-4 ring-premium-accent/30 scale-110"
                    )}>
                        {user.userAvatar ? <img src={user.userAvatar} alt="" className="w-full h-full object-cover" /> : <span className={cn("font-black tracking-tighter opacity-30 leading-none", small ? "text-sm" : "text-2xl")}>{initials}</span>}
                    </div>
                </div>
            )}

            {/* Host Controls */}
            {isHost && !isYou && (
                <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); isRemoteAdminMuted ? onForceUnmute() : onForceMute(); }}
                        className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-black/30 border-none cursor-pointer",
                            isRemoteAdminMuted ? "bg-gray-700 text-white" : "bg-black hover:bg-black/90 text-white"
                        )}
                    >
                        {isRemoteAdminMuted ? 'UNMUTE' : 'MUTE'}
                    </button>
                </div>
            )}

            {handUp && <div className="absolute top-2.5 left-2.5 text-xl z-10 filter drop-shadow-md">✋</div>}

            <div className={cn(
                "absolute z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white font-bold transition-all",
                small ? "bottom-2 left-2 px-2 py-1 text-[10px]" : "bottom-3 left-3 px-3 py-1.5 text-xs"
            )}>
                {user.userAvatar && <img src={user.userAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                <span className="truncate max-w-[100px]">{user.userName || (isYou ? 'You' : 'Loading...')}</span>
                {(isMuted || isRemoteAdminMuted) && <MicOff size={11} className={isRemoteAdminMuted ? "text-white" : "text-white/60"} />}
                {isRemoteAdminMuted && <span className="text-[9px] text-white font-extrabold tracking-widest">LOCKED</span>}
            </div>

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none z-0" />
        </motion.div>
    );
};

const MeetingRoom = ({ roomId, onLeave, initialConfig, isHost: initialIsHost = false, isDarkMode, setIsDarkMode }) => {
    const { user } = useUser();
    const { getToken } = useAuth();
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
    const [adminMuted, setAdminMuted] = useState(false); // If host muted us
    const [showInvite, setShowInvite] = useState(false);
    const [showReacts, setShowReacts] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isRecording, setIsRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [isHost, setIsHost] = useState(initialIsHost || sessionStorage.getItem(`host_${roomId}`) === 'true');

    useEffect(() => {
        if (isHost) sessionStorage.setItem(`host_${roomId}`, 'true');
    }, [isHost, roomId]);
    const [botRunning, setBotRunning] = useState(false);
    const [transcript, setTranscript] = useState(null);
    const [showTranscript, setShowTranscript] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await botFetch(`/status/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.running) {
                        setBotRunning(true);
                        setBotPhase('running');
                        setPhaseMsg('SmartMeet AI is listening');
                    }
                }
                const saved = await botFetch(`/saved/${roomId}`);
                if (saved.ok) {
                    const data = await saved.json();
                    if (data.found) {
                        setTranscript(data);
                        if (data.summary) setSummary(data.summary);
                    }
                }
            } catch (e) { console.warn("Status check failed", e); }
        };
        if (user) checkStatus();
    }, [roomId, user]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const rtc = useRef(null);
    const rtm = useRef(null);
    const localTracks = useRef({ audio: null, video: null });
    const screenTrack = useRef(null);
    const rtmReady = useRef(false);
    const mediaRecorder = useRef(null);
    const recChunks = useRef([]);
    const recTimer = useRef(null);
    const sessionID = useRef(`${user?.id || 'guest'}_${Math.floor(Math.random() * 100000)}`).current;

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

    useEffect(() => {
        if (!APP_ID) return;
        let isMounted = true;
        const numericUid = Math.floor(Math.random() * 1000000);

        const init = async () => {
            try {
                rtc.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                AgoraRTC.enableLogUpload(); // Good for debugging
                rtc.current.enableAudioVolumeIndicator(); // For speaker highlighting
                rtm.current = new AgoraRTM.RTM(APP_ID, sessionID);

                // Listeners
                rtc.current.on('user-published', async (u, type) => {
                    if (!isMounted) return;
                    try {
                        await rtc.current.subscribe(u, type);
                        upsertUser(u.uid, { [type === 'video' ? 'videoTrack' : 'audioTrack']: u[type === 'video' ? 'videoTrack' : 'audioTrack'] });
                        if (type === 'audio') u.audioTrack.play();
                    } catch (e) { }
                });
                rtc.current.on('user-unpublished', (u, type) => {
                    if (!isMounted) return;
                    upsertUser(u.uid, { [type === 'video' ? 'videoTrack' : 'audioTrack']: null });
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
                        else if (data.type === 'ping') broadcastProfile();
                        else if (data.type === 'leave' && data.isHost) {
                            // If host leaves, we might want to end the meeting session in DB
                            // but usually we rely on the host explicitly clicking "End" if they want to.
                        }
                        else if (data.type === 'end_meeting') {
                            onLeave();
                        }
                        else if (data.type === 'force_mute' && data.target === String(numericUid)) {
                            setMicOn(false);
                            setAdminMuted(true);
                            if (localTracks.current.audio) localTracks.current.audio.setEnabled(false);
                            syncState({ muted: true, handRaised, adminMuted: true });
                        }
                        else if (data.type === 'force_unmute' && data.target === String(numericUid)) {
                            setAdminMuted(false);
                        }
                    } catch (e) { }
                });

                rtm.current.on('presence', (ev) => {
                    if (isMounted && (ev.eventType === 'SNAPSHOT' || ev.eventType === 'REMOTE_JOIN')) broadcastProfile();
                });

                // Start
                const joinRTC = async () => {
                    try {
                        await rtc.current.join(APP_ID, roomId, null, numericUid);
                        if (!isMounted) return;
                        const [audio, video] = await AgoraRTC.createMicrophoneAndCameraTracks();
                        localTracks.current = { audio, video };
                        if (!isMounted) { audio.close(); video.close(); return; }
                        await rtc.current.publish([audio, video]);
                        audio.setEnabled(micOn);
                        video.setEnabled(videoOn);
                    } catch (e) { console.warn("RTC fail", e); }
                };

                const joinRTM = async () => {
                    try {
                        await rtm.current.login();
                        if (!isMounted) return;
                        await rtm.current.subscribe(roomId, { withMessage: true, withPresence: true });
                        rtmReady.current = true;
                        broadcastProfile();
                        const t = setInterval(() => { if (isMounted) broadcastProfile(); }, 4000);
                        return t;
                    } catch (e) { console.warn('RTM fail (ignore if not enabled)', e); }
                };

                const notifyJoin = async () => {
                    try {
                        const token = await getToken();
                        await fetch(`${import.meta.env.VITE_API_URL}/meetings/join`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                                'x-session-id': sessionID
                            },
                            body: JSON.stringify({
                                roomId,
                                userName: user?.fullName,
                                userAvatar: user?.imageUrl
                            }),
                        });
                    } catch (e) { console.warn('Join notify failed', e); }
                };

                await notifyJoin();
                joinRTC();
                const timer = await joinRTM();
                return () => timer && clearInterval(timer);

            } catch (e) { console.error("Agora Init Error", e); }
        };

        const initPromise = init();

        return () => {
            isMounted = false;
            rtmReady.current = false;
            initPromise.then(fn => fn && fn());
            if (localTracks.current.audio) { localTracks.current.audio.close(); localTracks.current.audio = null; }
            if (localTracks.current.video) { localTracks.current.video.close(); localTracks.current.video = null; }
            if (rtc.current) { rtc.current.leave().catch(() => { }); rtc.current.removeAllListeners(); }
            if (rtm.current) { rtm.current.logout().catch(() => { }); rtm.current.removeAllListeners(); }
        };
    }, [roomId]);

    const rtmPublish = (payload) => {
        if (!rtm.current || !rtmReady.current) return;
        rtm.current.publish(roomId, JSON.stringify(payload)).catch(() => { });
    };

    const sendMsg = (txt) => {
        const msg = { type: 'chat', text: txt, name: user?.fullName || 'Me', pic: user?.imageUrl };
        rtmPublish(msg);
        setMessages(p => [...p, { id: Date.now(), from: 'me', ...msg }]);
    };

    const sendReact = (key) => {
        const r = { type: 'react', key, name: user?.fullName || 'Me' };
        rtmPublish(r);
        setReactions(p => [...p, { id: Date.now(), ...r }]);
    };

    const syncState = (state) => {
        const fullState = { ...state, adminMuted };
        setPeerStates(p => ({ ...p, [sessionID]: fullState }));
        rtmPublish({ type: 'state', state: fullState });
    };

    const [botPhase, setBotPhase] = useState('idle');
    const [phaseMsg, setPhaseMsg] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [summary, setSummary] = useState(null);
    const countdownRef = useRef(null);

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

    const botFetch = async (path, opts = {}) => {
        const token = await getToken();
        return fetch(`${import.meta.env.VITE_API_URL}/vexa${path}`, {
            ...opts,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
        });
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
        const waitTime = attempt === 1 ? 3 : (attempt === 2 ? 5 : 10);
        setBotPhase('fetching');
        setPhaseMsg(`Synthesizing Notes…`);

        startCountdown(waitTime, async () => {
            try {
                const res = await botFetch(`/transcript/${roomId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data.segments || data.segments.length === 0) {
                        if (attempt < 6) {
                            setPhaseMsg(`Transcript empty, retrying…`);
                            await tryFetchTranscript(attempt + 1);
                        } else {
                            setBotPhase('error');
                            setPhaseMsg('Meeting was too short for notes.');
                        }
                        return;
                    }
                    setTranscript(data);
                    await runSummarize(data);
                } else if ((res.status === 422 || res.status === 404 || res.status === 400) && attempt < 8) {
                    // Vexa often takes a few seconds to "initialize" the transcript record
                    setPhaseMsg(`Processing bits…`);
                    await tryFetchTranscript(attempt + 1);
                } else {
                    const errData = await res.json().catch(() => ({}));
                    setBotPhase('error');
                    setPhaseMsg(errData.error || 'Transcript not available.');
                }
            } catch (err) {
                setBotPhase('error');
                setPhaseMsg('Connection error fetching notes.');
            }
        });
    };

    const toggleBot = async () => {
        if (['starting', 'stopping', 'fetching', 'summarizing'].includes(botPhase)) return;
        if (!botRunning) {
            setBotPhase('starting');
            setPhaseMsg('Connecting SmartMeet AI…');
            try {
                const res = await botFetch('/start', {
                    method: 'POST',
                    body: JSON.stringify({
                        meetingId: roomId,
                        origin: window.location.origin
                    })
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error('Bot start error details:', errData);
                    // Ensure we pass a string, not an object, to the Error constructor
                    const msg = typeof errData.error === 'string' ? errData.error : (JSON.stringify(errData.error || errData) || 'Vexa start failed');
                    throw new Error(msg);
                }
                const data = await res.json();
                setBotRunning(true);
                setBotPhase('running');
                setPhaseMsg('SmartMeet AI is listening');
            } catch (err) {
                setBotPhase('error');
                setPhaseMsg(err.message || 'Failed to start AI.');
                console.error('Bot start error:', err);
                setTimeout(() => { if (botPhase === 'error') setBotPhase('idle'); }, 4000);
            }
        } else {
            setBotPhase('stopping');
            setPhaseMsg('Stopping SmartMeet AI…');
            try {
                const res = await botFetch(`/stop/${roomId}`, { method: 'DELETE' });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Vexa stop failed');
                }
                setBotRunning(false);
                await tryFetchTranscript(1);
            } catch (err) {
                setBotPhase('error');
                setPhaseMsg(err.message || 'Failed to stop AI.');
                console.error('Bot stop error:', err);
            }
        }
    };

    const fetchTranscript = async () => {
        try {
            const res = await botFetch(`/transcript/${roomId}`);
            if (!res.ok) return;
            const data = await res.json();
            setTranscript(data);
            setShowTranscript(true);
        } catch (err) {
            console.error('Transcript fetch error:', err);
        }
    };

    const exportTranscript = (fmt) => {
        if (!transcript) return;
        let content, mime, ext;
        if (fmt === 'json') {
            content = JSON.stringify(transcript, null, 2);
            mime = 'application/json'; ext = 'json';
        } else {
            content = (transcript.segments || []).map(s => `${s.speaker},"${s.text.replace(/"/g, '\'')}",${s.startTime}`).join('\n');
            content = 'Speaker,Text,Start\n' + content;
            mime = 'text/csv'; ext = 'csv';
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = `smartmeet-transcript-${roomId}.${ext}`;
        a.click();
    };
    // ── Recording ───────────────────────────────────────────────────────────────
    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen', frameRate: 30 },
                audio: true,
            });
            recChunks.current = [];

            // Try different codecs for better browser compatibility
            const codecs = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
            let selectedCodec = '';
            for (const c of codecs) {
                if (MediaRecorder.isTypeSupported(c)) {
                    selectedCodec = c;
                    break;
                }
            }

            mediaRecorder.current = new MediaRecorder(stream, selectedCodec ? { mimeType: selectedCodec } : {});
            mediaRecorder.current.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data); };
            mediaRecorder.current.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                uploadRecording();
            };
            // Auto-stop if user closes browser share dialog
            stream.getVideoTracks()[0].onended = () => stopRecording();
            mediaRecorder.current.start(1000);
            setIsRecording(true);
            setRecSeconds(0);
            recTimer.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
        } catch (err) {
            if (err.name !== 'NotAllowedError') console.error('Recording error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
        }
        clearInterval(recTimer.current);
        setIsRecording(false);
    };

    const uploadRecording = async () => {
        if (recChunks.current.length === 0) return;
        setUploading(true);
        try {
            const blob = new Blob(recChunks.current, { type: 'video/webm' });
            const title = `Meeting ${roomId.toUpperCase()} — ${new Date().toLocaleDateString()}`;

            // Step 1: Upload directly to Cloudinary (no backend involved, no 4.5MB limit)
            const cloudForm = new FormData();
            cloudForm.append('file', blob, `rec_${roomId}_${Date.now()}.webm`);
            cloudForm.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
            cloudForm.append('folder', `smartsps/recordings`);

            const cloudRes = await fetch(
                `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/video/upload`,
                { method: 'POST', body: cloudForm }
            );
            const cloud = await cloudRes.json();
            if (!cloud.secure_url) throw new Error(cloud.error?.message || 'Cloudinary upload failed');

            // Step 2: Save metadata to our backend (tiny JSON)
            const token = await window.__getClerkToken?.();
            await fetch(`${import.meta.env.VITE_API_URL}/recordings/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    roomId,
                    title,
                    url: cloud.secure_url,
                    publicId: cloud.public_id,
                    thumbnail: cloud.secure_url.replace('/upload/', '/upload/f_jpg,w_400/').replace('.webm', '.jpg'),
                    duration: recSeconds,
                    size: cloud.bytes,
                    format: cloud.format,
                }),
            });

            if (user?.id) localStorage.removeItem(`recordings_${user.id}`);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            recChunks.current = [];
        }
    };


    const toggleMic = () => {
        if (adminMuted) return; // Locked by admin
        const n = !micOn;
        setMicOn(n);
        localTracks.current.audio?.setEnabled(n);
        syncState({ muted: !n, handRaised, adminMuted });
    };
    const toggleVideo = () => { const n = !videoOn; setVideoOn(n); localTracks.current.video?.setEnabled(n); };
    const toggleHand = () => { const n = !handRaised; setHandRaised(n); syncState({ muted: !micOn, handRaised: n, adminMuted }); };

    const handleLeave = async () => {
        try {
            if (isRecording) stopRecording();
            if (botRunning) {
                // Background fire-and-forget stop
                botFetch(`/stop/${roomId}`, { method: 'DELETE' }).catch(() => { });
            }
            const token = await getToken();
            await fetch(`${import.meta.env.VITE_API_URL}/meetings/end/${roomId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isHost) rtmPublish({ type: 'end_meeting' });
            if (user?.id) localStorage.removeItem(`meeting_history_${user.id}`);
        } catch (e) { }
        onLeave();
    };

    const forceMutePeer = (targetUid) => {
        if (!isHost) return;
        rtmPublish({ type: 'force_mute', target: String(targetUid) });
    };

    const forceUnmutePeer = (targetUid) => {
        if (!isHost) return;
        rtmPublish({ type: 'force_unmute', target: String(targetUid) });
    };

    // Expose Clerk token getter so uploadRecording can grab it without hook rules
    useEffect(() => { window.__getClerkToken = getToken; }, [getToken]);

    const stopShare = async () => {
        const track = screenTrack.current;
        screenTrack.current = null;
        setIsSharing(false);
        syncState({ muted: !micOn, handRaised, screenSharing: false });

        if (track) {
            try {
                await rtc.current?.unpublish(track);
            } catch (e) { console.warn("Unpublish screen failed", e); }
            track.close();
        }

        // Re-publish camera if it was on
        if (localTracks.current.video && videoOn) {
            try {
                await rtc.current?.publish(localTracks.current.video);
            } catch (e) { console.warn("Re-publish camera failed", e); }
        }
    };

    const toggleShare = async () => {
        if (isSharing) {
            await stopShare();
            return;
        }
        try {
            // Use 720p for better performance and compatibility
            const result = await AgoraRTC.createScreenVideoTrack(
                { encoderConfig: '720p_1', optimizationMode: 'detail' },
                'disable'
            );
            const track = Array.isArray(result) ? result[0] : result;

            // Unpublish camera before publishing screen
            if (localTracks.current.video) {
                await rtc.current.unpublish(localTracks.current.video).catch(() => { });
            }

            await rtc.current.publish(track);
            screenTrack.current = track;
            setIsSharing(true);
            syncState({ muted: !micOn, handRaised, screenSharing: true });

            // Auto-stop when user hits browser's native "Stop sharing" button
            track.on('track-ended', () => stopShare());
        } catch (err) {
            if (err.name !== 'NotAllowedError') console.error('Screen share error:', err);
            // Ensure camera is restored if share failed mid-way
            if (localTracks.current.video) {
                await rtc.current?.publish(localTracks.current.video).catch(() => { });
            }
            setIsSharing(false);
        }
    };


    const D = isDarkMode;
    const total = remoteUsers.length + 1;

    // Detect who is sharing (local or remote)
    const sharingPeerId = Object.entries(peerStates).find(([, s]) => s?.screenSharing)?.[0];
    const sharingRemoteUser = remoteUsers.find(u => String(u.id) === String(sharingPeerId));
    const anyoneSharing = isSharing || !!sharingRemoteUser;

    const isBot = !!new URLSearchParams(window.location.search).get('bot_token');
    const myData = {
        id: user?.id || (isBot ? 'bot' : 'guest'),
        userName: user?.fullName || (isBot ? 'SmartMeet AI' : 'Guest'),
        userAvatar: user?.imageUrl || '',
        videoTrack: localTracks.current.video,
        videoOn
    };

    return (
        <div className={cn(
            "h-screen flex flex-col overflow-hidden font-sans transition-colors duration-500",
            D ? "bg-premium-bg text-gray-100" : "bg-gray-100 text-gray-900"
        )}>
            <header className={cn(
                "h-16 px-6 flex items-center justify-between z-50 transition-all shrink-0",
                D ? "bg-premium-surface/90 border-b border-white/5 backdrop-blur-xl" : "bg-white/90 border-b border-gray-200 backdrop-blur-xl"
            )}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-premium-accent flex items-center justify-center shadow-lg shadow-premium-accent/20">
                        <VideoIcon size={18} className="text-white" />
                    </div>
                    <span className="font-extrabold text-lg tracking-tight">smartMeet</span>
                </div>

                <div className="flex items-center gap-4">
                    {isRecording && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-[11px] font-black tracking-widest uppercase">REC {fmtTime(recSeconds)}</span>
                        </div>
                    )}
                    {uploading && <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Saving...</span>}
                    <button
                        onClick={() => setShowInvite(true)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border",
                            D ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-200 hover:bg-white"
                        )}
                    >
                        Invite
                    </button>
                    <UserButton />
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col p-4 gap-4 overflow-hidden relative">
                {anyoneSharing ? (
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        {/* Spotlight Area */}
                        <div className="flex-1 relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 min-h-0 group">
                            {isSharing
                                ? <ScreenSharePlayer track={screenTrack.current} />
                                : <RemoteVideoPlayer videoTrack={sharingRemoteUser?.videoTrack} />
                            }

                            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 transition-transform group-hover:scale-105">
                                <ScreenShare size={14} className="text-premium-accent" />
                                <span className="text-xs font-bold text-white">
                                    {isSharing ? 'You are presenting' : `${sharingRemoteUser?.userName || 'Someone'} is presenting`}
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        </div>

                        {/* Strip Area */}
                        <div className="h-32 flex gap-3 overflow-x-auto overflow-y-hidden pb-1 scrollbar-none snap-x flex-shrink-0">
                            <div className="w-[180px] sm:w-[220px] flex-shrink-0 snap-start">
                                <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} activeSpeaker={activeSpeaker === 'me'} small />
                            </div>
                            {remoteUsers.map(u => (
                                <div key={u.id} className="w-[180px] sm:w-[220px] flex-shrink-0 snap-start">
                                    <UserTile
                                        user={u}
                                        isDark={D}
                                        peerState={peerStates[u.id]}
                                        activeSpeaker={activeSpeaker === u.id}
                                        isHost={isHost}
                                        onForceMute={() => forceMutePeer(u.id)}
                                        onForceUnmute={() => forceUnmutePeer(u.id)}
                                        small
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Dynamic Fluid Grid View */
                    <div className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-none flex flex-wrap items-center justify-center content-center gap-4">
                        <div className={cn(
                            "transition-all duration-500 flex items-center justify-center",
                            total === 1 ? "w-full max-w-4xl aspect-video" :
                                total === 2 ? "w-full md:w-[calc(50%-1rem)] aspect-video" :
                                    total <= 4 ? "w-[calc(50%-1rem)] aspect-video" :
                                        total <= 9 ? "w-[calc(50%-1rem)] md:w-[calc(33.33%-1rem)] aspect-video" :
                                            "w-[calc(50%-1rem)] md:w-[calc(25%-1rem)] aspect-video"
                        )}>
                            <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} activeSpeaker={activeSpeaker === 'me'} />
                        </div>

                        <AnimatePresence mode="popLayout">
                            {remoteUsers.map(u => (
                                <motion.div
                                    key={u.id}
                                    layout
                                    className={cn(
                                        "transition-all duration-500 flex items-center justify-center",
                                        total === 2 ? "w-full md:w-[calc(50%-1rem)] aspect-video" :
                                            total <= 4 ? "w-[calc(50%-1rem)] aspect-video" :
                                                total <= 9 ? "w-[calc(50%-1rem)] md:w-[calc(33.33%-1rem)] aspect-video" :
                                                    "w-[calc(50%-1rem)] md:w-[calc(25%-1rem)] aspect-video"
                                    )}
                                >
                                    <UserTile
                                        user={u}
                                        isDark={D}
                                        peerState={peerStates[u.id]}
                                        activeSpeaker={activeSpeaker === u.id}
                                        isHost={isHost}
                                        onForceMute={() => forceMutePeer(u.id)}
                                        onForceUnmute={() => forceUnmutePeer(u.id)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Bot HUD */}
                <AnimatePresence>
                    {['starting', 'stopping', 'fetching', 'summarizing'].includes(botPhase) && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3.5 rounded-2xl bg-white border border-black shadow-2xl flex items-center gap-3 text-black"
                        >
                            <Loader2 size={18} className="animate-spin text-black" />
                            <div className="text-sm font-black tracking-widest uppercase text-black">
                                {phaseMsg} {countdown > 0 && <span className="opacity-50 font-normal">({countdown}s)</span>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className={cn(
                "h-20 flex items-center justify-center gap-2 sm:gap-3 z-50 transition-all shrink-0",
                D ? "bg-premium-surface/90 border-t border-white/5" : "bg-white/90 border-t border-gray-200"
            )}>
                <div className="flex items-center gap-2 sm:gap-3 h-full px-4">
                    <button
                        onClick={toggleMic}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            micOn ? (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900") : "bg-black text-white shadow-lg"
                        )}
                    >
                        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            videoOn ? (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900") : "bg-black text-white shadow-lg"
                        )}
                    >
                        {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                    </button>

                    <button
                        onClick={toggleShare}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            isSharing ? "bg-premium-accent text-white shadow-lg shadow-premium-accent/20" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                        )}
                    >
                        <ScreenShare size={20} />
                    </button>

                    <button
                        onClick={toggleHand}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            handRaised ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                        )}
                    >
                        <Hand size={20} />
                    </button>

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            isRecording ? "bg-black text-white shadow-lg shadow-black/20" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                        )}
                    >
                        <Circle size={20} fill={isRecording ? 'currentColor' : 'none'} className={isRecording ? 'animate-pulse' : ''} />
                    </button>

                    <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />

                    {/* AI Bot Toggle */}
                    {isHost && (
                        <button
                            onClick={toggleBot}
                            disabled={['starting', 'stopping', 'fetching', 'summarizing'].includes(botPhase)}
                            className={cn(
                                "h-11 px-4 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 active:scale-95",
                                botRunning ? "bg-black/20 text-black border border-black/30 shadow-lg shadow-black/10" : (D ? "bg-white/5 hover:bg-white/10 text-white border border-transparent" : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-transparent"),
                                ['starting', 'stopping', 'fetching', 'summarizing'].includes(botPhase) && "cursor-wait opacity-50"
                            )}
                        >
                            <Sparkles size={16} className={cn(botRunning && "animate-pulse")} />
                            <span className="hidden md:block">
                                {botPhase === 'starting' ? 'Connecting...' :
                                    botPhase === 'stopping' ? 'Processing...' :
                                        botPhase === 'fetching' || botPhase === 'summarizing' ? 'Analyzing...' :
                                            botRunning ? 'AI ACTIVE' : 'AI NOTES'}
                            </span>
                        </button>
                    )}

                    {transcript && (
                        <button
                            onClick={() => setShowTranscript(v => !v)}
                            className="h-11 px-4 rounded-xl bg-white/5 text-white border border-white/10 font-black text-[10px] tracking-widest uppercase transition-all hover:bg-white/10 active:scale-95 shadow-xl"
                        >
                            📝 <span className="hidden md:inline ml-1">TRANSCRIPT</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowReacts(true)}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        )}
                    >
                        <span className="text-xl leading-none">😊</span>
                    </button>

                    <button
                        onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer relative",
                            panel === 'chat' ? "bg-premium-accent text-white" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                        )}
                    >
                        <MessageSquare size={20} />
                        {messages.length > 0 && panel !== 'chat' && <span className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full border-2 border-premium-surface" />}
                    </button>

                    <button
                        onClick={handleLeave}
                        className="h-11 px-6 rounded-xl bg-black hover:bg-black/90 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 border-none cursor-pointer flex items-center gap-2"
                    >
                        <PhoneOff size={16} />
                        Leave Room
                    </button>
                </div>
            </footer>

            {/* Transcript Sidebar */}
            <AnimatePresence>
                {showTranscript && (
                    <motion.div
                        initial={{ x: 380, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 380, opacity: 0 }}
                        className={cn(
                            "fixed right-0 top-0 bottom-0 w-full sm:w-[380px] z-[1000] border-l shadow-2xl flex flex-col backdrop-blur-3xl transition-all",
                            D ? "bg-premium-surface/95 border-white/10" : "bg-white/95 border-gray-200"
                        )}
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="m-0 text-base font-black tracking-tight flex items-center gap-2">
                                    <Circle size={12} className="text-black fill-black animate-pulse" />
                                    AI MEETING NOTES
                                </h3>
                                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1 truncate max-w-[200px]">
                                    {(transcript?.participants || []).join(', ') || 'Processing...'}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => exportTranscript('json')} className="p-2 rounded-lg bg-premium-accent/10 text-premium-accent hover:bg-premium-accent/20 transition-colors border-none cursor-pointer"><Send size={16} /></button>
                                <button onClick={() => setShowTranscript(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors border-none cursor-pointer text-gray-400 hover:text-white"><X size={18} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-none">
                            {summary && (
                                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
                                    {summary.overview && (
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <label className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block">Executive Summary</label>
                                            <p className="text-sm leading-relaxed opacity-90">{summary.overview}</p>
                                        </div>
                                    )}

                                    {summary.keyPoints?.length > 0 && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black opacity-40 uppercase tracking-widest block">Key Points</label>
                                            <div className="space-y-2">
                                                {summary.keyPoints.map((p, i) => (
                                                    <div key={i} className="flex gap-3 text-sm leading-relaxed group">
                                                        <span className="text-black font-bold">•</span>
                                                        <span className="opacity-80 group-hover:opacity-100 transition-opacity">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {summary.actionItems?.length > 0 && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-black uppercase tracking-widest block font-serif">Action Items</label>
                                            <div className="space-y-2">
                                                {summary.actionItems.map((p, i) => (
                                                    <div key={i} className="text-sm opacity-80 flex gap-2.5 leading-snug p-2 rounded-xl bg-black/5 border border-black/10">
                                                        <span className="text-black font-bold">❑</span> {p}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            <div className="relative pt-6">
                                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5" />
                                <label className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-6 block text-center">Full Transcript</label>

                                <div className="space-y-5">
                                    {(transcript?.segments || []).length === 0 ? (
                                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-2 border-premium-accent border-t-transparent rounded-full animate-spin" />
                                            <p className="text-xs font-bold tracking-widest uppercase">Synthesizing audio...</p>
                                        </div>
                                    ) : (transcript?.segments || []).map((seg, i) => (
                                        <div key={i} className="space-y-1.5 group">
                                            <div className="flex justify-between items-center text-[9px] font-black tracking-widest uppercase px-1">
                                                <span className="text-black">{seg.speaker}</span>
                                                <span className="opacity-30 tracking-tight">{new Date(seg.startTime * 1000).toISOString().substr(11, 8)}</span>
                                            </div>
                                            <div className={cn(
                                                "p-4 rounded-2xl text-sm leading-relaxed transition-all group-hover:translate-x-1",
                                                D ? "bg-white/[0.03] border border-white/5" : "bg-gray-50 border border-gray-100 shadow-sm"
                                            )}>
                                                {seg.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {panel === 'chat' && (
                    <motion.div
                        initial={{ x: 340, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 340, opacity: 0 }}
                        className={cn(
                            "fixed right-0 top-0 bottom-0 w-full sm:w-[340px] z-[1000] border-l shadow-2xl flex flex-col backdrop-blur-3xl transition-all",
                            D ? "bg-premium-surface/90 border-white/10" : "bg-white/95 border-gray-200"
                        )}
                    >
                        <ChatPanel messages={messages} onSend={sendMsg} onClose={() => setPanel(null)} isDark={D} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showReacts && <SelectionModal options={REACTIONS} onSelect={sendReact} onClose={() => setShowReacts(false)} isDark={D} />}
            </AnimatePresence>

            <AnimatePresence>
                {reactions.map(r => <FloatingReaction key={r.id} reactionKey={r.key} name={r.name} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />)}
            </AnimatePresence>

            <AnimatePresence>
                {showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} isDark={D} />}
            </AnimatePresence>
        </div>
    );
};

const SelectionModal = ({ options, onSelect, onClose, isDark }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[2000] p-6"
    >
        <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            className={cn(
                "p-8 rounded-[32px] grid grid-cols-4 gap-4 shadow-2xl border transition-all",
                isDark ? "bg-[#1a1010] border-white/10" : "bg-white border-black/5"
            )}
        >
            {options.map(o => {
                const Icon = o.icon;
                return (
                    <button
                        key={o.key}
                        onClick={() => { onSelect(o.key); onClose(); }}
                        className={cn(
                            "aspect-square flex items-center justify-center rounded-2xl hover:scale-110 active:scale-95 transition-all bg-black/5 hover:bg-black/10 border-none cursor-pointer p-4",
                            o.color
                        )}
                    >
                        <Icon size={32} fill="currentColor" />
                    </button>
                );
            })}
        </motion.div>
    </motion.div>
);

const ChatPanel = ({ messages, onSend, onClose, isDark }) => {
    const [t, setT] = useState('');
    const scrollRef = useRef();

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="m-0 text-base font-black tracking-tight flex items-center gap-2">
                    <MessageSquare size={16} className="text-black" />
                    MEETING CHAT
                </h3>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors border-none cursor-pointer text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
                        <MessageSquare size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[.2em]">Start the conversation</p>
                    </div>
                ) : messages.map((m, i) => (
                    <div key={m.id || i} className={cn(
                        "flex flex-col gap-1",
                        m.from === 'me' ? "items-end" : "items-start"
                    )}>
                        {m.from !== 'me' && <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">{m.userName}</span>}
                        <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] break-words leading-relaxed transition-all",
                            m.from === 'me' ? "bg-black text-white rounded-tr-none" : (isDark ? "bg-white/5 text-white border border-white/5 rounded-tl-none" : "bg-gray-100 text-gray-900 border border-gray-200 rounded-tl-none")
                        )}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-black/20 backdrop-blur-xl border-t border-white/5 shrink-0">
                <form
                    onSubmit={e => { e.preventDefault(); if (t.trim()) { onSend(t); setT(''); } }}
                    className="flex gap-2"
                >
                    <input
                        autoFocus
                        value={t}
                        onChange={e => setT(e.target.value)}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all outline-none border-none",
                            isDark ? "bg-white/5 text-white focus:bg-white/10 placeholder:text-white/20" : "bg-gray-50 text-gray-900 focus:bg-white border border-gray-200 placeholder:text-gray-400"
                        )}
                        placeholder="Message everyone..."
                    />
                    <button
                        type="submit"
                        disabled={!t.trim()}
                        className="w-12 h-11 flex items-center justify-center rounded-xl bg-black text-white hover:bg-black transition-all active:scale-95 disabled:opacity-30 disabled:grayscale border-none cursor-pointer shadow-lg shadow-black/20"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

const InviteModal = ({ roomId, onClose, isDark }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[2000] p-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
                className={cn(
                    "p-8 rounded-[38px] w-full max-w-sm border shadow-2xl transition-all",
                    isDark ? "bg-premium-surface border-white/10 text-white" : "bg-white border-black/5 text-gray-900"
                )}
            >
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-[22px] bg-black/10 flex items-center justify-center">
                        <MessageSquare size={32} className="text-black" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black tracking-tighter m-0">Invite People</h2>
                        <p className="text-sm opacity-50 font-bold tracking-tight mt-1 px-4">Share this code with your participants to join the session</p>
                    </div>

                    <div className={cn(
                        "w-full p-6 rounded-3xl border flex flex-col gap-1 items-center justify-center transition-all",
                        isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                    )}>
                        <span className="text-[10px] font-black uppercase tracking-[.3em] opacity-40">Meeting Code</span>
                        <code className="text-3xl font-black tracking-[.2em] text-black">{roomId.toUpperCase()}</code>
                    </div>

                    <div className="w-full flex flex-col gap-3 mt-2">
                        <button
                            onClick={copy}
                            className={cn(
                                "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-none cursor-pointer",
                                copied ? "bg-black text-white border border-black" : "bg-black text-white hover:bg-black shadow-xl shadow-black/30"
                            )}
                        >
                            {copied ? <><X size={16} className="text-black" /> COPIED!</> : 'COPY MEETING LINK'}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-4 text-[10px] font-black tracking-[.2em] uppercase opacity-40 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
                        >
                            Back to Meeting
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default MeetingRoom;
