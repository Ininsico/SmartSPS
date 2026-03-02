import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff,
    MessageSquare, Users, Settings, PhoneOff, Hand, Shield, Sun, Moon,
    Copy, Check, Link2, X, UserPlus, Wifi, WifiOff, Send, Crown, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser } from '@clerk/clerk-react';
import { mediaManager } from './mediaManager';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
    ],
};

const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🎉', '🔥', '💯'];

const tileBase = {
    position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
    background: '#0f0f0f', aspectRatio: '16/9',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
    transition: 'box-shadow 0.2s',
};
const videoFill = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const gradOver = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)', pointerEvents: 'none' };

const FloatingReaction = ({ emoji, name, id, onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
    return (
        <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -180, scale: 1.4 }}
            transition={{ duration: 3, ease: 'easeOut' }}
            style={{ position: 'fixed', bottom: 110, right: Math.random() * 200 + 80, zIndex: 900, pointerEvents: 'none', textAlign: 'center' }}
        >
            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{emoji}</div>
            <div style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '1px 6px', marginTop: 2 }}>{name}</div>
        </motion.div>
    );
};

const ConnBadge = ({ state }) => {
    const map = {
        connected: { color: '#48bb78', icon: <Wifi size={10} />, label: 'Live' },
        connecting: { color: '#ed8936', icon: <Wifi size={10} />, label: 'Connecting…' },
        disconnected: { color: '#fc8181', icon: <WifiOff size={10} />, label: 'Offline' },
    }[state] || { color: '#888', icon: null, label: state };
    return (
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: `1px solid ${map.color}44`, borderRadius: 99, padding: '3px 8px', color: map.color, fontSize: '0.65rem', fontWeight: 700 }}>
            {map.icon}{map.label}
        </div>
    );
};

const RemoteTile = ({ peer, name, avatar, isDark, peerState, isHost, onAdminMute, socketId }) => {
    const ref = useRef();
    const [connState, setConnState] = useState('connecting');
    const [hasStream, setHasStream] = useState(false);
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    const isMuted = peerState?.muted ?? false;
    const handUp = peerState?.handRaised ?? false;

    useEffect(() => {
        if (!peer) return;
        const onS = s => { if (ref.current) { ref.current.srcObject = s; setHasStream(true); } };
        peer.on('stream', onS);
        peer.on('connect', () => setConnState('connected'));
        peer.on('close', () => setConnState('disconnected'));
        peer.on('error', () => setConnState('disconnected'));
        return () => { peer.off('stream', onS); };
    }, [peer]);

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.22 }}
            style={{ ...tileBase, boxShadow: handUp ? '0 0 0 3px #f6c90e, 0 8px 32px rgba(0,0,0,0.5)' : tileBase.boxShadow }}>
            <video playsInline autoPlay ref={ref} style={videoFill} />
            <div style={gradOver} />
            {!hasStream && (
                <div style={{ position: 'absolute', inset: 0, background: isDark ? '#1a0808' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: isDark ? '#2a1010' : '#d0d0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.08)' }}>
                        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }}>{initials}</span>}
                    </div>
                </div>
            )}
            <ConnBadge state={connState} />
            {handUp && (
                <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '1.4rem' }}>✋</div>
            )}
            {isHost && (
                <button onClick={() => onAdminMute(socketId, isMuted)} title={isMuted ? 'Request Unmute' : 'Mute Participant'}
                    style={{ position: 'absolute', top: 10, left: handUp ? 46 : 10, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 99, padding: '4px 8px', cursor: 'pointer', color: isMuted ? '#fc8181' : '#48bb78', display: 'flex', alignItems: 'center' }}>
                    {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
            )}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '4px 10px', color: '#fff' }}>
                {avatar && <img src={avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{name || 'Anonymous'}</span>
                {isMuted && <MicOff size={11} color="#fc8181" />}
            </div>
        </motion.div>
    );
};

const Btn = ({ onClick, children, danger, active, label, wide, isDark, badge, style: xs }) => (
    <button onClick={onClick} title={label} style={{
        position: 'relative', width: wide ? 72 : 52, height: 52,
        borderRadius: wide ? '1.5rem' : '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', backdropFilter: 'blur(8px)',
        background: danger ? '#e53e3e' : active ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)') : (isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)'),
        color: danger ? '#fff' : active ? (isDark ? '#fff' : '#000') : (isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)'),
        boxShadow: danger ? '0 4px 20px rgba(229,62,62,0.35)' : 'none', ...xs
    }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
        {children}
        {badge > 0 && (
            <div style={{ position: 'absolute', top: 4, right: 4, width: 17, height: 17, borderRadius: '50%', background: '#e53e3e', color: '#fff', fontSize: '0.6rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {badge > 9 ? '9+' : badge}
            </div>
        )}
    </button>
);

function grid(n) {
    const b = { display: 'grid', gap: '1rem', width: '100%', height: '100%', alignContent: 'center', justifyContent: 'center' };
    if (n === 1) return { ...b, gridTemplateColumns: 'minmax(0, 900px)', gridTemplateRows: 'minmax(0, 560px)' };
    if (n === 2) return { ...b, gridTemplateColumns: 'repeat(2, minmax(0, 600px))', gridAutoRows: 'minmax(0, 400px)' };
    if (n <= 4) return { ...b, gridTemplateColumns: 'repeat(2, 1fr)' };
    if (n <= 6) return { ...b, gridTemplateColumns: 'repeat(3, 1fr)' };
    return { ...b, gridTemplateColumns: 'repeat(4, 1fr)' };
}

const ChatPanel = ({ messages, onSend, onClose, user, isDark, textCol, barBg, barBord, mutedCol }) => {
    const [text, setText] = useState('');
    const bottomRef = useRef();
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    const send = () => { const t = text.trim(); if (t) { onSend(t); setText(''); } };

    return (
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 340, background: isDark ? '#140608' : '#fff', borderLeft: `1px solid ${barBord}`, zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.35)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${barBord}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: textCol }}>In-Call Chat</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 && <div style={{ color: mutedCol, textAlign: 'center', fontSize: '0.82rem', marginTop: '2rem' }}>No messages yet. Say hi! 👋</div>}
                {messages.map(m => {
                    const isMine = m.from === 'me';
                    return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                            {!isMine && <img src={m.userAvatar || ''} alt="" onError={e => e.target.style.display = 'none'} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: isDark ? '#2a1010' : '#ddd' }} />}
                            <div style={{ maxWidth: '72%' }}>
                                {!isMine && <div style={{ fontSize: '0.68rem', color: mutedCol, marginBottom: 3, fontWeight: 700 }}>{m.userName}</div>}
                                <div style={{ background: isMine ? '#e53e3e' : (isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f5'), color: isMine ? '#fff' : textCol, borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 12px', fontSize: '0.85rem', lineHeight: 1.45, wordBreak: 'break-word' }}>
                                    {m.text}
                                </div>
                                <div style={{ fontSize: '0.62rem', color: mutedCol, marginTop: 3, textAlign: isMine ? 'right' : 'left' }}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
            <div style={{ padding: '0.85rem 1rem', borderTop: `1px solid ${barBord}`, display: 'flex', gap: 8 }}>
                <input
                    value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="Type a message…"
                    style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f5', border: `1px solid ${barBord}`, borderRadius: 12, padding: '0.6rem 1rem', color: textCol, fontSize: '0.85rem', outline: 'none', caretColor: '#e53e3e' }}
                />
                <button onClick={send} style={{ width: 42, height: 42, borderRadius: '50%', background: '#e53e3e', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={16} />
                </button>
            </div>
        </motion.div>
    );
};

const ParticipantsPanel = ({ peers, peerStates, user, mySocketId, isHost, hostSocketId, onAdminMute, onClose, isDark, textCol, barBg, barBord, mutedCol, myMuted, myHand }) => {
    const all = [
        { socketId: 'me', userName: user?.fullName || 'You', userAvatar: user?.imageUrl, muted: myMuted, handRaised: myHand, isYou: true },
        ...peers.map(p => ({ ...p, muted: peerStates[p.socketId]?.muted ?? false, handRaised: peerStates[p.socketId]?.handRaised ?? false }))
    ];
    return (
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 300, background: isDark ? '#140608' : '#fff', borderLeft: `1px solid ${barBord}`, zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.35)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${barBord}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: textCol }}>Participants ({all.length})</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {all.map(p => (
                    <div key={p.socketId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.75rem', borderRadius: 10, marginBottom: 4, background: p.isYou ? (isDark ? 'rgba(229,62,62,0.1)' : 'rgba(229,62,62,0.06)') : 'transparent' }}>
                        <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: isDark ? '#2a1010' : '#ddd' }}>
                            {p.userAvatar && <img src={p.userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: textCol, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.userName}
                                {p.isYou && <span style={{ fontSize: '0.65rem', color: '#e53e3e', fontWeight: 700 }}>You</span>}
                                {(p.socketId === hostSocketId || (p.isYou && isHost)) && <Crown size={12} color="#f6c90e" />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                {p.muted ? <MicOff size={12} color="#fc8181" /> : <Mic size={12} color="#48bb78" />}
                                {p.handRaised && <span style={{ fontSize: '0.8rem' }}>✋</span>}
                            </div>
                        </div>
                        {isHost && !p.isYou && (
                            <button onClick={() => onAdminMute(p.socketId, p.muted)} title={p.muted ? 'Request Unmute' : 'Mute'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.muted ? '#fc8181' : mutedCol, padding: 4 }}>
                                {p.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const ReactionPicker = ({ onPick, onClose, isDark, barBord }) => (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} transition={{ duration: 0.15 }}
        style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: isDark ? '#1a0608' : '#fff', border: `1px solid ${barBord}`, borderRadius: 16, padding: '0.65rem', display: 'flex', gap: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 500 }}>
        {REACTIONS.map(e => (
            <button key={e} onClick={() => { onPick(e); onClose(); }} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.12s', padding: '4px 6px', borderRadius: 8 }}
                onMouseEnter={el => el.currentTarget.style.transform = 'scale(1.35)'}
                onMouseLeave={el => el.currentTarget.style.transform = 'scale(1)'}
            >{e}</button>
        ))}
    </motion.div>
);

const InviteModal = ({ roomId, inviteUrl, onClose, isDark, textCol, barBord, mutedCol }) => {
    const [done, setDone] = useState(false);
    const copy = () => {
        const link = `${window.location.origin}?room=${roomId}`;
        navigator.clipboard.writeText(link).then(() => {
            setDone(true); setTimeout(() => setDone(false), 2500);
        });
    };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                onClick={e => e.stopPropagation()} style={{ background: isDark ? '#1a0608' : '#fff', border: `1px solid ${barBord}`, borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: 460, boxShadow: '0 32px 64px rgba(0,0,0,0.55)', color: textCol }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Invite people</h2>
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: mutedCol }}>Share code or link with your team</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol }}><X size={20} /></button>
                </div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', color: mutedCol, textTransform: 'uppercase', display: 'block', marginBottom: '0.45rem' }}>Room Code</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${barBord}`, borderRadius: '0.75rem', padding: '0.85rem 1.25rem', marginBottom: '1rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.5rem', color: textCol }}>{roomId.toUpperCase()}</span>
                    <Shield size={18} color={mutedCol} />
                </div>
                <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', color: mutedCol, textTransform: 'uppercase', display: 'block', marginBottom: '0.45rem' }}>Invite Link</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${barBord}`, borderRadius: '0.75rem', padding: '0.65rem 1rem', marginBottom: '1.25rem' }}>
                    <Link2 size={14} color={mutedCol} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: mutedCol, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {`${window.location.origin}?room=${roomId}`}
                    </span>
                </div>
                <button onClick={copy} style={{ width: '100%', padding: '0.85rem', border: 'none', borderRadius: '0.85rem', background: done ? '#276749' : '#e53e3e', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
                    {done ? <><Check size={17} /> Copied!</> : <><Copy size={17} /> Copy Invite Link</>}
                </button>
            </motion.div>
        </motion.div>
    );
};

const MeetingRoom = ({ roomId, onLeave, initialConfig, isDarkMode, setIsDarkMode }) => {
    const [micOn, setMicOn] = useState(initialConfig?.micOn ?? true);
    const [videoOn, setVideoOn] = useState(initialConfig?.videoOn ?? true);
    const [isSharing, setIsSharing] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [hostSocketId, setHostSocketId] = useState(null);
    const [inviteUrl, setInviteUrl] = useState('');
    const [peers, setPeers] = useState([]);
    const [peerStates, setPeerStates] = useState({});
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [panel, setPanel] = useState(null);
    const [unread, setUnread] = useState(0);
    const [showInvite, setShowInvite] = useState(false);
    const [showReacts, setShowReacts] = useState(false);
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState(null);
    const [, forceTime] = useState(0);

    const localRef = useRef();
    const socketRef = useRef();
    const streamRef = useRef();
    const screenRef = useRef(null);
    const peersRef = useRef([]);
    const mountedRef = useRef(false);
    const { user } = useUser();

    const showToast = (msg, dur = 3000) => { setToast(msg); setTimeout(() => setToast(null), dur); };

    useEffect(() => { const id = setInterval(() => forceTime(t => t + 1), 30000); return () => clearInterval(id); }, []);

    useEffect(() => {
        mountedRef.current = true;
        window.history.replaceState({}, '', `?room=${roomId}`);
        initMedia();
        return () => {
            mountedRef.current = false;
            peersRef.current.forEach(p => p.peer?.destroy());
            peersRef.current = [];
            mediaManager.unregister(streamRef.current);
            streamRef.current = null;
            screenRef.current?.stop();
            socketRef.current?.disconnect();
        };
    }, []);

    const initMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                    facingMode: 'user',
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                }
            });
            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            mediaManager.registerStream(stream);
            stream.getAudioTracks().forEach(t => t.enabled = micOn);
            stream.getVideoTracks().forEach(t => t.enabled = videoOn);
            if (localRef.current) localRef.current.srcObject = stream;
            connectSocket(stream);
        } catch (err) {
            console.error('Media error:', err);
        }
    };

    const connectSocket = (stream) => {
        const socket = io(import.meta.env.VITE_SOCKET_URL || '', {
            transports: ['polling', 'websocket'],
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            timeout: 20000,
        });
        socketRef.current = socket;

        const join = () => {
            if (!user?.id) return;
            socket.emit('join-room', {
                roomId,
                userId: user.id,
                userName: user?.fullName || user?.username || 'Anonymous',
                userAvatar: user?.imageUrl,
            });
        };

        socket.on('connect', join);
        socket.on('reconnect', join);

        socket.on('host-status', (amHost) => {
            setIsHost(amHost);
            if (amHost) setHostSocketId(socket.id);
        });

        socket.on('invite-url', (url) => {
            setInviteUrl(url);
        });

        socket.on('host-changed', ({ newHostSocketId }) => {
            setHostSocketId(newHostSocketId);
            if (newHostSocketId === socket.id) { setIsHost(true); showToast('You are now the host 👑'); }
        });

        socket.on('all-users', (users) => {
            users.forEach(({ socketId, userId: uid, userName, userAvatar }) => {
                const existingIndex = peersRef.current.findIndex(p => p.userId === uid || p.socketId === socketId);
                if (existingIndex !== -1) {
                    peersRef.current[existingIndex].peer?.destroy();
                    peersRef.current.splice(existingIndex, 1);
                }
                const peer = makePeer({ initiator: true, target: socketId, socket });
                const obj = { socketId, userId: uid, userName, userAvatar, peer };
                peersRef.current.push(obj);
                setPeers(prev => [...prev.filter(p => p.userId !== uid && p.socketId !== socketId), obj]);
            });
        });

        socket.on('peer-joined', ({ socketId, userId: uid, userName, userAvatar }) => {
            const existingIndex = peersRef.current.findIndex(p => p.userId === uid || p.socketId === socketId);
            if (existingIndex !== -1) {
                peersRef.current[existingIndex].peer?.destroy();
                peersRef.current.splice(existingIndex, 1);
            }
            const peer = makePeer({ initiator: false, target: socketId, socket });
            const obj = { socketId, userId: uid, userName, userAvatar, peer };
            peersRef.current.push(obj);
            setPeers(prev => [...prev.filter(p => p.userId !== uid && p.socketId !== socketId), obj]);
        });

        socket.on('signal', ({ from, signal }) => {
            let item = peersRef.current.find(p => p.socketId === from);
            if (!item) {
                const peer = makePeer({ initiator: false, target: from, socket });
                item = { socketId: from, userName: 'Connecting...', peer };
                peersRef.current.push(item);
                setPeers(prev => [...prev, item]);
            }
            item.peer.signal(signal);
        });
        socket.on('ice-candidate', ({ from, candidate }) => {
            const item = peersRef.current.find(p => p.socketId === from);
            if (item?.peer) { try { item.peer.signal({ candidate }); } catch (_) { } }
        });

        socket.on('user-left', (id) => {
            peersRef.current.find(p => p.socketId === id)?.peer?.destroy();
            peersRef.current = peersRef.current.filter(p => p.socketId !== id);
            setPeers(prev => prev.filter(p => p.socketId !== id));
            setPeerStates(prev => { const n = { ...prev }; delete n[id]; return n; });
        });

        socket.on('reaction', ({ from, userName, userAvatar, emoji }) => {
            const id = `${from}-${Date.now()}`;
            setReactions(prev => [...prev, { id, emoji, name: userName?.split(' ')[0] || 'Someone' }]);
        });

        socket.on('peer-hand-raised', ({ socketId, userName, raised }) => {
            setPeerStates(prev => ({ ...prev, [socketId]: { ...(prev[socketId] || {}), handRaised: raised } }));
            if (raised) showToast(`✋ ${userName} raised their hand`);
        });

        socket.on('chat-message', (msg) => {
            setMessages(prev => [...prev, msg]);
            if (panel !== 'chat') setUnread(u => u + 1);
        });

        socket.on('peer-state-change', ({ socketId, muted }) => {
            setPeerStates(prev => ({ ...prev, [socketId]: { ...(prev[socketId] || {}), muted } }));
        });

        socket.on('force-muted', ({ byName }) => {
            setMicOn(false);
            streamRef.current?.getAudioTracks().forEach(t => t.enabled = false);
            socket.emit('state-change', { roomId, muted: true });
            showToast(`🔇 ${byName} muted you`);
        });

        socket.on('unmute-requested', ({ byName }) => {
            showToast(`🎙️ ${byName} is asking you to unmute`);
        });
    };

    useEffect(() => {
        if (user?.id && socketRef.current?.connected) {
            socketRef.current.emit('join-room', {
                roomId,
                userId: user.id,
                userName: user.fullName || user.username || 'Anonymous',
                userAvatar: user.imageUrl,
            });
        }
    }, [user, roomId]);

    const makePeer = useCallback(({ initiator, target, socket }) => {
        const peer = new Peer({
            initiator, trickle: true, stream: streamRef.current, config: ICE_SERVERS,
            sdpTransform: sdp => {
                let modified = sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=128000');
                if (modified.indexOf('m=video') !== -1) {
                    modified = modified.replace('a=mid:video\r\n', 'a=mid:video\r\nb=AS:1500\r\n');
                }
                return modified;
            }
        });
        peer.on('signal', s => {
            socket.emit('signal', { to: target, signal: s });
        });
        peer.on('error', err => console.error(`Peer [${target}]:`, err.message));
        return peer;
    }, [user]);

    const hangup = () => {
        peersRef.current.forEach(p => p.peer?.destroy());
        peersRef.current = [];
        mediaManager.unregister(streamRef.current);
        streamRef.current = null;
        socketRef.current?.disconnect();
        onLeave();
    };

    const toggleMic = () => {
        const next = !micOn;
        setMicOn(next);
        streamRef.current?.getAudioTracks().forEach(t => t.enabled = next);
        socketRef.current?.emit('state-change', { roomId, muted: !next });
    };

    const toggleVideo = async () => {
        const next = !videoOn;
        setVideoOn(next);
        if (!next) {
            streamRef.current?.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; });
        } else {
            try {
                const ns = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } });
                const t = ns.getVideoTracks()[0];
                const b = streamRef.current;
                if (b) {
                    b.getVideoTracks().forEach(v => { v.stop(); b.removeTrack(v); });
                    b.addTrack(t);
                    if (localRef.current) localRef.current.srcObject = b;
                    peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(t));
                }
            } catch (_) { setVideoOn(false); }
        }
    };

    const revertCam = async () => {
        setIsSharing(false);
        screenRef.current?.stop();
        screenRef.current = null;
        try {
            const cs = await navigator.mediaDevices.getUserMedia({ video: true });
            const ct = cs.getVideoTracks()[0];
            const b = streamRef.current;
            if (b) {
                b.getVideoTracks().forEach(v => { v.stop(); b.removeTrack(v); });
                b.addTrack(ct);
                if (localRef.current) localRef.current.srcObject = b;
                peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(ct));
            }
            setVideoOn(true);
        } catch (e) { console.error(e); }
    };

    const toggleShare = async () => {
        if (isSharing) { await revertCam(); return; }
        try {
            const ss = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: true });
            const st = ss.getVideoTracks()[0];
            screenRef.current = st;
            setIsSharing(true);
            if (localRef.current) localRef.current.srcObject = new MediaStream([st, ...(streamRef.current?.getAudioTracks() ?? [])]);
            peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(st));
            st.addEventListener('ended', revertCam, { once: true });
        } catch (err) { if (err.name !== 'NotAllowedError') console.error(err); }
    };

    const toggleHand = () => {
        const next = !handRaised;
        setHandRaised(next);
        socketRef.current?.emit('raise-hand', { roomId, raised: next });
    };

    const sendReaction = (emoji) => {
        socketRef.current?.emit('reaction', { roomId, emoji });
        const id = `me-${Date.now()}`;
        setReactions(prev => [...prev, { id, emoji, name: 'You' }]);
    };

    const sendMessage = (text) => {
        const msg = { id: `me-${Date.now()}`, from: 'me', userName: user?.fullName || 'You', userAvatar: user?.imageUrl, text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, msg]);
        socketRef.current?.emit('chat-message', { roomId, text });
    };

    const adminMute = (targetSocketId, isMuted) => {
        if (isMuted) socketRef.current?.emit('admin-request-unmute', { targetSocketId, roomId });
        else socketRef.current?.emit('admin-mute', { targetSocketId, roomId });
    };

    const openPanel = (p) => { setPanel(prev => prev === p ? null : p); if (p === 'chat') setUnread(0); };
    const copyRoom = () => {
        const link = `${window.location.origin}?room=${roomId}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000);
            showToast('Link copied to clipboard! 📋');
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = link;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
            showToast('Link copied! 📋');
        });
    };

    const D = isDarkMode;
    const bg = D ? '#110608' : '#f0f0f5';
    const gb = D ? '#0c0305' : '#e0e0e8';
    const bb = D ? 'rgba(12,3,5,0.92)' : 'rgba(255,255,255,0.94)';
    const bd = D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const tc = D ? '#ffffff' : '#0a0a0a';
    const mc = D ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
    const n = peers.length + 1;
    const mi = user?.fullName ? user.fullName.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() : 'ME';

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg, fontFamily: "'Inter','Montserrat',sans-serif", overflow: 'hidden', transition: 'background 0.4s', position: 'relative' }}>

            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', background: D ? 'rgba(20,6,8,0.95)' : 'rgba(255,255,255,0.95)', color: tc, border: `1px solid ${bd}`, borderRadius: 12, padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, zIndex: 800, backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {reactions.map(r => (
                    <FloatingReaction key={r.id} emoji={r.emoji} name={r.name} id={r.id} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />
                ))}
            </AnimatePresence>

            <header style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', background: bb, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${bd}`, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <VideoIcon size={20} color="#e53e3e" strokeWidth={2.5} />
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px', color: tc }}>smartMeet</span>
                    {isHost && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f6c90e', background: 'rgba(246,201,14,0.12)', border: '1px solid rgba(246,201,14,0.3)', borderRadius: 6, padding: '2px 7px', letterSpacing: '0.5px' }}>HOST</span>}
                </div>

                <button onClick={copyRoom} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.35rem 1rem', borderRadius: 99, cursor: 'pointer', border: `1px solid ${bd}`, background: D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: mc, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.8px', fontFamily: 'monospace' }}>
                    <Shield size={13} />{roomId.toUpperCase()}{copied ? <Check size={13} color="#48bb78" /> : <Copy size={13} />}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.85rem', borderRadius: 8, border: `1px solid ${bd}`, background: 'transparent', color: tc, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                        <UserPlus size={15} /><span>Invite</span>
                    </button>
                    <button onClick={() => setIsDarkMode(!D)} style={{ width: 34, height: 34, borderRadius: '50%', border: `1px solid ${bd}`, background: 'transparent', color: tc, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {D ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: mc, fontSize: '0.85rem', fontWeight: 600 }}>
                        <Users size={15} /><span>{n}</span>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: gb, padding: '1.25rem', overflow: 'hidden', transition: 'background 0.4s', paddingRight: panel ? 'calc(1.25rem + 320px)' : '1.25rem' }}>
                <div style={grid(n)}>
                    <motion.div layout style={{ ...tileBase, boxShadow: handRaised ? '0 0 0 3px #f6c90e, 0 8px 32px rgba(0,0,0,0.5)' : tileBase.boxShadow }}>
                        <video playsInline muted autoPlay ref={localRef} style={{ ...videoFill, transform: isSharing ? 'none' : 'rotateY(180deg)' }} />
                        <div style={gradOver} />
                        {!videoOn && !isSharing && (
                            <div style={{ position: 'absolute', inset: 0, background: D ? '#1a0808' : '#e0e0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: D ? '#2a1010' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.08)' }}>
                                    {user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.8rem', fontWeight: 800, color: D ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>{mi}</span>}
                                </div>
                            </div>
                        )}
                        {isSharing && <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(66,153,225,0.85)', color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><ScreenShare size={10} /> Sharing</div>}
                        {handRaised && <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '1.4rem' }}>✋</div>}
                        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '4px 10px', color: '#fff' }}>
                            {user?.imageUrl && <img src={user.imageUrl} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                            <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>You</span>
                            {!micOn && <MicOff size={11} color="#fc8181" />}
                            {isHost && <Crown size={10} color="#f6c90e" />}
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {peers.map(p => (
                            <RemoteTile key={p.socketId} peer={p.peer} name={p.userName} avatar={p.userAvatar}
                                isDark={D} peerState={peerStates[p.socketId]} isHost={isHost}
                                onAdminMute={adminMute} socketId={p.socketId} hostSocketId={hostSocketId} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div style={{ position: 'relative', flexShrink: 0, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: bb, backdropFilter: 'blur(24px)', borderTop: `1px solid ${bd}`, zIndex: 60 }}>
                <div style={{ width: 110, color: mc, fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <Btn onClick={toggleMic} label={micOn ? 'Mute' : 'Unmute'} active={micOn} danger={!micOn} isDark={D}>
                        {micOn ? <Mic size={19} /> : <MicOff size={19} />}
                    </Btn>
                    <Btn onClick={toggleVideo} label={videoOn ? 'Stop Camera' : 'Start Camera'} active={videoOn} danger={!videoOn} isDark={D}>
                        {videoOn ? <VideoIcon size={19} /> : <VideoOff size={19} />}
                    </Btn>

                    <div style={{ width: 1, height: 26, background: D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)', margin: '0 0.1rem' }} />

                    <Btn onClick={toggleShare} label={isSharing ? 'Stop Share' : 'Share Screen'} isDark={D}
                        style={isSharing ? { background: 'rgba(66,153,225,0.22)', color: '#63b3ed', border: '1px solid rgba(66,153,225,0.4)' } : {}}>
                        {isSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
                    </Btn>

                    <Btn onClick={toggleHand} label={handRaised ? 'Lower Hand' : 'Raise Hand'} active={handRaised} isDark={D}
                        style={handRaised ? { background: 'rgba(246,201,14,0.2)', color: '#f6c90e', border: '1px solid rgba(246,201,14,0.35)' } : {}}>
                        <Hand size={18} />
                    </Btn>

                    <div style={{ position: 'relative' }}>
                        <Btn label="React" isDark={D} onClick={() => setShowReacts(p => !p)} active={showReacts}>
                            <span style={{ fontSize: '1.1rem' }}>😊</span>
                        </Btn>
                        <AnimatePresence>
                            {showReacts && <ReactionPicker onPick={sendReaction} onClose={() => setShowReacts(false)} isDark={D} barBord={bd} />}
                        </AnimatePresence>
                    </div>

                    <div style={{ width: 1, height: 26, background: D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)', margin: '0 0.1rem' }} />

                    <Btn onClick={() => openPanel('chat')} label="Chat" active={panel === 'chat'} isDark={D} badge={panel !== 'chat' ? unread : 0}>
                        <MessageSquare size={18} />
                    </Btn>

                    <Btn onClick={() => openPanel('participants')} label="Participants" active={panel === 'participants'} isDark={D}>
                        <Users size={18} />
                    </Btn>

                    <div style={{ width: 1, height: 26, background: D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)', margin: '0 0.1rem' }} />

                    <Btn onClick={hangup} label="Leave" danger wide isDark={D}>
                        <PhoneOff size={19} />
                    </Btn>
                </div>

                <div style={{ width: 110, display: 'flex', justifyContent: 'flex-end' }}>
                    <Btn label="Settings" isDark={D}><Settings size={18} /></Btn>
                </div>
            </div>

            <AnimatePresence>
                {panel === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} onClose={() => setPanel(null)} user={user} isDark={D} textCol={tc} barBg={bb} barBord={bd} mutedCol={mc} />}
                {panel === 'participants' && <ParticipantsPanel peers={peers} peerStates={peerStates} user={user} mySocketId={socketRef.current?.id} isHost={isHost} hostSocketId={hostSocketId} onAdminMute={adminMute} onClose={() => setPanel(null)} isDark={D} textCol={tc} barBg={bb} barBord={bd} mutedCol={mc} myMuted={!micOn} myHand={handRaised} />}
            </AnimatePresence>

            <AnimatePresence>
                {showInvite && <InviteModal roomId={roomId} inviteUrl={inviteUrl} onClose={() => setShowInvite(false)} isDark={D} textCol={tc} barBord={bd} mutedCol={mc} />}
            </AnimatePresence>
        </div>
    );
};

export default MeetingRoom;
