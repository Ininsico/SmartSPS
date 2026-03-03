import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
    MessageSquare, PhoneOff, Hand, X, Send, Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser, useAuth } from '@clerk/clerk-react';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

const REACTIONS = [
    { key: 'like', icon: '👍', color: '#3b82f6' },
    { key: 'love', icon: '❤️', color: '#ef4444' },
    { key: 'haha', icon: '😂', color: '#f59e0b' },
    { key: 'wow', icon: '😮', color: '#8b5cf6' },
    { key: 'fire', icon: '🔥', color: '#f97316' },
    { key: 'star', icon: '⭐', color: '#eab308' },
    { key: 'party', icon: '🎉', color: '#ec4899' },
    { key: 'magic', icon: '✨', color: '#a855f7' },
];
const reactionByKey = Object.fromEntries(REACTIONS.map(r => [r.key, r]));

const gradOver = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)', pointerEvents: 'none' };
const videoFill = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const nameTag = { position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '3px 9px', color: '#fff', fontSize: '0.73rem', fontWeight: 700 };

function tileStyle(handUp, small = false) {
    return { position: 'relative', borderRadius: small ? '0.7rem' : '1.1rem', overflow: 'hidden', background: '#0a0a0a', ...(small ? { height: '100%', width: '100%' } : { aspectRatio: '16/9', width: '100%' }), boxShadow: handUp ? '0 0 0 3px #f6c90e, 0 8px 32px rgba(0,0,0,0.55)' : '0 6px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)', transition: 'box-shadow 0.25s' };
}

const FloatingReaction = ({ reactionKey, name, onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
    const r = reactionByKey[reactionKey];
    if (!r) return null;
    return (
        <motion.div initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -200, scale: 1.5 }} transition={{ duration: 3, ease: 'easeOut' }} style={{ position: 'fixed', bottom: 110, right: Math.random() * 200 + 40, zIndex: 900, pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 5 }}>{r.icon}</div>
            <div style={{ fontSize: '0.65rem', color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>{name}</div>
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
    return <div ref={videoRef} style={videoFill} />;
};

const ScreenSharePlayer = ({ track }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (track && ref.current) track.play(ref.current);
    }, [track]);
    return <div ref={ref} style={{ width: '100%', height: '100%', background: '#000' }} />;
};

const UserTile = ({ user, isDark, isYou = false, peerState, small = false }) => {
    const initials = user.userName ? user.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    const isMuted = peerState?.muted ?? false;
    const handUp = peerState?.handRaised ?? false;
    const videoRef = useRef(null);

    useEffect(() => {
        if (isYou && user.videoTrack && videoRef.current) {
            user.videoTrack.play(videoRef.current);
        }
    }, [isYou, user.videoTrack]);

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={tileStyle(handUp, small)}>
            {isYou ? (
                <div ref={videoRef} style={videoFill} />
            ) : user.videoTrack ? (
                <RemoteVideoPlayer videoTrack={user.videoTrack} audioTrack={user.audioTrack} />
            ) : null}

            {(!user.videoTrack || (isYou && !user.videoOn)) && (
                <div style={{ position: 'absolute', inset: 0, background: isDark ? '#140c0c' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <div style={{ width: small ? 44 : 80, height: small ? 44 : 80, borderRadius: '50%', overflow: 'hidden', background: isDark ? '#2a1a1a' : '#d0d0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.1)' }}>
                        {user.userAvatar ? <img src={user.userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: small ? '1rem' : '1.8rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>{initials}</span>}
                    </div>
                </div>
            )}

            {handUp && <div style={{ position: 'absolute', top: 8, left: 8, fontSize: small ? '1rem' : '1.4rem', zIndex: 10 }}>✋</div>}
            <div style={{ ...nameTag, fontSize: small ? '0.65rem' : '0.73rem', padding: small ? '2px 6px' : '3px 9px' }}>
                {user.userAvatar && <img src={user.userAvatar} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />}
                <span>{user.userName || (isYou ? 'You' : 'Loading...')}</span>
                {isMuted && <MicOff size={11} color="#fc8181" />}
            </div>
            <div style={gradOver} />
        </motion.div>
    );
};

const MeetingRoom = ({ roomId, onLeave, initialConfig, isDarkMode, setIsDarkMode }) => {
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
    const [showInvite, setShowInvite] = useState(false);
    const [showReacts, setShowReacts] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isRecording, setIsRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const [uploading, setUploading] = useState(false);

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
                rtc.current.on('user-left', (u) => setRemoteUsers(p => p.filter(x => x.id !== u.uid)));

                const broadcastProfile = () => {
                    if (isMounted && rtm.current) {
                        rtm.current.publish(roomId, JSON.stringify({ type: 'profile', name: user?.fullName || 'Guest', pic: user?.imageUrl })).catch(() => { });
                    }
                };

                rtm.current.on('message', (ev) => {
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

    const syncState = (s) => rtmPublish({ type: 'state', state: s });
    // ── Recording ───────────────────────────────────────────────────────────────
    const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen', frameRate: 30 },
                audio: true,
            });
            recChunks.current = [];
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
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


    const toggleMic = () => { const n = !micOn; setMicOn(n); localTracks.current.audio?.setEnabled(n); syncState({ muted: !n, handRaised }); };
    const toggleVideo = () => { const n = !videoOn; setVideoOn(n); localTracks.current.video?.setEnabled(n); };
    const toggleHand = () => { const n = !handRaised; setHandRaised(n); syncState({ muted: !micOn, handRaised: n }); };

    // Expose Clerk token getter so uploadRecording can grab it without hook rules
    useEffect(() => { window.__getClerkToken = getToken; }, [getToken]);

    const stopShare = async () => {
        const track = screenTrack.current;
        screenTrack.current = null;
        setIsSharing(false);
        syncState({ muted: !micOn, handRaised, screenSharing: false });

        if (track) {
            // Suppress errors — track may already be ended (browser stop button)
            await rtc.current?.unpublish(track).catch(() => { });
            track.close();
        }

        // Always re-publish camera after screen share ends
        if (localTracks.current.video) {
            await rtc.current?.publish(localTracks.current.video).catch(() => { });
        }
    };

    const toggleShare = async () => {
        if (isSharing) {
            await stopShare();
            return;
        }
        try {
            // 'disable' = no audio capture → always returns a single VideoTrack
            const result = await AgoraRTC.createScreenVideoTrack(
                { encoderConfig: '1080p_1', optimizationMode: 'detail' },
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
    const bb = D ? 'rgba(12,8,8,0.97)' : 'rgba(255,255,255,0.97)';
    const bd = D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
    const total = remoteUsers.length + 1;

    // Detect who is sharing (local or remote)
    const sharingPeerId = Object.entries(peerStates).find(([, s]) => s?.screenSharing)?.[0];
    const sharingRemoteUser = remoteUsers.find(u => String(u.id) === String(sharingPeerId));
    const anyoneSharing = isSharing || !!sharingRemoteUser;

    const myData = { ...user, userName: user?.fullName, userAvatar: user?.imageUrl, videoTrack: localTracks.current.video, videoOn };

    return (
        <div style={{ height: '100vh', background: D ? '#090909' : '#f0f0f4', color: D ? '#f0f0f0' : '#1a1a1a', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ height: 66, padding: '0 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bb, borderBottom: `1px solid ${bd}`, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontWeight: 800, fontSize: '1.2rem' }}>smartMeet</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isRecording && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(229,62,62,0.15)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(229,62,62,0.3)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53e3e', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#e53e3e' }}>REC {fmtTime(recSeconds)}</span>
                        </div>
                    )}
                    {uploading && <span style={{ fontSize: '0.75rem', color: '#888' }}>Uploading recording…</span>}
                    <button onClick={() => setShowInvite(true)} style={{ padding: '7px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${bd}`, color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Invite</button>
                    <UserButton />
                </div>
            </header>

            <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0.85rem', gap: '0.75rem', overflow: 'hidden' }}>
                {anyoneSharing ? (
                    <>
                        {/* ── Spotlight: big screen share area ── */}
                        <div style={{ flex: 1, position: 'relative', borderRadius: '1.1rem', overflow: 'hidden', background: '#000', minHeight: 0 }}>
                            {isSharing
                                ? <ScreenSharePlayer track={screenTrack.current} />
                                : <RemoteVideoPlayer videoTrack={sharingRemoteUser?.videoTrack} />
                            }
                            <div style={{ ...nameTag, bottom: 14, left: 14, fontSize: '0.82rem', padding: '5px 13px', gap: 7 }}>
                                <ScreenShare size={13} />
                                <span>{isSharing ? 'You are presenting' : `${sharingRemoteUser?.userName || 'Someone'} is presenting`}</span>
                            </div>
                            <div style={gradOver} />
                        </div>

                        {/* ── Participant strip at bottom ── */}
                        <div style={{ height: 130, display: 'flex', gap: '0.65rem', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
                            {/* Local camera */}
                            <div style={{ width: 210, flexShrink: 0 }}>
                                <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} small />
                            </div>
                            {remoteUsers.map(u => (
                                <div key={u.id} style={{ width: 210, flexShrink: 0 }}>
                                    <UserTile user={u} isDark={D} peerState={peerStates[u.id]} small />
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    /* ── Normal equal grid layout ── */
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${isMobile ? (total > 2 ? 2 : 1) : (total <= 2 ? 2 : 3)}, 1fr)`, gap: '1rem', alignContent: 'center', height: '100%' }}>
                        <UserTile isYou user={myData} isDark={D} peerState={{ muted: !micOn, handRaised }} />
                        <AnimatePresence>{remoteUsers.map(u => <UserTile key={u.id} user={u} isDark={D} peerState={peerStates[u.id]} />)}</AnimatePresence>
                    </div>
                )}
            </main>

            <footer style={{ height: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: bb, borderTop: `1px solid ${bd}` }}>
                <button onClick={toggleMic} style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: micOn ? 'rgba(255,255,255,0.05)' : '#e53e3e', color: micOn ? 'inherit' : '#fff' }}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
                <button onClick={toggleVideo} style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: videoOn ? 'rgba(255,255,255,0.05)' : '#e53e3e', color: videoOn ? 'inherit' : '#fff' }}>{videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}</button>
                <button onClick={toggleShare} style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: isSharing ? 'rgba(229,62,62,0.13)' : 'rgba(255,255,255,0.05)', color: isSharing ? '#e53e3e' : 'inherit' }}><ScreenShare size={20} /></button>
                <button onClick={toggleHand} style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: handRaised ? 'rgba(246,201,14,0.2)' : 'rgba(255,255,255,0.05)', color: handRaised ? '#f6c90e' : 'inherit' }}><Hand size={20} /></button>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: isRecording ? 'rgba(229,62,62,0.2)' : 'rgba(255,255,255,0.05)', color: isRecording ? '#e53e3e' : 'inherit', position: 'relative' }}
                >
                    <Circle size={20} fill={isRecording ? '#e53e3e' : 'none'} />
                </button>
                <button onClick={() => setShowReacts(true)} style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.05)' }}>😊</button>
                <button onClick={() => setPanel(panel === 'chat' ? null : 'chat')} style={{ width: 46, height: 46, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.05)' }}><MessageSquare size={20} /></button>
                <button onClick={() => {
                    if (isRecording) stopRecording();
                    if (user?.id) localStorage.removeItem(`meeting_history_${user.id}`);
                    onLeave();
                }} style={{ width: 60, height: 46, borderRadius: 12, border: 'none', background: '#e53e3e', color: '#fff' }}><PhoneOff size={20} /></button>
            </footer>

            <AnimatePresence>{panel === 'chat' && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 340, background: bb, borderLeft: `1px solid ${bd}`, zIndex: 1000 }}><ChatPanel messages={messages} onSend={sendMsg} onClose={() => setPanel(null)} isDark={D} /></div>}</AnimatePresence>
            <AnimatePresence>{showReacts && <SelectionModal options={REACTIONS} onSelect={sendReact} onClose={() => setShowReacts(false)} isDark={D} />}</AnimatePresence>
            <AnimatePresence>{reactions.map(r => <FloatingReaction key={r.id} reactionKey={r.key} name={r.name} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />)}</AnimatePresence>
            <AnimatePresence>{showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} isDark={D} />}</AnimatePresence>
        </div>
    );
};

const SelectionModal = ({ options, onSelect, onClose, isDark }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1a1010' : '#fff', padding: '1.5rem', borderRadius: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {options.map(o => <button key={o.key} onClick={() => { onSelect(o.key); onClose(); }} style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', padding: 10 }}>{o.icon}</button>)}
        </div>
    </motion.div>
);

const ChatPanel = ({ messages, onSend, onClose, isDark }) => {
    const [t, setT] = useState('');
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800 }}>Chat</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888' }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {messages.map(m => <div key={m.id} style={{ marginBottom: 12, textAlign: m.from === 'me' ? 'right' : 'left' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{m.userName}</div>
                    <div style={{ padding: '8px 12px', borderRadius: 12, background: m.from === 'me' ? '#e53e3e' : 'rgba(255,255,255,0.05)', display: 'inline-block', maxWidth: '85%', wordBreak: 'break-word' }}>{m.text}</div>
                </div>)}
            </div>
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
                <input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && (onSend(t), setT(''))} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '8px 12px', color: isDark ? '#fff' : '#000' }} placeholder="Type..." />
                <button onClick={() => (onSend(t), setT(''))} style={{ padding: '8px 16px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff' }}><Send size={14} /></button>
            </div>
        </div>
    );
};

const InviteModal = ({ roomId, onClose, isDark }) => {
    const copy = () => navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1a1010' : '#fff', padding: '2rem', borderRadius: 24, width: '100%', maxWidth: 400 }}>
                <h2 style={{ margin: '0 0 1rem' }}>Invite People</h2>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 12, textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.5rem' }}>{roomId.toUpperCase()}</div>
                <button onClick={copy} style={{ width: '100%', padding: '12px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700 }}>Copy Meeting Link</button>
            </div>
        </motion.div>
    );
};

export default MeetingRoom;
