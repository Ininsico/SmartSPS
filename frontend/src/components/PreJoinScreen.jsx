import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Play } from 'lucide-react';
import PremiumButton from '../PremiumButton';
import { motion } from 'framer-motion';
import { mediaManager } from '../mediaManager';

const PreJoinScreen = ({ roomId, onJoin, onBack, isDarkMode }) => {
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const streamRef = useRef(null);
    const videoRef = useRef();
    const darkMaroon = '#1a0a0a';

    useEffect(() => {
        let isMounted = true;
        const startPreview = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                if (!isMounted) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = mediaStream;
                mediaManager.registerStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error('Error accessing media devices:', err);
            }
        };
        startPreview();
        return () => {
            isMounted = false;
            mediaManager.unregister(streamRef.current);
            streamRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (audioTrack) audioTrack.enabled = micOn;
            if (videoTrack) videoTrack.enabled = videoOn;
        }
    }, [micOn, videoOn]);

    const styles = {
        container: {
            height: '100vh',
            width: '100vw',
            backgroundColor: isDarkMode ? darkMaroon : '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDarkMode ? '#fff' : '#000',
            fontFamily: "'Montserrat', sans-serif"
        },
        previewCard: {
            width: '100%',
            maxWidth: '640px',
            aspectRatio: '16/9',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
            borderRadius: '24px',
            position: 'relative',
            overflow: 'hidden',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        },
        video: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'rotateY(180deg)'
        },
        overlay: {
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '1rem',
            zIndex: 10
        },
        controlBtn: {
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease'
        },
        offBtn: {
            backgroundColor: '#ff4d4d',
            color: '#fff'
        },
        infoSection: {
            marginTop: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            alignItems: 'center'
        },
        title: {
            fontSize: '1.75rem',
            fontWeight: '800',
            letterSpacing: '-1px'
        }
    };

    const handleJoin = () => {
        mediaManager.unregister(streamRef.current);
        streamRef.current = null;
        onJoin({ micOn, videoOn });
    };

    return (
        <div style={styles.container}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
                <div style={styles.previewCard}>
                    <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
                    {!videoOn && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <VideoOff size={32} color="#555" />
                            </div>
                        </div>
                    )}
                    <div style={styles.overlay}>
                        <button
                            style={{ ...styles.controlBtn, ...(!micOn ? styles.offBtn : {}) }}
                            onClick={() => setMicOn(!micOn)}
                        >
                            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button
                            style={{ ...styles.controlBtn, ...(!videoOn ? styles.offBtn : {}) }}
                            onClick={() => setVideoOn(!videoOn)}
                        >
                            {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                        </button>
                    </div>
                </div>
                <div style={styles.infoSection}>
                    <h2 style={styles.title}>Ready to join?</h2>
                    <p style={{ color: isDarkMode ? '#888' : '#666', fontWeight: 500 }}>Room: <span style={{ color: isDarkMode ? '#fff' : '#000', fontWeight: 700 }}>{roomId}</span></p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={onBack}
                            style={{ padding: '0 2rem', height: '52px', borderRadius: '99px', border: `1px solid ${isDarkMode ? '#333' : '#eee'}`, backgroundColor: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Go back
                        </button>
                        <PremiumButton
                            icon={Play}
                            onClick={handleJoin}
                            style={{ padding: '0 2.5rem', height: '52px' }}
                        >
                            Join meeting
                        </PremiumButton>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PreJoinScreen;
