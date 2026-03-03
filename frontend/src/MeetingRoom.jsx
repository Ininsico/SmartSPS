import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
    MessageSquare, Users, Settings, PhoneOff, Hand, Shield,
    Sun, Moon, Copy, Check, Link2, X, UserPlus, Wifi, WifiOff,
    Send, Crown, Volume2, VolumeX,
    ThumbsUp, Heart, Laugh, Zap, Flame, Star, PartyPopper, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser } from '@clerk/clerk-react';
import { mediaManager } from './mediaManager';

/* ─── ICE config — STUN + free TURN relay ─── */
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:80?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
};

const REACTIONS = [
    { key: 'like', Icon: ThumbsUp, label: 'Like', color: '#3b82f6' },
    { key: 'love', Icon: Heart, label: 'Love', color: '#ef4444' },
    { key: 'haha', Icon: Laugh, label: 'Haha', color: '#f59e0b' },
    { key: 'wow', Icon: Zap, label: 'Wow', color: '#8b5cf6' },
    { key: 'fire', Icon: Flame, label: 'Fire', color: '#f97316' },
    { key: 'star', Icon: Star, label: 'Star', color: '#eab308' },
    { key: 'party', Icon: PartyPopper, label: 'Party', color: '#ec4899' },
    { key: 'magic', Icon: Sparkles, label: 'Magic', color: '#a855f7' },
];
const reactionByKey = Object.fromEntries(REACTIONS.map(r => [r.key, r]));

/* ─── shared styles ─── */
const gradOver = { position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%)', pointerEvents: 'none' };
const videoFill = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const nameTag = { position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '3px 9px', color: '#fff', fontSize: '0.73rem', fontWeight: 700 };

function tileStyle(handUp) {
    return { position: 'relative', borderRadius: '1.1rem', overflow: 'hidden', background: '#111', aspectRatio: '16/9', boxShadow: handUp ? '0 0 0 3px #f6c90e,0 8px 32px rgba(0,0,0,0.55)' : '0 6px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)', transition: 'box-shadow 0.25s', width: '100%' };
}

/* ─── Floating Reaction ─── */
const FloatingReaction = ({ reactionKey, name, onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
    const r = reactionByKey[reactionKey];
    if (!r) return null;
    const { Icon, color } = r;
    return (
        <motion.div initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -200, scale: 1.5 }} transition={{ duration: 3, ease: 'easeOut' }}
            style={{ position: 'fixed', bottom: 110, right: Math.random() * 200 + 40, zIndex: 900, pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${color}22`, border: `2px solid ${color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <Icon size={26} color={color} strokeWidth={2.2} />
            </div>
            <div style={{ fontSize: '0.65rem', color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '2px 7px', marginTop: 5, fontWeight: 700 }}>{name}</div>
        </motion.div>
    );
};

/* ─── ConnBadge ─── */
const ConnBadge = ({ state }) => {
    const cfg = { connected: { color: '#48bb78', icon: <Wifi size={9} />, label: 'Live' }, connecting: { color: '#ed8936', icon: <Wifi size={9} />, label: 'Connecting…' }, disconnected: { color: '#fc8181', icon: <WifiOff size={9} />, label: 'Offline' } }[state] || { color: '#888', icon: null, label: state };
    return <div style={{ position: 'absolute', top: 9, right: 9, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: `1px solid ${cfg.color}44`, borderRadius: 99, padding: '3px 8px', color: cfg.color, fontSize: '0.62rem', fontWeight: 700 }}>{cfg.icon}{cfg.label}</div>;
};

/* ─── Remote Tile — takes a stream directly (no simple-peer) ─── */
const RemoteTile = ({ stream, name, avatar, isDark, connState, isHost, onAdminMute, socketId, isMuted, handUp }) => {
    const ref = useRef();
    useEffect(() => { if (ref.current) ref.current.srcObject = stream || null; }, [stream]);
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} style={tileStyle(handUp)}>
            <video playsInline autoPlay ref={ref} style={videoFill} />
            <div style={gradOver} />
            {!stream && (
                <div style={{ position: 'absolute', inset: 0, background: isDark ? '#1a1010' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: isDark ? '#2a1a1a' : '#d0d0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.08)' }}>
                        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.7rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }}>{initials}</span>}
                    </div>
                </div>
            )}
            <ConnBadge state={connState || 'connecting'} />
            {handUp && <div style={{ position: 'absolute', top: 9, left: 9, fontSize: '1.3rem' }}>✋</div>}
            {isHost && (
                <button onClick={() => onAdminMute(socketId, isMuted)} title={isMuted ? 'Request Unmute' : 'Mute'}
                    style={{ position: 'absolute', top: 9, left: handUp ? 44 : 9, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 99, padding: '4px 8px', cursor: 'pointer', color: isMuted ? '#fc8181' : '#48bb78', display: 'flex', alignItems: 'center' }}>
                    {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                </button>
            )}
            <div style={nameTag}>
                {avatar && <img src={avatar} alt="" style={{ width: 15, height: 15, borderRadius: '50%', objectFit: 'cover' }} />}
                <span>{name}</span>
                {isMuted && <MicOff size={10} color="#fc8181" />}
            </div>
        </motion.div>
    );
};

/* ─── Chat Panel ─── */
const ChatPanel = ({ messages, onSend, onClose, isDark, tc, bd, mc }) => {
    const [text, setText] = useState('');
    const scrollRef = useRef();
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
    const send = () => { if (text.trim()) { onSend(text); setText(''); } };
    return (
        <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ type: 'spring', damping: 26, stiffness: 210 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${bd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: tc, letterSpacing: '-0.4px' }}>Chat</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mc, display: 'flex', padding: 4, borderRadius: 6 }}><X size={17} /></button>
            </div>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, color: mc, fontSize: '0.68rem', fontWeight: 700 }}>
                            {m.from !== 'me' && m.userAvatar && <img src={m.userAvatar} alt="" style={{ width: 13, height: 13, borderRadius: '50%' }} />}
                            <span>{m.from === 'me' ? 'You' : m.userName}</span>
                        </div>
                        <div style={{ padding: '9px 13px', borderRadius: 13, fontSize: '0.88rem', lineHeight: 1.45, maxWidth: '84%', wordBreak: 'break-word', background: m.from === 'me' ? '#e53e3e' : (isDark ? 'rgba(255,255,255,0.07)' : '#f0f0f4'), color: m.from === 'me' ? '#fff' : tc, borderBottomRightRadius: m.from === 'me' ? 2 : 13, borderBottomLeftRadius: m.from === 'me' ? 13 : 2 }}>{m.text}</div>
                    </div>
                ))}
            </div>
            <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${bd}`, display: 'flex', gap: 8, flexShrink: 0 }}>
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Say something…"
                    style={{ flex: 1, padding: '9px 14px', borderRadius: 9, border: `1px solid ${bd}`, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', color: tc, fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={send} disabled={!text.trim()}
                    style={{ width: 38, height: 38, borderRadius: 9, border: 'none', cursor: text.trim() ? 'pointer' : 'default', background: text.trim() ? '#e53e3e' : (isDark ? 'rgba(255,255,255,0.06)' : '#eee'), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', flexShrink: 0 }}>
                    <Send size={14} />
                </button>
            </div>
        </motion.div>
    );
};

/* ─── Participants Panel ─── */
const ParticipantsPanel = ({ peers, peerStates, user, mySocketId, isHost, hostSocketId, onAdminMute, onClose, isDark, tc, bd, mc, myMuted, myHand }) => {
    const all = [
        { socketId: mySocketId, userId: user?.id, userName: user?.fullName || 'You', userAvatar: user?.imageUrl, isYou: true, muted: myMuted, handRaised: myHand },
        ...peers.map(p => ({ ...p, muted: peerStates[p.socketId]?.muted, handRaised: peerStates[p.socketId]?.handRaised })),
    ];
    return (
        <motion.div initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }} transition={{ type: 'spring', damping: 26, stiffness: 210 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${bd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: tc, letterSpacing: '-0.4px' }}>Participants ({all.length})</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mc, display: 'flex', padding: 4, borderRadius: 6 }}><X size={17} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {all.map(p => (
                    <div key={p.socketId || p.userId} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 11, marginBottom: 4, background: p.isYou ? (isDark ? 'rgba(229,62,62,0.09)' : 'rgba(229,62,62,0.05)') : 'transparent' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: bd, flexShrink: 0 }}>
                            {p.userAvatar && <img src={p.userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: tc, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.userName}</span>
                                {p.isYou && <span style={{ fontSize: '0.62rem', background: bd, padding: '1px 5px', borderRadius: 4, color: mc }}>You</span>}
                                {(p.socketId === hostSocketId || (p.isYou && isHost)) && <Crown size={11} color="#f6c90e" />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                {p.muted ? <MicOff size={11} color="#fc8181" /> : <Mic size={11} color="#48bb78" />}
                                {p.handRaised && <span style={{ fontSize: '0.7rem' }}>✋</span>}
                            </div>
                        </div>
                        {isHost && !p.isYou && (
                            <button onClick={() => onAdminMute(p.socketId, p.muted)}
                                style={{ background: 'none', border: 'none', padding: 7, cursor: 'pointer', color: p.muted ? '#fc8181' : mc, borderRadius: 7, display: 'flex', transition: '0.15s' }}>
                                {p.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

/* ─── Reaction Picker ─── */
const ReactionPicker = ({ onPick, onClose, isDark, bd }) => (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.88 }}
        style={{ position: 'absolute', bottom: 98, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, padding: '10px 12px', borderRadius: 18, boxShadow: '0 10px 32px rgba(0,0,0,0.35)', zIndex: 1100, background: isDark ? '#1a0a0a' : '#fff', border: `1px solid ${bd}` }}>
        {REACTIONS.map(({ key, Icon, label, color }) => (
            <button key={key} title={label} onClick={() => { onPick(key); onClose(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 7px', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; e.currentTarget.style.background = `${color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'none'; }}>
                <Icon size={22} color={color} strokeWidth={2.2} />
                <span style={{ fontSize: '0.58rem', color, fontWeight: 700 }}>{label}</span>
            </button>
        ))}
    </motion.div>
);

/* ─── Invite Modal ─── */
const InviteModal = ({ roomId, onClose, isDark, tc, bd, mc }) => {
    const [done, setDone] = useState(false);
    const copy = () => { navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`).then(() => { setDone(true); setTimeout(() => setDone(false), 2500); }); };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 20 }} onClick={e => e.stopPropagation()}
                style={{ width: '100%', maxWidth: 440, padding: '2rem', borderRadius: 22, background: isDark ? '#1a0a0a' : '#fff', color: tc, border: `1px solid ${bd}`, boxShadow: '0 24px 60px rgba(0,0,0,0.55)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                    <div>
                        <h2 style={{ fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 4px', fontSize: '1.3rem' }}>Invite people</h2>
                        <p style={{ margin: 0, color: mc, fontSize: '0.85rem' }}>Share with your team</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mc, display: 'flex', padding: 4, borderRadius: 7 }}><X size={19} /></button>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: mc, marginBottom: 7 }}>Room Code</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', borderRadius: 11, background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${bd}`, fontWeight: 800, fontSize: '1.15rem', letterSpacing: 3 }}>
                        <Shield size={16} color={mc} /><span>{roomId.toUpperCase()}</span>
                    </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: mc, marginBottom: 7 }}>Invite Link</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 15px', borderRadius: 11, background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${bd}`, fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden' }}>
                        <Link2 size={14} color={mc} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: mc }}>{`${window.location.origin}?room=${roomId}`}</span>
                    </div>
                </div>
                <button onClick={copy} style={{ width: '100%', height: 48, borderRadius: 11, border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.95rem', background: done ? '#276749' : '#e53e3e', transition: '0.25s', letterSpacing: '-0.3px' }}>
                    {done ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
                </button>
            </motion.div>
        </motion.div>
    );
};

/* ══════════════════════════════════════
   MAIN MEETING ROOM
   Uses native RTCPeerConnection — no simple-peer
══════════════════════════════════════ */
const MeetingRoom = ({ roomId, onLeave, initialConfig, isDarkMode, setIsDarkMode }) => {
    const [micOn, setMicOn] = useState(initialConfig?.micOn ?? true);
    const [videoOn, setVideoOn] = useState(initialConfig?.videoOn ?? true);
    const [isSharing, setIsSharing] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [hostSocketId, setHostSocketId] = useState(null);
    /* peers: [{ socketId, userId, userName, userAvatar, stream, connState }] */
    const [peers, setPeers] = useState([]);
    const [peerStates, setPeerStates] = useState({});
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [panel, setPanel] = useState(null);
    const [unread, setUnread] = useState(0);
    const [showInvite, setShowInvite] = useState(false);
    const [showReacts, setShowReacts] = useState(false);
    const [toast, setToast] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [, forceTime] = useState(0);

    const localRef = useRef();
    const socketRef = useRef();
    const streamRef = useRef();
    const screenRef = useRef(null);
    const mountedRef = useRef(false);
    /* pcsRef: { [socketId]: RTCPeerConnection } */
    const pcsRef = useRef({});
    /* metaRef: { [socketId]: { userId, userName, userAvatar } } */
    const metaRef = useRef({});

    const { user } = useUser();
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    const showToast = (msg, dur = 3000) => { setToast(msg); setTimeout(() => setToast(null), dur); };

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const id = setInterval(() => forceTime(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    /* ── mount ── */
    useEffect(() => {
        mountedRef.current = true;
        initMedia();
        return () => {
            mountedRef.current = false;
            Object.values(pcsRef.current).forEach(pc => pc.close());
            pcsRef.current = {};
            mediaManager.unregister(streamRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            screenRef.current?.stop();
            socketRef.current?.disconnect();
        };
    }, []);

    /* ── get camera/mic ── */
    const initMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            mediaManager.registerStream(stream);
            stream.getAudioTracks().forEach(t => t.enabled = micOn);
            stream.getVideoTracks().forEach(t => t.enabled = videoOn);
            if (localRef.current) localRef.current.srcObject = stream;
            connectSocket();
        } catch (err) { console.error('Media error:', err); }
    };

    /* ── create one RTCPeerConnection ── */
    const createPC = (socketId, isInitiator) => {
        if (pcsRef.current[socketId]) {
            pcsRef.current[socketId].close();
        }
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current[socketId] = pc;

        /* add local tracks */
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
        }

        /* relay ICE candidates through socket */
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socketRef.current?.emit('signal', { to: socketId, signal: { type: 'candidate', candidate } });
            }
        };

        /* receive remote stream */
        pc.ontrack = ({ streams }) => {
            if (!streams[0]) return;
            const stream = streams[0];
            if (!mountedRef.current) return;
            setPeers(prev => prev.map(p => p.socketId === socketId ? { ...p, stream, connState: 'connected' } : p));
        };

        /* track connection state */
        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            const connState = s === 'connected' ? 'connected' : (s === 'failed' || s === 'disconnected' || s === 'closed') ? 'disconnected' : 'connecting';
            if (!mountedRef.current) return;
            setPeers(prev => prev.map(p => p.socketId === socketId ? { ...p, connState } : p));
            if (s === 'failed') { try { pc.restartIce(); } catch (_) { } }
        };

        /* if we initiate: create and send offer */
        if (isInitiator) {
            pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    socketRef.current?.emit('signal', {
                        to: socketId,
                        signal: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
                    });
                })
                .catch(console.error);
        }

        return pc;
    };

    /* ── socket / signaling ── */
    const connectSocket = () => {
        const socket = io(import.meta.env.VITE_SOCKET_URL || '', {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 10000,
        });
        socketRef.current = socket;

        /* pending signals that arrived before the PC was created */
        const pendingSignals = {};

        const processSignal = async (socketId, signal) => {
            const pc = pcsRef.current[socketId];
            if (!pc) {
                (pendingSignals[socketId] = pendingSignals[socketId] || []).push(signal);
                return;
            }
            try {
                if (signal.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('signal', { to: socketId, signal: { type: answer.type, sdp: answer.sdp } });
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                } else if (signal.type === 'candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (err) { console.error('Signal error:', err); }
        };

        const flushPending = async (socketId) => {
            const q = pendingSignals[socketId];
            if (!q) return;
            delete pendingSignals[socketId];
            for (const sig of q) await processSignal(socketId, sig);
        };

        /* join with retry until user object is ready */
        socket.on('connect', () => {
            const doJoin = (attempts = 0) => {
                const u = userRef.current;
                if (!u?.id) { if (attempts < 20) setTimeout(() => doJoin(attempts + 1), 300); return; }
                socket.emit('join-room', { roomId, userId: u.id, userName: u.fullName || u.username || 'Anonymous', userAvatar: u.imageUrl });
            };
            doJoin();
        });

        socket.on('host-status', amHost => { setIsHost(amHost); if (amHost) setHostSocketId(socket.id); });
        socket.on('host-changed', ({ newHostSocketId }) => {
            setHostSocketId(newHostSocketId);
            if (newHostSocketId === socket.id) { setIsHost(true); showToast('You are now the host 👑'); }
        });

        /* existing users — we are the NON-INITIATOR, we wait for their offer */
        socket.on('all-users', (users) => {
            users.forEach(({ socketId, userId, userName, userAvatar }) => {
                if (pcsRef.current[socketId]) return; // already have one
                metaRef.current[socketId] = { userId, userName, userAvatar };
                createPC(socketId, false);
                setPeers(prev => [...prev.filter(p => p.socketId !== socketId), { socketId, userId, userName, userAvatar, stream: null, connState: 'connecting' }]);
                flushPending(socketId);
            });
        });

        /* new user joined — we are INITIATOR, send the offer */
        socket.on('peer-joined', ({ socketId, userId, userName, userAvatar }) => {
            if (pcsRef.current[socketId]) return;
            metaRef.current[socketId] = { userId, userName, userAvatar };
            createPC(socketId, true);
            setPeers(prev => [...prev.filter(p => p.socketId !== socketId), { socketId, userId, userName, userAvatar, stream: null, connState: 'connecting' }]);
            flushPending(socketId);
        });

        /* relay: offer / answer / ICE candidate */
        socket.on('signal', ({ from, signal }) => { processSignal(from, signal); });

        /* user left */
        socket.on('user-left', id => {
            pcsRef.current[id]?.close();
            delete pcsRef.current[id];
            delete metaRef.current[id];
            setPeers(prev => prev.filter(p => p.socketId !== id));
        });

        socket.on('reaction', ({ from, userName, emoji }) => {
            if (from !== socket.id) setReactions(p => [...p, { id: Date.now(), key: emoji, name: userName }]);
        });
        socket.on('chat-message', msg => {
            if (msg.from !== socket.id) { setMessages(p => [...p, msg]); setUnread(u => u + 1); }
        });
        socket.on('peer-state-change', ({ socketId, muted, handRaised: rh }) => {
            setPeerStates(p => ({ ...p, [socketId]: { ...p[socketId], muted: muted ?? p[socketId]?.muted, handRaised: rh ?? p[socketId]?.handRaised } }));
        });
        socket.on('force-muted', ({ byName }) => {
            setMicOn(false);
            streamRef.current?.getAudioTracks().forEach(t => t.enabled = false);
            socket.emit('state-change', { roomId, muted: true });
            showToast(`Muted by ${byName} 🤫`);
        });
    };

    /* ── controls ── */
    const hangup = () => onLeave();

    const toggleMic = () => {
        const next = !micOn; setMicOn(next);
        streamRef.current?.getAudioTracks().forEach(t => t.enabled = next);
        socketRef.current?.emit('state-change', { roomId, muted: !next });
    };

    const toggleVideo = async () => {
        const next = !videoOn; setVideoOn(next);
        if (!next) {
            streamRef.current?.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; });
        } else {
            try {
                const ns = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
                const t = ns.getVideoTracks()[0];
                const b = streamRef.current;
                if (b) {
                    b.getVideoTracks().forEach(v => { v.stop(); b.removeTrack(v); });
                    b.addTrack(t);
                    if (localRef.current) localRef.current.srcObject = b;
                    Object.values(pcsRef.current).forEach(pc => {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                        sender?.replaceTrack(t);
                    });
                }
            } catch (_) { setVideoOn(false); }
        }
    };

    const toggleShare = async () => {
        if (isSharing) { setIsSharing(false); return; }
        try {
            const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const st = ss.getVideoTracks()[0];
            screenRef.current = st;
            setIsSharing(true);
            Object.values(pcsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                sender?.replaceTrack(st);
            });
            st.onended = () => setIsSharing(false);
        } catch (_) { }
    };

    const toggleHand = () => { const n = !handRaised; setHandRaised(n); socketRef.current?.emit('raise-hand', { roomId, raised: n }); };
    const sendReaction = key => { socketRef.current?.emit('reaction', { roomId, emoji: key }); setReactions(p => [...p, { id: Date.now(), key, name: 'You' }]); };
    const sendMessage = t => {
        const m = { id: Date.now(), from: 'me', userName: user?.fullName || 'You', userAvatar: user?.imageUrl, text: t };
        setMessages(p => [...p, m]);
        socketRef.current?.emit('chat-message', { roomId, text: t });
    };
    const adminMute = (t, m) => socketRef.current?.emit(m ? 'admin-request-unmute' : 'admin-mute', { targetSocketId: t, roomId });

    /* ── theme ── */
    const D = isDarkMode;
    const bg = D ? '#090909' : '#f0f0f4';
    const tc = D ? '#f0f0f0' : '#1a1a1a';
    const bd = D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
    const bb = D ? 'rgba(12,8,8,0.97)' : 'rgba(255,255,255,0.97)';
    const mc = D ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.48)';
    const btnBg = D ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

    const n = peers.length + 1;
    const alone = n === 1;

    const gridStyle = () => {
        if (alone) return { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' };
        const cols = isMobile ? (n > 2 ? 2 : 1) : (n <= 2 ? 2 : n <= 4 ? 2 : n <= 9 ? 3 : 4);
        return { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isMobile ? '0.6rem' : '1rem', width: '100%', alignContent: 'center' };
    };

    const ctrlBtn = (active = false, danger = false, wide = false) => ({
        width: wide ? (isMobile ? 48 : 60) : (isMobile ? 40 : 46),
        height: isMobile ? 40 : 46,
        borderRadius: 13,
        border: `1px solid ${danger || wide ? 'transparent' : bd}`,
        background: (wide || danger) ? '#e53e3e' : active ? 'rgba(229,62,62,0.13)' : btnBg,
        color: (wide || danger) ? '#fff' : active ? '#e53e3e' : tc,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', transition: 'all 0.18s ease',
        boxShadow: (wide || danger) ? '0 4px 14px rgba(229,62,62,0.35)' : 'none',
        fontFamily: 'inherit', flexShrink: 0,
    });

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg, color: tc, position: 'relative', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

            {/* ── HEADER ── */}
            <header style={{ height: isMobile ? 58 : 66, padding: isMobile ? '0 1rem' : '0 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bb, borderBottom: `1px solid ${bd}`, backdropFilter: 'blur(20px)', zIndex: 1000, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
                    <div style={{ background: 'linear-gradient(135deg,#e53e3e,#c53030)', padding: '6px 7px', borderRadius: 9, display: 'flex', boxShadow: '0 3px 10px rgba(229,62,62,0.4)' }}>
                        <VideoIcon size={16} color="#fff" />
                    </div>
                    <span style={{ color: tc, fontWeight: 800, fontSize: isMobile ? '1rem' : '1.1rem', letterSpacing: '-0.5px' }}>smartMeet</span>
                    {!isMobile && <div style={{ background: bd, padding: '3px 11px', borderRadius: 99, fontSize: '0.76rem', color: mc, fontWeight: 700, letterSpacing: 1 }}>{roomId.toUpperCase()}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
                    {!isMobile && (
                        <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, border: `1px solid ${bd}`, background: btnBg, color: tc, cursor: 'pointer', fontWeight: 700, fontSize: '0.83rem', fontFamily: 'inherit' }}>
                            <UserPlus size={14} /> Invite
                        </button>
                    )}
                    {!isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: mc, fontSize: '0.82rem', fontWeight: 700 }}><Users size={14} />{n}</div>}
                    <button onClick={() => setIsDarkMode(!D)} style={{ background: 'none', border: 'none', color: mc, cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}>
                        {D ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            {/* ── BODY ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

                {/* Video area */}
                <main style={{ flex: 1, padding: isMobile ? '0.65rem' : '1.25rem', display: 'flex', alignItems: alone ? 'center' : 'flex-start', justifyContent: 'center', overflowY: 'auto', position: 'relative' }}>

                    {alone && (
                        <div style={{ position: 'absolute', top: isMobile ? 12 : 18, left: '50%', transform: 'translateX(-50%)', background: D ? 'rgba(229,62,62,0.12)' : 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.25)', borderRadius: 99, padding: '5px 16px', color: '#e53e3e', fontSize: '0.76rem', fontWeight: 700, whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e53e3e', display: 'inline-block', animation: 'pulse 1.4s ease-in-out infinite' }} />
                            Waiting for others to join…
                            <button onClick={() => setShowInvite(true)} style={{ background: 'rgba(229,62,62,0.18)', border: 'none', color: '#e53e3e', padding: '2px 9px', borderRadius: 99, fontWeight: 800, cursor: 'pointer', fontSize: '0.73rem', fontFamily: 'inherit', marginLeft: 2 }}>Invite</button>
                        </div>
                    )}

                    <div style={gridStyle()}>
                        {/* ── Local tile ── */}
                        <div style={alone ? { width: '100%', maxWidth: isMobile ? '90vw' : '520px' } : {}}>
                            <motion.div layout style={tileStyle(handRaised)}>
                                <video ref={localRef} autoPlay playsInline muted style={{ ...videoFill, transform: 'rotateY(180deg)' }} />
                                <div style={gradOver} />
                                {!videoOn && (
                                    <div style={{ position: 'absolute', inset: 0, background: D ? '#1a1010' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: D ? '#2a1a1a' : '#d0d0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.07)' }}>
                                            {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <span style={{ fontSize: '1.7rem', fontWeight: 800, color: D ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>{user?.fullName?.[0] || '?'}</span>}
                                        </div>
                                    </div>
                                )}
                                <div style={nameTag}>
                                    {user?.imageUrl && <img src={user.imageUrl} alt="" style={{ width: 15, height: 15, borderRadius: '50%' }} />}
                                    You {handRaised && '✋'}
                                    {!videoOn && <VideoOff size={10} color="#fc8181" />}
                                    {!micOn && <MicOff size={10} color="#fc8181" />}
                                    {isHost && <Crown size={10} color="#f6c90e" />}
                                </div>
                            </motion.div>
                        </div>

                        {/* ── Remote tiles ── */}
                        <AnimatePresence>
                            {peers.map(p => (
                                <RemoteTile
                                    key={p.socketId}
                                    stream={p.stream}
                                    name={p.userName}
                                    avatar={p.userAvatar}
                                    isDark={D}
                                    connState={p.connState}
                                    peerState={peerStates[p.socketId]}
                                    isHost={isHost}
                                    onAdminMute={adminMute}
                                    socketId={p.socketId}
                                    isMuted={peerStates[p.socketId]?.muted}
                                    handUp={peerStates[p.socketId]?.handRaised}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </main>

                {/* ── Side Panel ── */}
                <AnimatePresence>
                    {panel && (
                        <div style={{ width: isMobile ? '100%' : 340, height: '100%', borderLeft: isMobile ? 'none' : `1px solid ${bd}`, background: bb, flexShrink: 0, ...(isMobile ? { position: 'absolute', inset: 0, zIndex: 1100 } : {}) }}>
                            {panel === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} onClose={() => { setPanel(null); setUnread(0); }} isDark={D} tc={tc} bd={bd} mc={mc} />}
                            {panel === 'participants' && <ParticipantsPanel peers={peers} peerStates={peerStates} user={user} isHost={isHost} hostSocketId={hostSocketId} mySocketId={socketRef.current?.id} onAdminMute={adminMute} onClose={() => setPanel(null)} isDark={D} tc={tc} bd={bd} mc={mc} myMuted={!micOn} myHand={handRaised} />}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── FOOTER ── */}
            <footer style={{ height: isMobile ? 72 : 82, padding: isMobile ? '0 0.5rem' : '0 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bb, borderTop: `1px solid ${bd}`, zIndex: 1000, flexShrink: 0, position: 'relative' }}>

                {!isMobile && (
                    <div style={{ color: mc, fontWeight: 600, fontSize: '0.82rem', minWidth: 120 }}>
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span style={{ margin: '0 6px', opacity: 0.4 }}>|</span>
                        <span style={{ color: tc }}>{roomId.toUpperCase()}</span>
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 8, flex: isMobile ? 1 : 'unset', justifyContent: isMobile ? 'space-around' : 'center' }}>
                    <button onClick={toggleMic} style={ctrlBtn(false, !micOn)} title={micOn ? 'Mute' : 'Unmute'}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
                    <button onClick={toggleVideo} style={ctrlBtn(false, !videoOn)} title={videoOn ? 'Stop Video' : 'Start Video'}>{videoOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}</button>
                    <button onClick={toggleShare} style={ctrlBtn(isSharing)} title="Share Screen"><ScreenShare size={18} /></button>
                    <button onClick={toggleHand} style={ctrlBtn(handRaised)} title="Raise Hand"><Hand size={18} /></button>

                    <div style={{ width: 1, height: 22, background: bd, margin: isMobile ? '0 2px' : '0 4px', flexShrink: 0 }} />

                    <button onClick={() => setShowReacts(!showReacts)} style={{ ...ctrlBtn(), fontSize: '1.1rem' }}>😊</button>
                    <button onClick={() => { setPanel(panel === 'chat' ? null : 'chat'); setUnread(0); }} style={ctrlBtn(panel === 'chat')}>
                        <MessageSquare size={17} />
                        {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#e53e3e', color: '#fff', fontSize: '0.62rem', fontWeight: 800, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `2px solid ${bb}` }}>{unread}</span>}
                    </button>
                    <button onClick={() => setPanel(panel === 'participants' ? null : 'participants')} style={ctrlBtn(panel === 'participants')}><Users size={17} /></button>
                    <button onClick={hangup} style={{ ...ctrlBtn(false, false, true), marginLeft: isMobile ? 4 : 8 }}><PhoneOff size={20} /></button>
                </div>

                {!isMobile && (
                    <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ ...ctrlBtn(), border: `1px solid ${bd}` }}><Settings size={17} /></button>
                    </div>
                )}

                <AnimatePresence>
                    {showReacts && <ReactionPicker onPick={sendReaction} onClose={() => setShowReacts(false)} isDark={D} bd={bd} />}
                </AnimatePresence>
            </footer>

            {/* ── TOAST ── */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: D ? 'rgba(30,15,15,0.92)' : 'rgba(255,255,255,0.95)', color: tc, border: `1px solid ${bd}`, borderRadius: 12, padding: '10px 20px', fontSize: '0.86rem', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', zIndex: 1500, whiteSpace: 'nowrap' }}>
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {reactions.map(r => <FloatingReaction key={r.id} reactionKey={r.key} name={r.name} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />)}
            </AnimatePresence>

            <AnimatePresence>
                {showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} isDark={D} tc={tc} bd={bd} mc={mc} />}
            </AnimatePresence>

            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
        </div>
    );
};

export default MeetingRoom;
