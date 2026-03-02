import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
    MessageSquare, Users, Settings, PhoneOff,
    Hand, Shield, Grid, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser } from '@clerk/clerk-react';

const VideoTile = ({ peer, name, avatar, isDarkMode, isMe }) => {
    const ref = useRef();

    useEffect(() => {
        const handleStream = (stream) => {
            if (ref.current) ref.current.srcObject = stream;
        };
        peer?.on('stream', handleStream);
        return () => {
            peer?.off('stream', handleStream);
        };
    }, [peer]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`video-tile ${isDarkMode ? 'dark-tile' : ''}`}
        >
            <video
                playsInline
                autoPlay
                ref={ref}
                muted={isMe}
                className={`tile-video ${isMe ? 'mirrored' : ''}`}
            />

            <div className="tile-overlay">
                <div className="badge name-badge">
                    {avatar && <img src={avatar} alt="" className="avatar-small" />}
                    <span>{name || 'Anonymous'}</span>
                </div>
            </div>

            {(!peer && !isMe) && (
                <div className="placeholder-overlay">
                    <div className="avatar-large">
                        {avatar ? <img src={avatar} alt="" /> : (name?.charAt(0) || '?')}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const MeetingRoom = ({ roomId, onLeave, initialConfig, isDarkMode }) => {
    const [micOn, setMicOn] = useState(initialConfig?.micOn ?? true);
    const [videoOn, setVideoOn] = useState(initialConfig?.videoOn ?? true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [peers, setPeers] = useState([]);
    const localVideoRef = useRef();
    const socketRef = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();
    const { user } = useUser();

    const darkMaroon = '#1a0a0a';

    const stopTracks = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
    };

    useEffect(() => {
        setupWebRTC();
        return () => {
            stopTracks();
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleHangup = () => {
        stopTracks();
        onLeave();
    };

    const setupWebRTC = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;

            stream.getAudioTracks()[0].enabled = micOn;
            stream.getVideoTracks()[0].enabled = videoOn;

            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            socketRef.current = io('http://localhost:5000');

            socketRef.current.emit('join-room', {
                roomId,
                userId: user?.id,
                userName: user?.fullName || user?.username || 'Anonymous',
                userAvatar: user?.imageUrl,
                isHost: true
            });

            socketRef.current.on('all-users', users => {
                const newPeers = [];
                users.forEach(userId => {
                    const existing = peersRef.current.find(p => p.peerId === userId);
                    if (!existing) {
                        const peer = createPeer(userId, socketRef.current.id, stream);
                        const peerObj = { peerId: userId, peer, name: 'Joining...', avatar: null };
                        peersRef.current.push(peerObj);
                        newPeers.push(peerObj);
                    }
                });
                setPeers(newPeers);
            });

            socketRef.current.on('user-joined', payload => {
                const existing = peersRef.current.find(p => p.peerId === payload.callerId);
                if (!existing) {
                    const peer = addPeer(payload.signal, payload.callerId, stream);
                    const peerObj = {
                        peerId: payload.callerId,
                        peer,
                        name: payload.userName,
                        avatar: payload.userAvatar
                    };
                    peersRef.current.push(peerObj);
                    setPeers(prev => [...prev, peerObj]);
                }
            });

            socketRef.current.on('receiving-returned-signal', payload => {
                const item = peersRef.current.find(p => p.peerId === payload.id);
                if (item) {
                    item.peer.signal(payload.signal);
                    // Update metadata if it arrived later
                    setPeers(prev => prev.map(p =>
                        p.peerId === payload.id
                            ? { ...p, name: payload.userName, avatar: payload.userAvatar }
                            : p
                    ));
                }
            });

            socketRef.current.on('user-left', userId => {
                const peerObj = peersRef.current.find(p => p.peerId === userId);
                if (peerObj?.peer) peerObj.peer.destroy();
                const filteredPeers = peersRef.current.filter(p => p.peerId !== userId);
                peersRef.current = filteredPeers;
                setPeers(filteredPeers);
            });

        } catch (err) {
            console.error("WebRTC Error:", err);
        }
    };

    function createPeer(userToSignal, callerId, stream) {
        const peer = new Peer({ initiator: true, trickle: false, stream });
        peer.on('signal', signal => {
            socketRef.current.emit('sending-signal', {
                userToSignal,
                callerId,
                signal,
                userName: user?.fullName || 'Anonymous',
                userAvatar: user?.imageUrl
            });
        });
        return peer;
    }

    function addPeer(incomingSignal, callerId, stream) {
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on('signal', signal => {
            socketRef.current.emit('returning-signal', { signal, callerId });
        });
        peer.signal(incomingSignal);
        return peer;
    }

    const toggleMic = () => {
        setMicOn(!micOn);
        if (streamRef.current) {
            streamRef.current.getAudioTracks()[0].enabled = !micOn;
        }
    };

    const toggleVideo = () => {
        setVideoOn(!videoOn);
        if (streamRef.current) {
            streamRef.current.getVideoTracks()[0].enabled = !videoOn;
        }
    };

    return (
        <div className="meeting-container" style={{ background: isDarkMode ? darkMaroon : '#fff' }}>
            <div className="main-content">
                <header className="room-header" style={{
                    background: isDarkMode ? 'rgba(26, 10, 10, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                }}>
                    <div className="logo-section" style={{ color: isDarkMode ? '#fff' : '#000' }}>
                        <VideoIcon size={24} className="logo-icon" />
                        <span className="logo-text">smartMeet</span>
                    </div>

                    <div className="header-center">
                        <div className="room-badge" style={{
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f4f4f5',
                            color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#666'
                        }}>
                            <Shield size={14} />
                            <span>SECURE: {roomId.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="user-group">
                            <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                <Users size={20} />
                                {peers.length > 0 && <span className="count-dot">{peers.length + 1}</span>}
                            </button>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    </div>
                </header>

                <div className={`video-grid-container ${peers.length === 0 ? 'single' : peers.length === 1 ? 'duo' : 'multi'}`}>
                    <div className="video-grid">
                        {/* Your Tile */}
                        <motion.div layout className={`video-tile mine ${isDarkMode ? 'dark-tile' : ''}`}>
                            <video playsInline muted ref={localVideoRef} autoPlay className="local-video mirrored" />
                            {!videoOn && (
                                <div className="placeholder-overlay">
                                    <div className="avatar-large">
                                        {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : (user?.fullName?.charAt(0) || 'U')}
                                    </div>
                                </div>
                            )}
                            <div className="tile-overlay">
                                <div className="badge name-badge">
                                    <span>You</span>
                                    {!micOn && <MicOff size={12} />}
                                </div>
                            </div>
                        </motion.div>

                        {/* Remote Peer Tiles */}
                        {peers.map((p) => (
                            <VideoTile
                                key={p.peerId}
                                peer={p.peer}
                                isDarkMode={isDarkMode}
                                name={p.name}
                                avatar={p.avatar}
                            />
                        ))}
                    </div>
                </div>

                <footer className="control-bar-wrapper">
                    <div className="control-bar" style={{
                        backgroundColor: isDarkMode ? 'rgba(20, 20, 20, 0.8)' : '#fff',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'
                    }}>
                        <div className="bar-section left">
                            <div className="time-display">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        <div className="bar-section center">
                            <button
                                className={`control-btn ${!micOn ? 'off' : ''}`}
                                onClick={toggleMic}
                                style={isDarkMode && micOn ? { background: '#222' } : {}}
                            >
                                {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                            </button>
                            <button
                                className={`control-btn ${!videoOn ? 'off' : ''}`}
                                onClick={toggleVideo}
                                style={isDarkMode && videoOn ? { background: '#222' } : {}}
                            >
                                {videoOn ? <VideoIcon size={22} /> : <VideoOff size={22} />}
                            </button>

                            <div className="divider" />

                            <button className="control-btn" title="Screen Share"><ScreenShare size={20} /></button>
                            <button className="control-btn" title="Raise Hand"><Hand size={20} /></button>
                            <button className="control-btn" title="Layout"><Grid size={20} /></button>

                            <button className="control-btn hangup" onClick={handleHangup}>
                                <PhoneOff size={22} />
                            </button>
                        </div>

                        <div className="bar-section right">
                            <button className="icon-btn"><MessageSquare size={20} /></button>
                            <button className="icon-btn"><Settings size={20} /></button>
                        </div>
                    </div>
                </footer>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .meeting-container { height: 100vh; display: flex; overflow: hidden; font-family: 'Inter', sans-serif; }
        .main-content { flex: 1; display: flex; flex-direction: column; position: relative; }
        
        .room-header { padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center; position: absolute; top: 0; left: 0; right: 0; z-index: 50; backdrop-filter: blur(20px); border-bottom: 1px solid; }
        .logo-section { display: flex; alignItems: center; gap: 0.75rem; }
        .logo-text { font-weight: 800; font-size: 1.1rem; letter-spacing: -0.5px; }
        .logo-icon { color: #ff3366; }
        
        .room-badge { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 1rem; border-radius: 99px; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.5px; }
        .header-right { display: flex; align-items: center; }
        .user-group { display: flex; align-items: center; gap: 1rem; }
        .count-dot { position: absolute; top: -2px; right: -2px; background: #ff3366; color: white; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid #1a0a0a; }

        .video-grid-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 6rem 2rem 8rem; }
        .video-grid { display: grid; width: 100%; height: 100%; gap: 1.5rem; }
        
        .video-grid-container.single .video-grid { grid-template-columns: 1fr; max-width: 900px; max-height: 600px; }
        .video-grid-container.duo .video-grid { grid-template-columns: 1fr 1fr; max-width: 1200px; }
        .video-grid-container.multi .video-grid { grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); }

        .video-tile { aspect-ratio: 16/9; border-radius: 1.5rem; position: relative; overflow: hidden; background: #222; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .dark-tile { background: #0a0a0a; border-color: rgba(255,255,255,0.1); }
        .tile-video { width: 100%; height: 100%; object-fit: cover; }
        .mirrored { transform: rotateY(180deg); }
        
        .tile-overlay { position: absolute; inset: 0; padding: 1.25rem; display: flex; flex-direction: column; justify-content: flex-end; pointer-events: none; }
        .badge { background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); color: white; padding: 0.5rem 0.85rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); }
        .name-badge { width: fit-content; }
        .avatar-small { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
        
        .placeholder-overlay { position: absolute; inset: 0; background: #111; display: flex; align-items: center; justify-content: center; }
        .avatar-large { width: 100px; height: 100px; border-radius: 50%; background: #222; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; color: #555; overflow: hidden; border: 4px solid rgba(255,255,255,0.05); }
        .avatar-large img { width: 100%; height: 100%; object-fit: cover; }

        .control-bar-wrapper { position: absolute; bottom: 0; left: 0; right: 0; padding-bottom: 2rem; display: flex; justify-content: center; z-index: 100; pointer-events: none; }
        .control-bar { pointer-events: auto; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 2rem; border-radius: 2rem; width: 90%; max-width: 900px; border: 1px solid; box-shadow: 0 40px 80px rgba(0,0,0,0.5); backdrop-filter: blur(30px); }
        .bar-section { display: flex; align-items: center; gap: 0.75rem; }
        .center { gap: 1rem; }
        .divider { width: 1px; height: 24px; background: rgba(255,255,255,0.1); margin: 0 0.5rem; }
        .time-display { font-weight: 700; font-size: 0.9rem; color: #888; letter-spacing: 0.5px; }

        .control-btn { width: 50px; height: 50px; border-radius: 50%; border: none; background: #f4f4f5; color: #1a0a0a; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .control-btn:hover { transform: scale(1.1); }
        .control-btn.off { background: #ff3b30 !important; color: white !important; }
        .control-btn.hangup { background: #ff3b30; color: white; width: 70px; border-radius: 1.5rem; }
        .control-btn.hangup:hover { background: #ff453a; width: 80px; }
        
        .icon-btn { background: transparent; border: none; color: inherit; cursor: pointer; position: relative; padding: 0.5rem; border-radius: 0.75rem; transition: all 0.2s; }
        .icon-btn:hover { background: rgba(255,255,255,0.05); }
      `}} />
        </div>
    );
};

export default MeetingRoom;
