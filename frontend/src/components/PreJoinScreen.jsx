import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Play, ArrowLeft } from 'lucide-react';
import PremiumButton from '../PremiumButton';
import { motion } from 'framer-motion';
import { mediaManager } from '../mediaManager';
import { cn } from '../utils';

const PreJoinScreen = ({ roomId, onJoin, onBack, isDarkMode }) => {
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const streamRef = useRef(null);
    const videoRef = useRef();

    useEffect(() => {
        let isMounted = true;
        const startPreview = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
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

    const handleJoin = () => {
        mediaManager.unregister(streamRef.current);
        streamRef.current = null;
        onJoin({ micOn, videoOn });
    };

    const D = isDarkMode;

    return (
        <div className={cn(
            "min-h-screen flex flex-col items-center justify-center p-6 sm:p-12 transition-colors duration-500",
            D ? "bg-premium-bg text-white" : "bg-white text-black"
        )}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl flex flex-col items-center gap-12"
            >
                {/* Header Section */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Ready to join?</h1>
                    <p className={cn(
                        "text-lg font-bold tracking-tight",
                        D ? "opacity-40" : "text-gray-500"
                    )}>
                        Meeting Code: <span className="text-premium-accent">{roomId.toUpperCase()}</span>
                    </p>
                </div>

                {/* Preview Card */}
                <div className={cn(
                    "w-full max-w-2xl aspect-video rounded-[32px] overflow-hidden relative shadow-2xl border-4 transition-all",
                    D ? "bg-premium-surface border-white/5" : "bg-gray-100 border-gray-100"
                )}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                            "w-full h-full object-cover transform rotate-Y-180 transition-opacity duration-500",
                            videoOn ? "opacity-100" : "opacity-0"
                        )}
                        style={{ transform: 'rotateY(180deg)' }}
                    />

                    {!videoOn && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-3xl">
                            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                                <VideoOff size={40} className="text-white/20" />
                            </div>
                        </div>
                    )}

                    {/* Quick Controls overlay */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10 px-6 py-4 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10">
                        <button
                            onClick={() => setMicOn(!micOn)}
                            className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 border-none cursor-pointer",
                                micOn
                                    ? "bg-white/10 text-white hover:bg-white/20"
                                    : "bg-premium-danger text-white shadow-lg shadow-premium-danger/40"
                            )}
                        >
                            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>
                        <button
                            onClick={() => setVideoOn(!videoOn)}
                            className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 border-none cursor-pointer",
                                videoOn
                                    ? "bg-white/10 text-white hover:bg-white/20"
                                    : "bg-premium-danger text-white shadow-lg shadow-premium-danger/40"
                            )}
                        >
                            {videoOn ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                        </button>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                    <button
                        onClick={onBack}
                        className={cn(
                            "h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer flex items-center gap-2",
                            D ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-black hover:bg-gray-200"
                        )}
                    >
                        <ArrowLeft size={16} /> Go Back
                    </button>

                    <PremiumButton
                        icon={Play}
                        onClick={handleJoin}
                        className="h-14 px-12 text-sm"
                    >
                        Join Session
                    </PremiumButton>
                </div>
            </motion.div>
        </div>
    );
};

export default PreJoinScreen;
