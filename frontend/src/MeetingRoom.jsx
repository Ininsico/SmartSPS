import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff, MessageSquare, Users, Settings, PhoneOff, Hand, Shield, Sun, Moon, Copy, Check, Link2, X, UserPlus, Wifi, WifiOff, Send, Crown, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser } from '@clerk/clerk-react';
import { mediaManager } from './mediaManager';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }, { urls: 'stun:stun3.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: 'stun:stun.services.mozilla.com' }] };
const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🎉', '🔥', '💯'];

const tileBase = { position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', background: '#0f0f0f', aspectRatio: '16/9', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.07)', transition: 'box-shadow 0.2s' };
const videoFill = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const gradOver = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)', pointerEvents: 'none' };

const FloatingReaction = ({ emoji, name, id, onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
    return (
        <motion.div initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -180, scale: 1.4 }} transition={{ duration: 3, ease: 'easeOut' }}
            style={{ position: 'fixed', bottom: 110, right: Math.random() * 200 + 40, zIndex: 900, pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{emoji}</div>
            <div style={{ fontSize: '0.7rem', color: '#fff', background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '1px 6px', marginTop: 2 }}>{name}</div>
        </motion.div>
    );
};

const ConnBadge = ({ state }) => {
    const map = { connected: { color: '#48bb78', icon: <Wifi size={10} />, label: 'Live' }, connecting: { color: '#ed8936', icon: <Wifi size={10} />, label: 'Connecting…' }, disconnected: { color: '#fc8181', icon: <WifiOff size={10} />, label: 'Offline' } }[state] || { color: '#888', icon: null, label: state };
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
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.22 }} style={{ ...tileBase, boxShadow: handUp ? '0 0 0 3px #f6c90e, 0 8px 32px rgba(0,0,0,0.5)' : tileBase.boxShadow }}>
            <video playsInline autoPlay ref={ref} style={videoFill} />
            <div style={gradOver} />
            {!hasStream && (
                <div style={{ position: 'absolute', inset: 0, background: isDark ? '#1a1010' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: isDark ? '#2a1a1a' : '#d0d0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.08)' }}>
                        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.8rem', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }}>{initials}</span>}
                    </div>
                </div>
            )}
            <ConnBadge state={connState} />
            {handUp && <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '1.4rem' }}>✋</div>}
            {isHost && (
                <button onClick={() => onAdminMute(socketId, isMuted)} title={isMuted ? 'Request Unmute' : 'Mute Participant'} style={{ position: 'absolute', top: 10, left: handUp ? 46 : 10, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 99, padding: '4px 8px', cursor: 'pointer', color: isMuted ? '#fc8181' : '#48bb78', display: 'flex', alignItems: 'center' }}>
                    {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
            )}
            <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '4px 10px', color: '#fff' }}>
                {avatar && <img src={avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{name}</span>
                {isMuted && <MicOff size={11} color="#fc8181" />}
            </div>
        </motion.div>
    );
};

const ChatPanel = ({ messages, onSend, onClose, user, isDark, textCol, barBg, barBord, mutedCol }) => {
    const [text, setText] = useState('');
    const ref = useRef();
    useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);
    const send = () => { if (text.trim()) { onSend(text); setText(''); } };
    return (
        <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="room-panel">
            <div className="panel-header">
                <span className="panel-title" style={{ color: textCol }}>Chat</span>
                <button onClick={onClose} className="panel-close" style={{ color: mutedCol }}><X size={18} /></button>
            </div>
            <div ref={ref} className="panel-scroll chat-list">
                {messages.map(m => (
                    <div key={m.id} className={`chat-msg-wrap ${m.from === 'me' ? 'me' : 'them'}`}>
                        <div className="chat-meta" style={{ color: mutedCol }}>
                            {m.from !== 'me' && m.userAvatar && <img src={m.userAvatar} alt="" />}
                            <span>{m.from === 'me' ? 'You' : m.userName}</span>
                        </div>
                        <div className="chat-bubble" style={{ background: m.from === 'me' ? '#e53e3e' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f3f6'), color: m.from === 'me' ? '#fff' : textCol }}>{m.text}</div>
                    </div>
                ))}
            </div>
            <div className="panel-footer chat-input-wrap" style={{ borderTop: `1px solid ${barBord}` }}>
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Say something…" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', color: textCol, border: `1px solid ${barBord}` }} />
                <button onClick={send} disabled={!text.trim()} className={text.trim() ? 'send-ready' : ''} style={{ background: text.trim() ? '#e53e3e' : 'transparent' }}><Send size={14} /></button>
            </div>
        </motion.div>
    );
};

const ParticipantsPanel = ({ peers, peerStates, user, mySocketId, isHost, hostSocketId, onAdminMute, onClose, isDark, textCol, barBg, barBord, mutedCol, myMuted, myHand }) => {
    const all = [{ socketId: mySocketId, userId: user?.id, userName: user?.fullName || 'You', userAvatar: user?.imageUrl, isYou: true, muted: myMuted, handRaised: myHand }, ...peers.map(p => ({ ...p, muted: peerStates[p.socketId]?.muted, handRaised: peerStates[p.socketId]?.handRaised }))];
    return (
        <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="room-panel">
            <div className="panel-header">
                <span className="panel-title" style={{ color: textCol }}>Participants ({all.length})</span>
                <button onClick={onClose} className="panel-close" style={{ color: mutedCol }}><X size={18} /></button>
            </div>
            <div className="panel-scroll p-list">
                {all.map(p => (
                    <div key={p.socketId} className={`p-item ${p.isYou ? 'you' : ''}`} style={{ background: p.isYou ? (isDark ? 'rgba(229,62,62,0.1)' : 'rgba(229,62,62,0.06)') : 'transparent' }}>
                        <div className="p-avatar-wrap">
                            {p.userAvatar && <img src={p.userAvatar} alt="" />}
                        </div>
                        <div className="p-info">
                            <div className="p-name" style={{ color: textCol }}>{p.userName}{p.isYou && <span className="you-label">You</span>}{(p.socketId === hostSocketId || (p.isYou && isHost)) && <Crown size={12} color="#f6c90e" />}</div>
                            <div className="p-status">
                                {p.muted ? <MicOff size={11} color="#fc8181" /> : <Mic size={11} color="#48bb78" />}
                                {p.handRaised && <span>✋</span>}
                            </div>
                        </div>
                        {isHost && !p.isYou && <button onClick={() => onAdminMute(p.socketId, p.muted)} className={`p-mute-btn ${p.muted ? 'muted' : ''}`} style={{ color: p.muted ? '#fc8181' : mutedCol }}>{p.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const ReactionPicker = ({ onPick, onClose, isDark, barBord }) => (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className="react-picker" style={{ background: isDark ? '#1a0a0a' : '#fff', border: `1px solid ${barBord}` }}>
        {REACTIONS.map(e => (<button key={e} onClick={() => { onPick(e); onClose(); }}>{e}</button>))}
    </motion.div>
);

const InviteModal = ({ roomId, onClose, isDark, textCol, barBord, mutedCol }) => {
    const [done, setDone] = useState(false);
    const copy = () => { const link = `${window.location.origin}?room=${roomId}`; navigator.clipboard.writeText(link).then(() => { setDone(true); setTimeout(() => setDone(false), 2500); }); };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="invite-overlay" onClick={onClose}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="invite-modal" style={{ background: isDark ? '#1a0a0a' : '#fff', color: textCol, border: `1px solid ${barBord}` }} onClick={e => e.stopPropagation()}>
                <div className="invite-top">
                    <div><h2>Invite people</h2><p style={{ color: mutedCol }}>Share code or link with your team</p></div>
                    <button onClick={onClose} style={{ color: mutedCol }}><X size={20} /></button>
                </div>
                <div className="invite-group">
                    <label style={{ color: mutedCol }}>Room Code</label>
                    <div className="invite-box code" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${barBord}` }}><span>{roomId.toUpperCase()}</span><Shield size={18} /></div>
                </div>
                <div className="invite-group">
                    <label style={{ color: mutedCol }}>Invite Link</label>
                    <div className="invite-box link" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${barBord}` }}><Link2 size={14} /><span>{`${window.location.origin}?room=${roomId}`}</span></div>
                </div>
                <button onClick={copy} className={`copy-btn ${done ? 'done' : ''}`} style={{ background: done ? '#276749' : '#e53e3e' }}>{done ? <><Check size={17} /> Copied!</> : <><Copy size={17} /> Copy Link</>}</button>
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
        mountedRef.current = true; initMedia();
        return () => { mountedRef.current = false; peersRef.current.forEach(p => p.peer?.destroy()); peersRef.current = []; mediaManager.unregister(streamRef.current); streamRef.current = null; screenRef.current?.stop(); socketRef.current?.disconnect(); };
    }, []);
    const initMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, googEchoCancellation: true, googAutoGainControl: true, googNoiseSuppression: true, googHighpassFilter: true, sampleRate: 48000 } });
            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream; mediaManager.registerStream(stream); stream.getAudioTracks().forEach(t => t.enabled = micOn); stream.getVideoTracks().forEach(t => t.enabled = videoOn);
            if (localRef.current) localRef.current.srcObject = stream; connectSocket(stream);
        } catch (err) { console.error('Media error:', err); }
    };
    const connectSocket = (stream) => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
        const socket = io(socketUrl, { transports: ['polling', 'websocket'], reconnectionAttempts: Infinity });
        socketRef.current = socket;
        const join = () => { if (!user?.id) return; socket.emit('join-room', { roomId, userId: user.id, userName: user?.fullName || user?.username || 'Anonymous', userAvatar: user?.imageUrl }); };
        socket.on('connect', join); socket.on('host-status', (amHost) => { setIsHost(amHost); if (amHost) setHostSocketId(socket.id); });
        socket.on('invite-url', (url) => setInviteUrl(url)); socket.on('host-changed', ({ newHostSocketId }) => { setHostSocketId(newHostSocketId); if (newHostSocketId === socket.id) { setIsHost(true); showToast('You are now the host 👑'); } });
        socket.on('all-users', (users) => { users.forEach(({ socketId, userId: uid, userName, userAvatar }) => { const peer = makePeer({ initiator: false, target: socketId, socket }); const obj = { socketId, userId: uid, userName, userAvatar, peer }; peersRef.current.push(obj); setPeers(prev => [...prev.filter(p => p.userId !== uid), obj]); }); });
        socket.on('peer-joined', ({ socketId, userId: uid, userName, userAvatar }) => { const peer = makePeer({ initiator: true, target: socketId, socket }); const obj = { socketId, userId: uid, userName, userAvatar, peer }; peersRef.current.push(obj); setPeers(prev => [...prev.filter(p => p.userId !== uid), obj]); });
        socket.on('signal', ({ from, signal }) => { let item = peersRef.current.find(p => p.socketId === from); if (!item) { const peer = makePeer({ initiator: false, target: from, socket }); item = { socketId: from, userName: 'Connecting...', peer }; peersRef.current.push(item); setPeers(p => [...p, item]); } item.peer.signal(signal); });
        socket.on('user-left', (id) => { peersRef.current.find(p => p.socketId === id)?.peer?.destroy(); peersRef.current = peersRef.current.filter(p => p.socketId !== id); setPeers(prev => prev.filter(p => p.socketId !== id)); });
        socket.on('reaction', ({ from, userName, emoji }) => { if (from !== socket.id) setReactions(p => [...p, { id: Date.now(), emoji, name: userName }]); });
        socket.on('chat-message', (msg) => { if (msg.from !== socket.id) { setMessages(p => [...p, msg]); if (panel !== 'chat') setUnread(u => u + 1); } });
        socket.on('peer-state-change', ({ socketId, muted, handRaised: rh }) => { setPeerStates(p => ({ ...p, [socketId]: { ...p[socketId], muted: muted ?? p[socketId]?.muted, handRaised: rh ?? p[socketId]?.handRaised } })); });
        socket.on('force-muted', ({ byName }) => { setMicOn(false); streamRef.current?.getAudioTracks().forEach(t => t.enabled = false); socket.emit('state-change', { roomId, muted: true }); showToast(`Muted by ${byName} 🤫`); });
    };
    const makePeer = useCallback(({ initiator, target, socket }) => {
        const peer = new Peer({ initiator, trickle: true, config: ICE_SERVERS, stream: streamRef.current });
        peer.on('signal', s => socket.emit('signal', { to: target, signal: s })); return peer;
    }, []);
    const hangup = () => { onLeave(); };
    const toggleMic = () => { const next = !micOn; setMicOn(next); streamRef.current?.getAudioTracks().forEach(t => t.enabled = next); socketRef.current?.emit('state-change', { roomId, muted: !next }); };
    const toggleVideo = async () => { const next = !videoOn; setVideoOn(next); if (!next) { streamRef.current?.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; }); } else { try { const ns = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } }); const t = ns.getVideoTracks()[0]; const b = streamRef.current; if (b) { b.getVideoTracks().forEach(v => { v.stop(); b.removeTrack(v); }); b.addTrack(t); if (localRef.current) localRef.current.srcObject = b; peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(t)); } } catch (_) { setVideoOn(false); } } };
    const toggleShare = async () => { if (isSharing) { setIsSharing(false); } else { try { const ss = await navigator.mediaDevices.getDisplayMedia({ video: true }); const st = ss.getVideoTracks()[0]; screenRef.current = st; setIsSharing(true); peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(st)); st.onended = () => setIsSharing(false); } catch (e) { } } };
    const toggleHand = () => { const n = !handRaised; setHandRaised(n); socketRef.current?.emit('raise-hand', { roomId, raised: n }); };
    const sendReaction = (e) => { socketRef.current?.emit('reaction', { roomId, emoji: e }); setReactions(p => [...p, { id: Date.now(), emoji: e, name: 'You' }]); };
    const sendMessage = (t) => { const m = { id: Date.now(), from: 'me', userName: user?.fullName || 'You', userAvatar: user?.imageUrl, text: t }; setMessages(p => [...p, m]); socketRef.current?.emit('chat-message', { roomId, text: t }); };
    const adminMute = (t, m) => socketRef.current?.emit(m ? 'admin-request-unmute' : 'admin-mute', { targetSocketId: t, roomId });

    const D = isDarkMode;
    const bg = D ? '#1a0a0a' : '#f0f0f5', tc = D ? '#fff' : '#000', bd = D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', bb = D ? 'rgba(26,10,10,0.95)' : 'rgba(255,255,255,0.95)', mc = D ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const n = peers.length + 1;
    const gridStyle = () => {
        let cols = 1; if (n > 1) cols = 2; if (n > 4) cols = 3; if (n > 9) cols = 4;
        if (window.innerWidth < 768) cols = n > 2 ? 2 : 1;
        return { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '1rem', width: '100%', maxWidth: 1400, margin: '0 auto' };
    };

    return (
        <div className="meeting-room-root">
            <header className="room-header">
                <div className="header-left">
                    <VideoIcon size={20} color="#e53e3e" />
                    <span className="logo-txt" style={{ color: tc }}>smartMeet</span>
                </div>
                <div className="header-right">
                    <button className="invite-btn hide-mobile" onClick={() => setShowInvite(true)} style={{ color: tc }}><UserPlus size={16} /><span>Invite</span></button>
                    <button className="theme-btn" onClick={() => setIsDarkMode(!D)} style={{ color: tc }}>{D ? <Sun size={16} /> : <Moon size={16} />}</button>
                    <div className="p-count" style={{ color: mc }}><Users size={16} /><span>{n}</span></div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>
            <main className="room-main" style={{ paddingRight: (panel && window.innerWidth > 768) ? 320 : 0 }}>
                <div style={gridStyle()}>
                    <motion.div layout style={tileBase}>
                        <video ref={localRef} autoPlay playsInline muted style={{ ...videoFill, transform: 'rotateY(180deg)' }} />
                        <div style={gradOver} /><div className="tile-label">You {handRaised && '✋'}</div>
                        {!videoOn && <div className="video-off-overlay">Avatar</div>}
                    </motion.div>
                    {peers.map(p => <RemoteTile key={p.socketId} peer={p.peer} name={p.userName} avatar={p.userAvatar} isDark={D} peerState={peerStates[p.socketId]} isHost={isHost} onAdminMute={adminMute} socketId={p.socketId} />)}
                </div>
            </main>
            <footer className="room-footer">
                <div className="footer-left hide-mobile" style={{ color: mc }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="footer-center">
                    <button className={`ctrl-btn ${!micOn ? 'danger' : ''}`} onClick={toggleMic} style={{ color: !micOn ? '#fff' : tc }}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
                    <button className={`ctrl-btn ${!videoOn ? 'danger' : ''}`} onClick={toggleVideo} style={{ color: !videoOn ? '#fff' : tc }}>{videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}</button>
                    <button className="ctrl-btn" onClick={toggleShare} style={{ color: tc }}><ScreenShare size={20} /></button>
                    <button className={`ctrl-btn ${handRaised ? 'active' : ''}`} onClick={toggleHand} style={{ color: handRaised ? '#e53e3e' : tc }}><Hand size={20} /></button>
                    <div className="btn-group">
                        <button className="ctrl-btn" onClick={() => setShowReacts(!showReacts)}>😊</button>
                        <button className={`ctrl-btn ${panel === 'chat' ? 'active' : ''}`} onClick={() => setPanel(panel === 'chat' ? null : 'chat')} style={{ color: tc }}><MessageSquare size={18} />{unread > 0 && <span className="badge">{unread}</span>}</button>
                        <button className={`ctrl-btn ${panel === 'participants' ? 'active' : ''}`} onClick={() => setPanel(panel === 'participants' ? null : 'participants')} style={{ color: tc }}><Users size={18} /></button>
                    </div>
                    <button className="ctrl-btn hangup" onClick={hangup}><PhoneOff size={20} /></button>
                </div>
                <div className="footer-right hide-mobile"><button className="ctrl-btn" style={{ color: tc }}><Settings size={18} /></button></div>
            </footer>
            <AnimatePresence>
                {panel === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} onClose={() => setPanel(null)} user={user} isDark={D} textCol={tc} barBg={bb} barBord={bd} mutedCol={mc} />}
                {panel === 'participants' && <ParticipantsPanel peers={peers} peerStates={peerStates} user={user} isHost={isHost} onAdminMute={adminMute} onClose={() => setPanel(null)} isDark={D} textCol={tc} barBg={bb} barBord={bd} mutedCol={mc} />}
                {showReacts && <ReactionPicker onPick={sendReaction} onClose={() => setShowReacts(false)} isDark={D} barBord={bd} />}
                {showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} isDark={D} textCol={tc} barBord={bd} mutedCol={mc} />}
            </AnimatePresence>
            <style dangerouslySetInnerHTML={{
                __html: `
                .meeting-room-root { height: 100vh; display: flex; flex-direction: column; background: ${bg}; color: ${tc}; position: relative; overflow: hidden; }
                .room-header { height: 60px; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; background: ${bb}; border-bottom: 1px solid ${bd}; backdrop-filter: blur(10px); z-index: 100; }
                .header-left, .header-right { display: flex; align-items: center; gap: 1rem; }
                .room-main { flex: 1; padding: 1.5rem; display: flex; align-items: center; transition: padding 0.3s; overflow-y: auto; }
                .room-footer { height: 80px; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; background: ${bb}; border-top: 1px solid ${bd}; z-index: 100; }
                .footer-center { display: flex; align-items: center; gap: 0.5rem; }
                .ctrl-btn { width: 44px; height: 44px; border-radius: 12px; border: 1px solid ${bd}; background: transparent; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; position: relative; }
                .ctrl-btn:hover { background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; }
                .ctrl-btn.active { background: rgba(229, 62, 62, 0.1); border-color: #e53e3e; }
                .ctrl-btn.danger { background: #e53e3e; border-color: #e53e3e; }
                .ctrl-btn.hangup { background: #e53e3e; color: #fff; width: 60px; border-color: #e53e3e; }
                .room-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 320px; background: ${bb}; border-left: 1px solid ${bd}; z-index: 200; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(0,0,0,0.2); }
                .panel-header { padding: 1.25rem; border-bottom: 1px solid ${bd}; display: flex; justify-content: space-between; align-items: center; }
                .panel-scroll { flex: 1; overflow-y: auto; padding: 1.25rem; }
                .badge { position: absolute; top: -5px; right: -5px; background: #e53e3e; color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 2px solid ${bb}; }
                
                @media (min-width: 769px) {
                    .room-panel { top: 60px; bottom: 80px; }
                }

                @media (max-width: 768px) {
                    .hide-mobile { display: none; }
                    .room-panel { width: 100%; z-index: 300; }
                    .room-main { padding: 0.75rem; }
                    .footer-center { gap: 0.4rem; width: 100%; justify-content: space-around; }
                    .ctrl-btn { width: 42px; height: 42px; border-radius: 10px; }
                    .ctrl-btn.hangup { width: 50px; }
                    .btn-group { display: flex; gap: 0.4rem; }
                }
            ` }} />
        </div>
    );
};
export default MeetingRoom;
