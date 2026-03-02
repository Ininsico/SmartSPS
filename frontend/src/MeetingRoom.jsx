import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Users, Settings, PhoneOff,
    Hand, Shield, Grid, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VideoTile = ({ peer, name }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', (stream) => {
            ref.current.srcObject = stream;
        });
    }, [peer]);

    return (
        <motion.div layout className="video-tile glass-morphism">
            <video playsInline autoPlay ref={ref} className="remote-video" />
            <div className="tile-info">
                <span>{name}</span>
            </div>
        </motion.div>
    );
};

const MeetingRoom = ({ roomId, onLeave }) => {
    const [peers, setPeers] = useState([]);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const streamRef = useRef();

    useEffect(() => {
        socketRef.current = io.connect('http://localhost:5000');

        // Get Local Stream
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            streamRef.current = stream;
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }

            // Join Room
            socketRef.current.emit('join-room', { roomId, userId: socketRef.current.id });

            // Receive existing users in the room
            socketRef.current.on('all-users', (users) => {
                const peersArr = [];
                users.forEach((userId) => {
                    const peer = createPeer(userId, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerId: userId,
                        peer,
                    });
                    peersArr.push({
                        peerId: userId,
                        peer,
                    });
                });
                setPeers(peersArr);
            });

            // Handle a new user joining
            socketRef.current.on('user-joined', (payload) => {
                const peer = addPeer(payload.signal, payload.callerId, stream);
                peersRef.current.push({
                    peerId: payload.callerId,
                    peer,
                });

                setPeers((prev) => [...prev, { peerId: payload.callerId, peer }]);
            });

            // Handle signal back from existing user
            socketRef.current.on('receiving-returned-signal', (payload) => {
                const item = peersRef.current.find((p) => p.peerId === payload.id);
                item.peer.signal(payload.signal);
            });

            // Handle user leaving
            socketRef.current.on('user-left', (id) => {
                const peerObj = peersRef.current.find((p) => p.peerId === id);
                if (peerObj) {
                    peerObj.peer.destroy();
                }
                const filteredPeers = peersRef.current.filter((p) => p.peerId !== id);
                peersRef.current = filteredPeers;
                setPeers(filteredPeers);
            });
        });

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            socketRef.current.disconnect();
        };
    }, []);

    // WebRTC Handshake logic
    function createPeer(userToSignal, callerId, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socketRef.current.emit('sending-signal', { userToSignal, callerId, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerId, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socketRef.current.emit('returning-signal', { signal, callerId });
        });

        peer.signal(incomingSignal);
        return peer;
    }

    // UI Handlers
    const toggleMic = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setMicOn(audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoOn(videoTrack.enabled);
            }
        }
    };

    return (
        <div className="meeting-container">
            <div className="main-content">
                <header className="room-header">
                    <div className="room-info">
                        <span className="room-badge">{roomId}</span>
                    </div>
                    <div className="header-actions">
                        <button className="icon-btn"><Shield size={18} /></button>
                        <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Users size={18} />
                        </button>
                    </div>
                </header>

                <div className="video-grid">
                    {/* Your Local Video */}
                    <motion.div layout className="video-tile glass-morphism mine">
                        <video playsInline muted ref={userVideo} autoPlay className="local-video" />
                        <div className="tile-info">
                            <span>You</span>
                            {!micOn && <MicOff size={14} className="muted-icon" />}
                            {!videoOn && <VideoOff size={14} className="muted-icon" />}
                        </div>
                    </motion.div>

                    {/* Remote Peers */}
                    {peers.map((peerObj) => (
                        <VideoTile
                            key={peerObj.peerId}
                            peer={peerObj.peer}
                            name={`Participant ${peerObj.peerId.slice(0, 4)}`}
                        />
                    ))}
                </div>

                <footer className="control-bar-wrapper">
                    <div className="control-bar glass-morphism">
                        <div className="left-controls">
                            <div className="time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>

                        <div className="center-controls">
                            <button
                                className={`control-btn ${!micOn ? 'off' : ''}`}
                                onClick={toggleMic}
                            >
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>

                            <button
                                className={`control-btn ${!videoOn ? 'off' : ''}`}
                                onClick={toggleVideo}
                            >
                                {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                            </button>

                            <button className="control-btn"><Hand size={20} /></button>
                            <button className="control-btn"><ScreenShare size={20} /></button>
                            <button className="control-btn"><Grid size={20} /></button>
                            <button className="control-btn"><MoreVertical size={20} /></button>

                            <button className="control-btn hangup" onClick={onLeave}>
                                <PhoneOff size={20} />
                            </button>
                        </div>

                        <div className="right-controls">
                            <button className="icon-btn"><MessageSquare size={20} /></button>
                            <button className="icon-btn"><Settings size={20} /></button>
                        </div>
                    </div>
                </footer>
            </div>

            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        className="room-sidebar glass-morphism"
                        initial={{ x: 350 }}
                        animate={{ x: 0 }}
                        exit={{ x: 350 }}
                        transition={{ type: 'spring', damping: 20 }}
                    >
                        <div className="sidebar-header">
                            <h3>Participants</h3>
                            <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
                        </div>
                        <div className="sidebar-content">
                            <div className="participant-item">
                                <div className="p-avatar">Y</div>
                                <div className="p-name">You (Host)</div>
                                <Mic size={16} />
                            </div>
                            {peers.map(p => (
                                <div key={p.peerId} className="participant-item">
                                    <div className="p-avatar">P</div>
                                    <div className="p-name">User {p.peerId.slice(0, 4)}</div>
                                    <Mic size={16} />
                                </div>
                            ))}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
        .meeting-container {
          height: 100vh;
          display: flex;
          overflow: hidden;
          background: #000000;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .room-header {
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
        }

        .room-badge {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.4rem 1rem;
          border-radius: 2rem;
          font-family: monospace;
          font-weight: 600;
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-glass);
        }

        .video-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1rem;
          padding: 5rem 2rem 7rem;
          background: #000;
        }

        .video-tile {
          aspect-ratio: 16/9;
          border-radius: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: var(--transition-smooth);
          background: #0a0a0a;
          border: 1px solid var(--border-glass);
        }

        .local-video, .remote-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: rotateY(180deg);
        }

        .tile-info {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.7);
          padding: 0.4rem 0.8rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(8px);
          border: 1px solid var(--border-glass);
          color: white;
          font-weight: 500;
        }

        .control-bar-wrapper {
          position: absolute;
          bottom: 1.5rem;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 0 2rem;
        }

        .control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 2rem;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 900px;
        }

        .center-controls {
          display: flex;
          gap: 1rem;
        }

        .control-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
          border: 1px solid var(--border-glass);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .control-btn.off {
          background: #ffffff;
          color: #000000;
        }

        .control-btn.hangup {
          background: #ffffff;
          color: #000000;
          width: 60px;
          border-radius: 1.25rem;
        }

        .control-btn.hangup:hover {
          background: #e5e5e5;
        }

        .room-sidebar {
          width: 350px;
          height: 100vh;
          border-left: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-glass);
        }

        .sidebar-content {
          flex: 1;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .participant-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
        }

        .p-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #000;
        }

        .p-name {
          flex: 1;
          font-weight: 500;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }
      `}} />
        </div>
    );
};

export default MeetingRoom;
