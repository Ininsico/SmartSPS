import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff, MessageSquare, Users, Settings, PhoneOff, Hand, Shield, Sun, Moon, Copy, Check, Link2, X, UserPlus, Wifi, WifiOff, Send, Crown, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser } from '@clerk/clerk-react';
import { mediaManager } from './mediaManager';

// Optimised ICE: keep Google STUNs but lead with the fastest ones
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,          // pre-gather candidates before offer
    bundlePolicy: 'max-bundle',        // bundle all tracks on one transport
    rtcpMuxPolicy: 'require',          // mux RTCP with RTP — saves a port
};

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
    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);
    const showToast = (msg, dur = 3000) => { setToast(msg); setTimeout(() => setToast(null), dur); };
    useEffect(() => { const id = setInterval(() => forceTime(t => t + 1), 30000); return () => clearInterval(id); }, []);
    useEffect(() => {
        mountedRef.current = true; initMedia();
        return () => { mountedRef.current = false; peersRef.current.forEach(p => p.peer?.destroy()); peersRef.current = []; mediaManager.unregister(streamRef.current); streamRef.current = null; screenRef.current?.stop(); socketRef.current?.disconnect(); };
    }, []);
    const initMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'user',
                },
                audio: {
                    // ── Echo / noise / gain ──────────────────────────────
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    // ── Voice-optimised codec settings ───────────────────
                    channelCount: 1,          // mono — halves bitrate, better AEC
                    sampleRate: 48000,        // Opus native rate
                    sampleSize: 16,
                    latency: 0.01,            // hint 10 ms preferred latency
                    // ── Legacy Chrome hints (still help in some versions) ─
                    googEchoCancellation: true,
                    googAutoGainControl: true,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                    googExperimentalEchoCancellation: true,
                    googExperimentalNoiseSuppression: true,
                },
            });

            if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream; mediaManager.registerStream(stream); stream.getAudioTracks().forEach(t => t.enabled = micOn); stream.getVideoTracks().forEach(t => t.enabled = videoOn);
            if (localRef.current) localRef.current.srcObject = stream; connectSocket(stream);
        } catch (err) { console.error('Media error:', err); }
    };
    const connectSocket = (stream) => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
        const socket = io(socketUrl, {
            // Prefer WebSocket immediately — skip the polling upgrade handshake
            // which adds 300-600 ms of unnecessary latency on every connect.
            transports: ['websocket', 'polling'],
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 10000,
        });
        socketRef.current = socket;
        const join = () => {
            // Use a retry in case Clerk hasn't loaded user yet
            const doJoin = (attempts = 0) => {
                const u = userRef.current;
                if (!u?.id) {
                    if (attempts < 20) setTimeout(() => doJoin(attempts + 1), 300);
                    return;
                }
                socket.emit('join-room', { roomId, userId: u.id, userName: u.fullName || u.username || 'Anonymous', userAvatar: u.imageUrl });
            };
            doJoin();
        };
        socket.on('connect', join); socket.on('host-status', (amHost) => { setIsHost(amHost); if (amHost) setHostSocketId(socket.id); });
        socket.on('invite-url', (url) => setInviteUrl(url)); socket.on('host-changed', ({ newHostSocketId }) => { setHostSocketId(newHostSocketId); if (newHostSocketId === socket.id) { setIsHost(true); showToast('You are now the host 👑'); } });
        socket.on('all-users', (users) => { users.forEach(({ socketId, userId: uid, userName, userAvatar }) => { const peer = makePeer({ initiator: false, target: socketId, socket }); const obj = { socketId, userId: uid, userName, userAvatar, peer }; peersRef.current.push(obj); setPeers(prev => [...prev.filter(p => p.userId !== uid), obj]); }); });
        socket.on('peer-joined', ({ socketId, userId: uid, userName, userAvatar }) => { const peer = makePeer({ initiator: true, target: socketId, socket }); const obj = { socketId, userId: uid, userName, userAvatar, peer }; peersRef.current.push(obj); setPeers(prev => [...prev.filter(p => p.userId !== uid), obj]); });
        socket.on('signal', ({ from, signal }) => { const item = peersRef.current.find(p => p.socketId === from); if (item) { item.peer.signal(signal); } });
        socket.on('user-left', (id) => { peersRef.current.find(p => p.socketId === id)?.peer?.destroy(); peersRef.current = peersRef.current.filter(p => p.socketId !== id); setPeers(prev => prev.filter(p => p.socketId !== id)); });
        socket.on('reaction', ({ from, userName, emoji }) => { if (from !== socket.id) setReactions(p => [...p, { id: Date.now(), emoji, name: userName }]); });
        socket.on('chat-message', (msg) => { if (msg.from !== socket.id) { setMessages(p => [...p, msg]); if (panel !== 'chat') setUnread(u => u + 1); } });
        socket.on('peer-state-change', ({ socketId, muted, handRaised: rh }) => { setPeerStates(p => ({ ...p, [socketId]: { ...p[socketId], muted: muted ?? p[socketId]?.muted, handRaised: rh ?? p[socketId]?.handRaised } })); });
        socket.on('force-muted', ({ byName }) => { setMicOn(false); streamRef.current?.getAudioTracks().forEach(t => t.enabled = false); socket.emit('state-change', { roomId, muted: true }); showToast(`Muted by ${byName} 🤫`); });
    };
    const makePeer = useCallback(({ initiator, target, socket }) => {
        const peer = new Peer({
            initiator,
            trickle: true,
            config: ICE_SERVERS,
            stream: streamRef.current,
            // ── SDP transform: force Opus with low-latency CBR settings ──
            sdpTransform: (sdp) => {
                // Force Opus codec and set preferred parameters
                return sdp
                    // Prefer Opus (111) over other audio codecs
                    .replace(
                        /m=audio (\d+) UDP\/TLS\/RTP\/SAVPF ([\d ]+)/,
                        (match, port, codecs) => {
                            const parts = codecs.split(' ');
                            const opusIdx = parts.indexOf('111');
                            if (opusIdx > 0) {
                                parts.splice(opusIdx, 1);
                                parts.unshift('111');
                            }
                            return `m=audio ${port} UDP/TLS/RTP/SAVPF ${parts.join(' ')}`;
                        }
                    )
                    // Opus: stereo=0 (mono), useinbandfec=1 (packet loss recovery),
                    //        usedtx=1 (silence suppression saves bandwidth),
                    //        cbr=1 (constant bitrate — prevents jitter spikes),
                    //        maxplaybackrate=48000
                    .replace(
                        /a=fmtp:111 .*/,
                        'a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1;cbr=1;stereo=0;sprop-stereo=0;maxplaybackrate=48000'
                    )
                    // Cap audio bitrate to 32 kbps — plenty for voice, prevents congestion
                    .replace(/b=AS:(\d+)\r\n/g, 'b=AS:32\r\n');
            },
        });

        peer.on('signal', s => socket.emit('signal', { to: target, signal: s }));

        // ── After connection, cap bitrates via RTCRtpSender ──────────
        peer.on('connect', async () => {
            try {
                const pc = peer._pc;
                if (!pc) return;
                for (const sender of pc.getSenders()) {
                    const params = sender.getParameters();
                    if (!params.encodings) params.encodings = [{}];
                    if (sender.track?.kind === 'video') {
                        // Cap video at 800 kbps max — reduces buffering/lag
                        params.encodings[0].maxBitrate = 800_000;
                        params.encodings[0].maxFramerate = 30;
                        params.encodings[0].networkPriority = 'high';
                    } else if (sender.track?.kind === 'audio') {
                        // Hard cap audio at 40 kbps
                        params.encodings[0].maxBitrate = 40_000;
                        params.encodings[0].priority = 'high';
                        params.encodings[0].networkPriority = 'high';
                    }
                    await sender.setParameters(params);
                }
            } catch (_) { /* some browsers don't support setParameters */ }
        });

        return peer;
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
    const bg = D ? '#050202' : '#f8f9fa', tc = D ? '#fff' : '#1a1a1a', bd = D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bb = D ? 'rgba(10,5,5,0.98)' : 'rgba(255,255,255,0.98)', mc = D ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)';
    const n = peers.length + 1;

    const gridStyle = () => {
        let cols = 1;
        if (n > 1) cols = 2;
        if (n > 4) cols = 3;
        if (n > 9) cols = 4;
        if (n > 16) cols = 5;

        if (window.innerWidth < 768) {
            cols = n > 2 ? 2 : 1;
        }

        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '1.25rem',
            width: '100%',
            height: '100%',
            maxWidth: '1600px',
            margin: '0 auto',
            alignContent: 'center',
            justifyContent: 'center'
        };
    };

    return (
        <div className="meeting-room-root">
            <header className="room-header">
                <div className="header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#e53e3e', padding: '6px', borderRadius: '8px' }}>
                            <VideoIcon size={18} color="#fff" />
                        </div>
                        <span className="logo-txt" style={{ color: tc, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>smartMeet</span>
                    </div>
                    <div className="room-id-badge hide-mobile" style={{ background: bd, padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', color: mc, fontWeight: 600, marginLeft: '1rem' }}>
                        {roomId.toUpperCase()}
                    </div>
                </div>
                <div className="header-right">
                    <button className="invite-btn hide-mobile" onClick={() => setShowInvite(true)} style={{ color: tc, background: bd, border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, transition: '0.2s' }}>
                        <UserPlus size={16} />
                        <span>Invite Team</span>
                    </button>
                    <button className="theme-btn" onClick={() => setIsDarkMode(!D)} style={{ background: 'none', border: 'none', color: tc, cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                        {D ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <div className="p-count hide-mobile" style={{ color: mc, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} />
                        <span style={{ fontWeight: 700 }}>{n}</span>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <div className="room-body">
                <main className="room-main">
                    <div style={gridStyle()}>
                        <motion.div layout style={tileBase}>
                            <video ref={localRef} autoPlay playsInline muted style={{ ...videoFill, transform: 'rotateY(180deg)' }} />
                            <div style={gradOver} />
                            <div className="tile-label" style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '4px 10px', color: '#fff', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {user?.imageUrl && <img src={user.imageUrl} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />}
                                You {handRaised && '✋'}
                                {!videoOn && <VideoOff size={11} color="#fc8181" />}
                                {!micOn && <MicOff size={11} color="#fc8181" />}
                            </div>
                            {!videoOn && (
                                <div className="video-off-overlay" style={{ position: 'absolute', inset: 0, background: D ? '#1a1010' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: D ? '#2a1a1a' : '#d0d0d8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: D ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
                                        {user?.imageUrl ? <img src={user.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : user?.fullName?.[0] || '?'}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                        {peers.map(p => (
                            <RemoteTile
                                key={p.socketId}
                                peer={p.peer}
                                name={p.userName}
                                avatar={p.userAvatar}
                                isDark={D}
                                peerState={peerStates[p.socketId]}
                                isHost={isHost}
                                onAdminMute={adminMute}
                                socketId={p.socketId}
                            />
                        ))}
                    </div>
                </main>

                <AnimatePresence mode="popLayout">
                    {panel && (
                        <div className="panel-container">
                            {panel === 'chat' && <ChatPanel messages={messages} onSend={sendMessage} onClose={() => setPanel(null)} user={user} isDark={D} textCol={tc} barBg={bb} barBord={bd} mutedCol={mc} />}
                            {panel === 'participants' && <ParticipantsPanel peers={peers} peerStates={peerStates} user={user} isHost={isHost} hostSocketId={hostSocketId} mySocketId={socketRef.current?.id} onAdminMute={adminMute} onClose={() => setPanel(null)} isDark={D} textCol={tc} barBg={bb} barBord={bd} mutedCol={mc} myMuted={!micOn} myHand={handRaised} />}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="room-footer">
                <div className="footer-left hide-mobile" style={{ color: mc, fontWeight: 600, fontSize: '0.9rem' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | <span style={{ color: tc }}>{roomId}</span>
                </div>

                <div className="footer-center">
                    <button className={`ctrl-btn ${!micOn ? 'danger' : ''}`} onClick={toggleMic} style={{ color: !micOn ? '#fff' : tc }}>
                        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <button className={`ctrl-btn ${!videoOn ? 'danger' : ''}`} onClick={toggleVideo} style={{ color: !videoOn ? '#fff' : tc }}>
                        {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                    </button>
                    <button className={`ctrl-btn ${isSharing ? 'active' : ''}`} onClick={toggleShare} style={{ color: isSharing ? '#e53e3e' : tc }}>
                        <ScreenShare size={20} />
                    </button>
                    <button className={`ctrl-btn ${handRaised ? 'active' : ''}`} onClick={toggleHand} style={{ color: handRaised ? '#e53e3e' : tc }}>
                        <Hand size={20} />
                    </button>

                    <div className="btn-divider" style={{ width: '1px', height: '24px', background: bd, margin: '0 8px' }} />

                    <button className="ctrl-btn" onClick={() => setShowReacts(!showReacts)} style={{ fontSize: '1.2rem' }}>😊</button>
                    <button className={`ctrl-btn ${panel === 'chat' ? 'active' : ''}`} onClick={() => setPanel(panel === 'chat' ? null : 'chat')} style={{ color: tc }}>
                        <MessageSquare size={18} />
                        {unread > 0 && <span className="badge">{unread}</span>}
                    </button>
                    <button className={`ctrl-btn ${panel === 'participants' ? 'active' : ''}`} onClick={() => setPanel(panel === 'participants' ? null : 'participants')} style={{ color: tc }}>
                        <Users size={18} />
                    </button>

                    <button className="ctrl-btn hangup" onClick={hangup}>
                        <PhoneOff size={22} />
                    </button>
                </div>

                <div className="footer-right hide-mobile">
                    <button className="ctrl-btn" style={{ color: tc }}>
                        <Settings size={18} />
                    </button>
                </div>
            </footer>

            <AnimatePresence>
                {reactions.map(r => <FloatingReaction key={r.id} emoji={r.emoji} name={r.name} onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />)}
                {showReacts && <ReactionPicker onPick={sendReaction} onClose={() => setShowReacts(false)} isDark={D} barBord={bd} />}
                {showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} isDark={D} textCol={tc} barBord={bd} mutedCol={mc} />}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                .meeting-room-root { height: 100vh; display: flex; flex-direction: column; background: ${bg}; color: ${tc}; position: relative; overflow: hidden; font-family: 'Montserrat', sans-serif; }
                .room-header { height: 70px; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; background: ${bb}; border-bottom: 1px solid ${bd}; backdrop-filter: blur(20px); z-index: 1000; }
                .room-body { flex: 1; display: flex; overflow: hidden; position: relative; }
                .room-main { flex: 1; padding: 1.5rem; display: flex; flex-direction: column; overflow-y: auto; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .room-footer { height: 90px; padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; background: ${bb}; border-top: 1px solid ${bd}; z-index: 1000; }
                
                .panel-container { width: 360px; height: 100%; border-left: 1px solid ${bd}; background: ${bb}; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .room-panel { height: 100%; display: flex; flex-direction: column; width: 100%; }
                
                .header-left, .header-right { display: flex; align-items: center; gap: 1.25rem; }
                .footer-center { display: flex; align-items: center; gap: 0.75rem; }
                
                .ctrl-btn { width: 48px; height: 48px; border-radius: 14px; border: 1px solid ${bd}; background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; position: relative; }
                .ctrl-btn:hover { background: ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}; transform: translateY(-2px); }
                .ctrl-btn.active { background: rgba(229, 62, 62, 0.12); border-color: rgba(229, 62, 62, 0.4); }
                .ctrl-btn.danger { background: #e53e3e; border-color: #e53e3e; box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3); }
                .ctrl-btn.hangup { background: #e53e3e; color: #fff; width: 64px; border-color: #e53e3e; box-shadow: 0 4px 15px rgba(229, 62, 62, 0.4); margin-left: 0.5rem; }
                .ctrl-btn.hangup:hover { transform: scale(1.05); background: #c53030; }

                .badge { position: absolute; top: -4px; right: -4px; background: #e53e3e; color: #fff; font-size: 0.7rem; font-weight: 800; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid ${bb}; }
                
                .panel-header { padding: 1.5rem; border-bottom: 1px solid ${bd}; display: flex; justify-content: space-between; align-items: center; }
                .panel-title { font-weight: 800; font-size: 1.1rem; letter-spacing: -0.5px; }
                .panel-scroll { flex: 1; overflow-y: auto; padding: 1.5rem; }
                
                .p-item { display: flex; align-items: center; gap: 12px; padding: 10px; borderRadius: 12px; margin-bottom: 8px; transition: 0.2s; }
                .p-avatar-wrap { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: ${bd}; }
                .p-avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }
                .p-info { flex: 1; }
                .p-name { font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; }
                .you-label { font-size: 0.65rem; background: ${bd}; padding: 2px 6px; borderRadius: 4px; color: ${mc}; }
                .p-mute-btn { background: none; border: none; padding: 8px; cursor: pointer; borderRadius: 8px; transition: 0.2s; }
                .p-mute-btn:hover { background: ${bd}; }
                
                .chat-msg-wrap { margin-bottom: 1.25rem; display: flex; flex-direction: column; }
                .chat-msg-wrap.me { align-items: flex-end; }
                .chat-meta { font-size: 0.7rem; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
                .chat-meta img { width: 14px; height: 14px; border-radius: 50%; }
                .chat-bubble { padding: 10px 14px; border-radius: 14px; font-size: 0.9rem; line-height: 1.4; max-width: 85%; word-break: break-word; }
                .chat-msg-wrap.me .chat-bubble { border-bottom-right-radius: 2px; }
                .chat-msg-wrap.them .chat-bubble { border-bottom-left-radius: 2px; }
                
                .chat-input-wrap { padding: 1.25rem; display: flex; gap: 10px; }
                .chat-input-wrap input { flex: 1; padding: 10px 15px; border-radius: 10px; border: none; font-size: 0.9rem; outline: none; }
                .chat-input-wrap button { width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; transition: 0.2s; }

                .react-picker { position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; padding: 12px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1100; }
                .react-picker button { font-size: 1.5rem; background: none; border: none; cursor: pointer; transition: transform 0.2s; }
                .react-picker button:hover { transform: scale(1.3); }

                .invite-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; alignItems: center; justifyContent: center; z-index: 2000; padding: 1rem; }
                .invite-modal { width: 100%; maxWidth: 450px; padding: 2rem; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .invite-top { display: flex; justify-content: space-between; alignItems: flex-start; margin-bottom: 2rem; }
                .invite-top h2 { font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
                .invite-group { margin-bottom: 1.5rem; }
                .invite-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .invite-box { display: flex; alignItems: center; gap: 12px; padding: 12px 16px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; }
                .invite-box.code { font-size: 1.2rem; letter-spacing: 2px; }
                .copy-btn { width: 100%; height: 50px; border-radius: 12px; border: none; color: #fff; font-weight: 800; cursor: pointer; display: flex; alignItems: center; justifyContent: center; gap: 8px; transition: 0.3s; }

                @media (max-width: 768px) {
                    .hide-mobile { display: none; }
                    .room-header { height: 60px; padding: 0 1rem; }
                    .room-footer { height: 80px; padding: 0 0.5rem; }
                    .room-body { flex-direction: column; }
                    .panel-container { position: absolute; inset: 0; width: 100%; z-index: 1100; border-left: none; }
                    .room-main { padding: 0.75rem; }
                    .footer-center { gap: 4px; width: 100%; justify-content: space-around; }
                    .ctrl-btn { width: 42px; height: 42px; border-radius: 10px; }
                    .ctrl-btn.hangup { width: 50px; }
                }
            ` }} />
        </div>
    );
};
export default MeetingRoom;
