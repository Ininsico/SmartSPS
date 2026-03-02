import React, { useState } from 'react';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Users, Settings, PhoneOff,
    Hand, Shield, Grid, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MeetingRoom = ({ roomId, onLeave }) => {
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                    {/* Main User Video */}
                    <motion.div
                        layout
                        className="video-tile glass-morphism mine"
                    >
                        <div className="video-placeholder">
                            <div className="avatar-fallback">A</div>
                        </div>
                        <div className="tile-info">
                            <span>You</span>
                            {!micOn && <MicOff size={14} className="muted-icon" />}
                        </div>
                    </motion.div>

                    {/* Dummy Participants */}
                    {[1, 2, 3].map((p) => (
                        <motion.div
                            key={p}
                            layout
                            className="video-tile glass-morphism"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="video-placeholder" />
                            <div className="tile-info">
                                <span>Participant {p}</span>
                            </div>
                        </motion.div>
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
                                onClick={() => setMicOn(!micOn)}
                            >
                                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>

                            <button
                                className={`control-btn ${!videoOn ? 'off' : ''}`}
                                onClick={() => setVideoOn(!videoOn)}
                            >
                                {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                            </button>

                            <button className="control-btn"><Hand size={20} /></button>
                            <button className="control-btn"><ScreenShare size={20} /></button>
                            <button className="control-btn"><Grid size={20} /></button>
                            <button className="control-btn"><MoreVertical size={20} /></button>

                            <button
                                className="control-btn hangup"
                                onClick={onLeave}
                            >
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
                                <div className="p-avatar">A</div>
                                <div className="p-name">You (Host)</div>
                                <Mic size={16} />
                            </div>
                            {[1, 2, 3].map(p => (
                                <div key={p} className="participant-item">
                                    <div className="p-avatar">P</div>
                                    <div className="p-name">Participant {p}</div>
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
        }

        .video-tile {
          aspect-ratio: 16/9;
          border-radius: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: var(--transition-smooth);
        }

        .video-tile:hover {
          transform: scale(1.02);
        }

        .video-placeholder {
          width: 100%;
          height: 100%;
          background: #0a0a0a;
          border: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-fallback {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #ffffff;
          color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 700;
        }

        .tile-info {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.5);
          padding: 0.4rem 0.8rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(4px);
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
          background: rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .control-btn.off {
          background: #ffffff;
          color: #000000;
        }

        .control-btn.hangup {
          background: #ef4444;
          width: 60px;
          border-radius: 1.25rem;
        }

        .control-btn.hangup:hover {
          background: #dc2626;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 0.5rem;
        }

        .icon-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
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
        }

        .p-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
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
