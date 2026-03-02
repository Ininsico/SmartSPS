import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Users, Settings, PhoneOff,
    Hand, Shield, Grid, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserButton, useUser } from '@clerk/clerk-react';

const VideoTile = ({ peer, name, isDarkMode }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', (stream) => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <motion.div layout className={`video-tile ${isDarkMode ? 'dark-tile' : ''}`}>
            <video playsInline autoPlay ref={ref} className="remote-video" />
            <div className="tile-info">
                <span>{name}</span>
            </div>
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

            // Apply initial states
            stream.getAudioTracks()[0].enabled = micOn;
            stream.getVideoTracks()[0].enabled = videoOn;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            socketRef.current = io('http://localhost:5000');

            socketRef.current.emit('join-room', {
                roomId,
                userId: user?.id,
                userName: user?.fullName || 'Anonymous',
                userAvatar: user?.imageUrl,
                isHost: true
            });

            socketRef.current.on('all-users', users => {
                const peers = [];
                users.forEach(userId => {
                    const peer = createPeer(userId, socketRef.current.id, stream);
                    peersRef.current.push({ peerId: userId, peer });
                    peers.push({ peerId: userId, peer });
                });
                setPeers(peers);
            });

            socketRef.current.on('user-joined', payload => {
                const peer = addPeer(payload.signal, payload.callerId, stream);
                peersRef.current.push({ peerId: payload.callerId, peer });
                setPeers(prev => [...prev, { peerId: payload.callerId, peer }]);
            });

            socketRef.current.on('receiving-returned-signal', payload => {
                const item = peersRef.current.find(p => p.peerId === payload.id);
                if (item) item.peer.signal(payload.signal);
            });

            socketRef.current.on('user-left', userId => {
                const peerObj = peersRef.current.find(p => p.peerId === userId);
                if (peerObj) peerObj.peer.destroy();
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
            socketRef.current.emit('sending-signal', { userToSignal, callerId, signal });
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
                <header className="room-header" style={{ background: isDarkMode ? 'rgba(26, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)', borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <div className="logo-section" style={{ color: isDarkMode ? '#fff' : '#000' }}>
                        <VideoIcon size={24} />
                        <span style={{ fontWeight: 800 }}>smartMeet</span>
                    </div>
                    <div className="header-center">
                        <div className="room-badge" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f4f4f5', color: isDarkMode ? '#fff' : '#000' }}>
                            ROOM: {roomId.toUpperCase()}
                        </div>
                    </div>
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <UserButton afterSignOutUrl="/" />
                        <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: isDarkMode ? '#fff' : '#000' }}>
                            <Users size={20} />
                        </button>
                    </div>
                </header>

                <div className="video-grid" style={{ background: isDarkMode ? darkMaroon : '#fafafa' }}>
                    <motion.div layout className={`video-tile mine ${isDarkMode ? 'dark-tile' : ''}`}>
                        <video playsInline muted ref={localVideoRef} autoPlay className="local-video" />
                        <div className="tile-info" style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)', color: isDarkMode ? '#fff' : '#000' }}>
                            <span>You</span>
                            {!micOn && <MicOff size={14} className="muted-icon" />}
                            {!videoOn && <VideoOff size={14} className="muted-icon" />}
                        </div>
                    </motion.div>

                    {peers.map((peerObj) => (
                        <VideoTile
                            key={peerObj.peerId}
                            peer={peerObj.peer}
                            isDarkMode={isDarkMode}
                            name={`Participant ${peerObj.peerId.slice(0, 4)}`}
                        />
                    ))}
                </div>

                <footer className="control-bar-wrapper">
                    <div className="control-bar" style={{ backgroundColor: isDarkMode ? '#111' : '#fff', borderColor: isDarkMode ? '#222' : '#ddd' }}>
                        <div className="left-controls">
                            <div className="time" style={{ color: isDarkMode ? '#888' : '#000' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        <div className="center-controls">
                            <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic} style={isDarkMode && micOn ? { backgroundColor: '#222', color: '#fff' } : {}}>
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button className={`control-btn ${!videoOn ? 'off' : ''}`} onClick={toggleVideo} style={isDarkMode && videoOn ? { backgroundColor: '#222', color: '#fff' } : {}}>
                                {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                            </button>

                            <button className="control-btn" style={isDarkMode ? { backgroundColor: '#222', color: '#fff' } : {}}><Hand size={20} /></button>
                            <button className="control-btn" style={isDarkMode ? { backgroundColor: '#222', color: '#fff' } : {}}><ScreenShare size={20} /></button>
                            <button className="control-btn hangup" onClick={handleHangup}>
                                <PhoneOff size={20} />
                            </button>
                        </div>

                        <div className="right-controls">
                            <button className="icon-btn" style={{ color: isDarkMode ? '#fff' : '#000' }}><MessageSquare size={20} /></button>
                            <button className="icon-btn" style={{ color: isDarkMode ? '#fff' : '#000' }}><Settings size={20} /></button>
                        </div>
                    </div>
                </footer>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .meeting-container { height: 100vh; display: flex; overflow: hidden; }
        .main-content { flex: 1; display: flex; flex-direction: column; position: relative; }
        .room-header { padding: 1rem 3rem; display: flex; justify-content: space-between; align-items: center; position: absolute; top: 0; left: 0; right: 0; z-index: 10; backdrop-filter: blur(10px); border-bottom: 1px solid; }
        .room-badge { padding: 0.5rem 1.25rem; border-radius: 99px; font-weight: 700; letter-spacing: 0.5px; }
        .video-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; padding: 6.5rem 3rem 8rem; }
        .video-tile { aspect-ratio: 16/9; border-radius: 1.5rem; position: relative; overflow: hidden; background: #ffffff; border: 1px solid rgba(0,0,0,0.05); }
        .dark-tile { background: rgba(255,255,255,0.03) !important; border-color: rgba(255,255,255,0.1) !important; }
        .local-video, .remote-video { width: 100%; height: 100%; object-fit: cover; transform: rotateY(180deg); }
        .tile-info { position: absolute; bottom: 1.25rem; left: 1.25rem; padding: 0.5rem 1rem; border-radius: 0.75rem; display: flex; align-items: center; gap: 0.5rem; backdrop-filter: blur(10px); font-weight: 700; font-size: 0.9rem; }
        .control-bar-wrapper { position: absolute; bottom: 1.5rem; left: 0; right: 0; display: flex; justify-content: center; padding: 0 2rem; }
        .control-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 2.5rem; border-radius: 2rem; width: 100%; max-width: 800px; border: 1px solid; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); }
        .center-controls { display: flex; gap: 1rem; }
        .control-btn { width: 52px; height: 52px; border-radius: 50%; border: 1px solid #f0f0f0; background: #ffffff; color: #000000; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; }
        .control-btn.off { background: #ff4d4d !important; color: #ffffff !important; border: none; }
        .control-btn.hangup { background: #000000; color: #ffffff; width: 70px; border-radius: 1.5rem; border: none; }
        .control-btn.hangup:hover { background: #333; transform: scale(1.05); }
        .icon-btn { background: transparent; border: none; cursor: pointer; }
      `}} />
        </div>
    );
};

export default MeetingRoom;
