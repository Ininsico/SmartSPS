import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MicOff } from 'lucide-react';
import { cn } from '../../utils';

export const RemoteVideoPlayer = ({ videoTrack, audioTrack }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoTrack && videoRef.current) videoTrack.play(videoRef.current);
    }, [videoTrack]);
    useEffect(() => {
        if (audioTrack) audioTrack.play();
    }, [audioTrack]);
    return <div key={videoTrack?._ID || 'no-track'} ref={videoRef} className="w-full h-full object-cover block" />;
};

export const ScreenSharePlayer = ({ track }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (track && ref.current) track.play(ref.current);
    }, [track]);
    return <div ref={ref} className="w-full h-full bg-black" />;
};

const UserTile = ({
    user,
    isDark,
    isYou = false,
    peerState,
    small = false,
    activeSpeaker = false,
    isHost = false,
    onForceMute,
    onForceUnmute
}) => {
    const initials = user.userName
        ? user.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '?';
    const isMuted = peerState?.muted ?? false;
    const handUp = peerState?.handRaised ?? false;
    const isRemoteAdminMuted = peerState?.adminMuted ?? false;
    const videoRef = useRef(null);

    useEffect(() => {
        if (isYou && user.videoTrack && videoRef.current) {
            user.videoTrack.play(videoRef.current);
        }
    }, [isYou, user.videoTrack]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "relative overflow-hidden bg-[#0a0a0a] transition-all duration-300 border flex items-center justify-center",
                small ? "h-full w-full rounded-xl" : "aspect-video w-full rounded-2xl",
                activeSpeaker ? "border-premium-accent shadow-[0_0_20px_rgba(129,138,248,0.4)] ring-2 ring-premium-accent/20" :
                    handUp ? "border-[#f6c90e] shadow-[0_0_15px_rgba(246,201,14,0.3)]" : "border-white/5 shadow-2xl"
            )}
        >
            {isYou ? (
                <div ref={videoRef} className="w-full h-full object-cover block" />
            ) : user.videoTrack ? (
                <RemoteVideoPlayer videoTrack={user.videoTrack} audioTrack={user.audioTrack} />
            ) : null}

            {/* Show avatar overlay only when there is truly no video to display */}
            {(isYou ? !user.videoOn : !user.videoTrack) && (
                <div className={cn(
                    "absolute inset-0 z-[1] flex items-center justify-center transition-colors duration-500",
                    isDark ? "bg-[#140c0c]" : "bg-gray-200"
                )}>
                    <div className={cn(
                        "rounded-full overflow-hidden flex items-center justify-center border-[3px] border-white/10 transition-all duration-500 scale-100",
                        small ? "w-[42px] h-[42px]" : "w-20 h-20",
                        isDark ? "bg-[#2a1a1a]" : "bg-gray-300",
                        activeSpeaker && "ring-4 ring-premium-accent/30 scale-110"
                    )}>
                        {user.userAvatar ? <img src={user.userAvatar} alt="" className="w-full h-full object-cover" /> : <span className={cn("font-black tracking-tighter opacity-30 leading-none", small ? "text-sm" : "text-2xl")}>{initials}</span>}
                    </div>
                </div>
            )}

            {/* Host Controls */}
            {isHost && !isYou && (
                <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); isRemoteAdminMuted ? onForceUnmute() : onForceMute(); }}
                        className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-black/30 border-none cursor-pointer",
                            isRemoteAdminMuted ? "bg-gray-700 text-white" : "bg-black hover:bg-black/90 text-white"
                        )}
                    >
                        {isRemoteAdminMuted ? 'UNMUTE' : 'MUTE'}
                    </button>
                </div>
            )}

            {handUp && <div className="absolute top-2.5 left-2.5 text-xl z-10 filter drop-shadow-md">✋</div>}

            <div className={cn(
                "absolute z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-white font-bold transition-all",
                small ? "bottom-2 left-2 px-2 py-1 text-[10px]" : "bottom-3 left-3 px-3 py-1.5 text-xs"
            )}>
                {user.userAvatar && <img src={user.userAvatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />}
                <span className="truncate max-w-[100px]">{user.userName || (isYou ? 'You' : initials !== '?' ? initials : '···')}</span>
                {(isMuted || isRemoteAdminMuted) && <MicOff size={11} className={isRemoteAdminMuted ? "text-white" : "text-white/60"} />}
                {isRemoteAdminMuted && <span className="text-[9px] text-white font-extrabold tracking-widest">LOCKED</span>}
            </div>

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none z-0" />
        </motion.div>
    );
};

export default UserTile;
