import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff,
    MessageSquare, Users, Settings, PhoneOff,
    Hand, Shield, Sun, Moon, Copy, Check, Link2, X, UserPlus, Wifi, WifiOff
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

const tileBase = {
    position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
    background: '#0f0f0f', aspectRatio: '16/9',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.07)',
};
const videoFill = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const gradientOverlay = {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)',
    pointerEvents: 'none',
};

const ConnBadge = ({ state }) => {
    const cfg = {
        connected: { color: '#48bb78', icon: <Wifi size={11} />, label: 'Live' },
        connecting: { color: '#ed8936', icon: <Wifi size={11} />, label: 'Connecting…' },
        disconnected: { color: '#fc8181', icon: <WifiOff size={11} />, label: 'Reconnecting' },
        failed: { color: '#fc8181', icon: <WifiOff size={11} />, label: 'Failed' },
    }[state] || { color: '#888', icon: null, label: state };
    return (
        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: `1px solid ${cfg.color}44`, borderRadius: '99px', padding: '0.25rem 0.6rem', color: cfg.color, fontSize: '0.68rem', fontWeight: 700 }}>
            {cfg.icon}{cfg.label}
        </div>
    );
};

const RemoteTile = ({ peer, name, avatar, isDarkMode }) => {
    const videoRef = useRef();
    const [connState, setConnState] = useState('connecting');
    const [hasStream, setHasStream] = useState(false);
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

    useEffect(() => {
        if (!peer) return;
        const onStream = (s) => { if (videoRef.current) { videoRef.current.srcObject = s; setHasStream(true); } };
        const onConnect = () => setConnState('connected');
        const onClose = () => setConnState('disconnected');
        const onError = () => setConnState('failed');
        peer.on('stream', onStream);
        peer.on('connect', onConnect);
        peer.on('close', onClose);
        peer.on('error', onError);
        return () => {
            peer.off('stream', onStream);
            peer.off('connect', onConnect);
            peer.off('close', onClose);
            peer.off('error', onError);
        };
    }, [peer]);

    return (
        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.22 }} style={tileBase}>
            <video playsInline autoPlay ref={videoRef} style={videoFill} />
            <div style={gradientOverlay} />
            {!hasStream && (
                <div style={{ position: 'absolute', inset: 0, background: isDarkMode ? '#1a0808' : '#e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: isDarkMode ? '#2a1010' : '#d5d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.08)' }}>
                        {avatar
                            ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '2rem', fontWeight: 800, color: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }}>{initials}</span>
                        }
                    </div>
                </div>
            )}
            <ConnBadge state={connState} />
            <div style={{ position: 'absolute', bottom: '0.9rem', left: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.65rem', padding: '0.35rem 0.7rem', color: '#fff' }}>
                {avatar && <img src={avatar} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{name || 'Anonymous'}</span>
            </div>
        </motion.div>
    );
};

const CtrlBtn = ({ onClick, children, danger, active, label, large, isDark, style: xs }) => {
    const normalBg = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
    const activeBg = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';
    const normalColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.70)';
    const activeColor = isDark ? '#ffffff' : '#000000';

    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                width: large ? 72 : 52, height: 52,
                borderRadius: large ? '1.5rem' : '50%',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                background: danger ? '#e53e3e' : active ? activeBg : normalBg,
                color: danger ? '#fff' : active ? activeColor : normalColor,
                backdropFilter: 'blur(8px)',
                boxShadow: danger ? '0 4px 20px rgba(229,62,62,0.35)' : 'none',
                ...xs
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
            {children}
        </button>
    );
};

function gridStyle(count) {
    const base = { display: 'grid', gap: '1rem', width: '100%', height: '100%', alignContent: 'center', justifyContent: 'center' };
    if (count === 1) return { ...base, gridTemplateColumns: 'minmax(0, 900px)', gridTemplateRows: 'minmax(0, 560px)' };
    if (count === 2) return { ...base, gridTemplateColumns: 'repeat(2, minmax(0, 640px))', gridAutoRows: 'minmax(0, 420px)' };
    if (count <= 4) return { ...base, gridTemplateColumns: 'repeat(2, 1fr)' };
    return { ...base, gridTemplateColumns: 'repeat(3, 1fr)' };
}

const MeetingRoom = ({ roomId, onLeave, initialConfig, isDarkMode, setIsDarkMode }) => {
    const [micOn, setMicOn] = useState(initialConfig?.micOn ?? true);
    const [videoOn, setVideoOn] = useState(initialConfig?.videoOn ?? true);
    const [isSharing, setIsSharing] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [peers, setPeers] = useState([]);
    const [copied, setCopied] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    const [, forceTime] = useState(0);

    const localVideoRef = useRef();
    const socketRef = useRef();
    const streamRef = useRef();
    const screenTrackRef = useRef(null);
    const peersRef = useRef([]);
    const isMountedRef = useRef(false);
    const { user } = useUser();

    useEffect(() => {
        const id = setInterval(() => forceTime(t => t + 1), 30000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        window.history.replaceState({}, '', `?room=${roomId}`);
        initMedia();
        return () => {
            isMountedRef.current = false;
            peersRef.current.forEach(p => p.peer?.destroy());
            peersRef.current = [];
            mediaManager.unregister(streamRef.current);
            streamRef.current = null;
            screenTrackRef.current?.stop();
            socketRef.current?.disconnect();
        };
    }, []);

    const initMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (!isMountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
            streamRef.current = stream;
            mediaManager.registerStream(stream);
            stream.getAudioTracks().forEach(t => t.enabled = micOn);
            stream.getVideoTracks().forEach(t => t.enabled = videoOn);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            connectSocket(stream);
        } catch (err) {
            console.error('Media access error:', err);
        }
    };

    const connectSocket = (stream) => {
        const socket = io('http://localhost:5000', {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join-room', {
                roomId,
                userId: user?.id,
                userName: user?.fullName || user?.username || 'Anonymous',
                userAvatar: user?.imageUrl,
                isHost: true,
            });
        });

        socket.on('all-users', (users) => {
            const built = [];
            users.forEach(({ socketId, userName, userAvatar }) => {
                if (peersRef.current.find(p => p.socketId === socketId)) return;
                const peer = buildPeer({ initiator: true, stream, targetSocket: socketId, socket });
                const obj = { socketId, userName, userAvatar, peer };
                peersRef.current.push(obj);
                built.push(obj);
            });
            if (built.length) {
                setPeers(prev => {
                    const ex = prev.map(p => p.socketId);
                    return [...prev, ...built.filter(b => !ex.includes(b.socketId))];
                });
            }
        });

        socket.on('user-joined', ({ signal, callerId, userName, userAvatar }) => {
            if (peersRef.current.find(p => p.socketId === callerId)) return;
            const peer = buildPeer({ initiator: false, stream, targetSocket: callerId, socket, incomingSignal: signal });
            const obj = { socketId: callerId, userName, userAvatar, peer };
            peersRef.current.push(obj);
            setPeers(prev => prev.find(p => p.socketId === callerId) ? prev : [...prev, obj]);
        });

        socket.on('receiving-returned-signal', ({ id, signal, userName, userAvatar }) => {
            const item = peersRef.current.find(p => p.socketId === id);
            if (item) {
                item.peer.signal(signal);
                item.userName = userName;
                item.userAvatar = userAvatar;
                setPeers(prev => prev.map(p => p.socketId === id ? { ...p, userName, userAvatar } : p));
            }
        });

        socket.on('ice-candidate', ({ from, candidate }) => {
            const item = peersRef.current.find(p => p.socketId === from);
            if (item?.peer) { try { item.peer.signal({ candidate }); } catch (_) { } }
        });

        socket.on('user-left', (socketId) => {
            peersRef.current.find(p => p.socketId === socketId)?.peer?.destroy();
            peersRef.current = peersRef.current.filter(p => p.socketId !== socketId);
            setPeers(prev => prev.filter(p => p.socketId !== socketId));
        });
    };

    const buildPeer = useCallback(({ initiator, stream, targetSocket, socket, incomingSignal }) => {
        const peer = new Peer({
            initiator,
            trickle: true,
            stream,
            config: ICE_SERVERS,
            sdpTransform: (sdp) => sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000'),
        });

        peer.on('signal', (signal) => {
            if (initiator) {
                socket.emit('sending-signal', { userToSignal: targetSocket, callerId: socket.id, signal, userName: user?.fullName || 'Anonymous', userAvatar: user?.imageUrl });
            } else {
                socket.emit('returning-signal', { callerId: targetSocket, signal });
            }
        });

        peer.on('error', (err) => console.error(`Peer [${targetSocket}]:`, err.message));

        if (!initiator && incomingSignal) peer.signal(incomingSignal);

        return peer;
    }, [user]);

    const handleHangup = () => {
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
    };

    const toggleVideo = async () => {
        const next = !videoOn;
        setVideoOn(next);
        if (!next) {
            streamRef.current?.getVideoTracks().forEach(t => { t.stop(); t.enabled = false; });
        } else {
            try {
                const ns = await navigator.mediaDevices.getUserMedia({ video: true });
                const newT = ns.getVideoTracks()[0];
                const base = streamRef.current;
                if (base) {
                    base.getVideoTracks().forEach(t => { t.stop(); base.removeTrack(t); });
                    base.addTrack(newT);
                    if (localVideoRef.current) localVideoRef.current.srcObject = base;
                    peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(newT));
                }
            } catch (err) { setVideoOn(false); }
        }
    };

    const revertToCamera = async () => {
        setIsSharing(false);
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        try {
            const cs = await navigator.mediaDevices.getUserMedia({ video: true });
            const camT = cs.getVideoTracks()[0];
            const base = streamRef.current;
            if (base) {
                base.getVideoTracks().forEach(t => { t.stop(); base.removeTrack(t); });
                base.addTrack(camT);
                if (localVideoRef.current) localVideoRef.current.srcObject = base;
                peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(camT));
            }
            setVideoOn(true);
        } catch (e) { console.error('Camera restore failed:', e); }
    };

    const toggleScreenShare = async () => {
        if (isSharing) {
            await revertToCamera();
        } else {
            try {
                const ss = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: true });
                const scT = ss.getVideoTracks()[0];
                screenTrackRef.current = scT;
                setIsSharing(true);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = new MediaStream([scT, ...(streamRef.current?.getAudioTracks() ?? [])]);
                }
                peersRef.current.forEach(({ peer }) => peer._pc?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(scT));
                scT.addEventListener('ended', revertToCamera, { once: true });
            } catch (err) {
                if (err.name !== 'NotAllowedError') console.error('Screen share:', err);
            }
        }
    };

    const inviteUrl = `${window.location.origin}?room=${roomId}`;
    const copyRoomBadge = () => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const copyInviteLink = () => { navigator.clipboard.writeText(inviteUrl); setCopiedInvite(true); setTimeout(() => setCopiedInvite(false), 2500); };

    const bg = isDarkMode ? '#110608' : '#f0f0f5';
    const gridBg = isDarkMode ? '#0c0305' : '#e0e0e8';
    const barBg = isDarkMode ? 'rgba(12,3,5,0.9)' : 'rgba(255,255,255,0.92)';
    const barBord = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const textCol = isDarkMode ? '#ffffff' : '#0a0a0a';
    const mutedCol = isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
    const totalCount = peers.length + 1;

    const myInitials = user?.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'ME';

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg, fontFamily: "'Inter','Montserrat',sans-serif", overflow: 'hidden', transition: 'background 0.4s' }}>

            <header style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.75rem', background: barBg, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${barBord}`, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <VideoIcon size={20} color="#e53e3e" strokeWidth={2.5} />
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.5px', color: textCol }}>smartMeet</span>
                </div>

                <button onClick={copyRoomBadge} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', borderRadius: '99px', cursor: 'pointer', border: `1px solid ${barBord}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: mutedCol, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.8px', fontFamily: 'monospace' }}>
                    <Shield size={13} />
                    {roomId.toUpperCase()}
                    {copied ? <Check size={13} color="#48bb78" /> : <Copy size={13} />}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', borderRadius: '8px', border: `1px solid ${barBord}`, background: 'transparent', color: textCol, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                        <UserPlus size={15} /><span>Invite</span>
                    </button>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${barBord}`, background: 'transparent', color: textCol, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: mutedCol, fontSize: '0.85rem', fontWeight: 600 }}>
                        <Users size={16} /><span>{totalCount}</span>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: gridBg, padding: '1.25rem', overflow: 'hidden', transition: 'background 0.4s' }}>
                <div style={gridStyle(totalCount)}>
                    <motion.div layout style={tileBase}>
                        <video playsInline muted autoPlay ref={localVideoRef} style={{ ...videoFill, transform: isSharing ? 'none' : 'rotateY(180deg)' }} />
                        <div style={gradientOverlay} />
                        {!videoOn && !isSharing && (
                            <div style={{ position: 'absolute', inset: 0, background: isDarkMode ? '#1a0808' : '#e0e0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: isDarkMode ? '#2a1010' : '#cccccc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.08)' }}>
                                    {user?.imageUrl
                                        ? <img src={user.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ fontSize: '2rem', fontWeight: 800, color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)' }}>{myInitials}</span>
                                    }
                                </div>
                            </div>
                        )}
                        {isSharing && (
                            <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', background: 'rgba(66,153,225,0.8)', backdropFilter: 'blur(8px)', color: '#fff', borderRadius: '99px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <ScreenShare size={11} /> Sharing screen
                            </div>
                        )}
                        <div style={{ position: 'absolute', bottom: '0.9rem', left: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.65rem', padding: '0.35rem 0.7rem', color: '#fff' }}>
                            {user?.imageUrl && <img src={user.imageUrl} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />}
                            <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>You</span>
                            {!micOn && <MicOff size={11} color="#fc8181" />}
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {peers.map(p => (
                            <RemoteTile key={p.socketId} peer={p.peer} name={p.userName} avatar={p.userAvatar} isDarkMode={isDarkMode} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div style={{ flexShrink: 0, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5rem', background: barBg, backdropFilter: 'blur(24px)', borderTop: `1px solid ${barBord}` }}>
                <div style={{ width: 120, color: mutedCol, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <CtrlBtn onClick={toggleMic} label={micOn ? 'Mute' : 'Unmute'} active={micOn} danger={!micOn} isDark={isDarkMode}>
                        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </CtrlBtn>
                    <CtrlBtn onClick={toggleVideo} label={videoOn ? 'Stop Camera' : 'Start Camera'} active={videoOn} danger={!videoOn} isDark={isDarkMode}>
                        {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                    </CtrlBtn>

                    <div style={{ width: 1, height: 28, background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)', margin: '0 0.2rem' }} />

                    <CtrlBtn onClick={toggleScreenShare} label={isSharing ? 'Stop Sharing' : 'Share Screen'} isDark={isDarkMode}
                        style={isSharing ? { background: 'rgba(66,153,225,0.22)', color: '#63b3ed', border: '1px solid rgba(66,153,225,0.4)' } : {}}
                    >
                        {isSharing ? <ScreenShareOff size={19} /> : <ScreenShare size={19} />}
                    </CtrlBtn>
                    <CtrlBtn label="Raise Hand" isDark={isDarkMode}><Hand size={19} /></CtrlBtn>
                    <CtrlBtn label="Chat" isDark={isDarkMode}><MessageSquare size={19} /></CtrlBtn>

                    <div style={{ width: 1, height: 28, background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)', margin: '0 0.2rem' }} />

                    <CtrlBtn onClick={handleHangup} label="Leave" danger large isDark={isDarkMode}>
                        <PhoneOff size={20} />
                    </CtrlBtn>
                </div>

                <div style={{ width: 120, display: 'flex', justifyContent: 'flex-end' }}>
                    <CtrlBtn label="Settings" isDark={isDarkMode}><Settings size={19} /></CtrlBtn>
                </div>
            </div>

            <AnimatePresence>
                {showInvite && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowInvite(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 16 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} onClick={e => e.stopPropagation()} style={{ background: isDarkMode ? '#1a0608' : '#ffffff', border: `1px solid ${barBord}`, borderRadius: '1.5rem', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: '0 32px 64px rgba(0,0,0,0.55)', color: textCol }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Invite people</h2>
                                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: mutedCol }}>Share this link or room code with your team</p>
                                </div>
                                <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', color: mutedCol, textTransform: 'uppercase', display: 'block', marginBottom: '0.45rem' }}>Room Code</label>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${barBord}`, borderRadius: '0.75rem', padding: '0.85rem 1.25rem' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.5rem', color: textCol }}>{roomId.toUpperCase()}</span>
                                    <Shield size={18} color={mutedCol} />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', color: mutedCol, textTransform: 'uppercase', display: 'block', marginBottom: '0.45rem' }}>Invite Link</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f7', border: `1px solid ${barBord}`, borderRadius: '0.75rem', padding: '0.65rem 1rem' }}>
                                    <Link2 size={15} color={mutedCol} style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.78rem', color: mutedCol, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{inviteUrl}</span>
                                </div>
                            </div>

                            <button onClick={copyInviteLink} style={{ width: '100%', padding: '0.85rem', border: 'none', borderRadius: '0.85rem', background: copiedInvite ? '#276749' : '#e53e3e', color: '#fff', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background 0.2s' }}>
                                {copiedInvite ? <><Check size={17} /> Copied!</> : <><Copy size={17} /> Copy Invite Link</>}
                            </button>
                            <p style={{ margin: '0.85rem 0 0', fontSize: '0.73rem', color: mutedCol, textAlign: 'center' }}>Guests will see the camera preview before joining.</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MeetingRoom;
