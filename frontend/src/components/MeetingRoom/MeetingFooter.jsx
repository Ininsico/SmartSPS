import React from 'react';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
    Hand, Circle, MessageSquare, PhoneOff
} from 'lucide-react';
import { cn } from '../../utils';

const MeetingFooter = ({
    micOn,
    toggleMic,
    videoOn,
    toggleVideo,
    isSharing,
    toggleShare,
    handRaised,
    toggleHand,
    isRecording,
    startRecording,
    stopRecording,
    setShowReacts,
    panel,
    setPanel,
    messages,
    unread,
    setUnread,
    handleLeave,
    isDark
}) => {
    const D = isDark;

    return (
        <footer className={cn(
            "h-20 flex items-center justify-center gap-2 sm:gap-3 z-50 transition-all shrink-0",
            D ? "bg-premium-surface/90 border-t border-white/5" : "bg-white/90 border-t border-gray-200"
        )}>
            <div className="flex items-center gap-2 sm:gap-3 h-full px-4">
                <button
                    onClick={toggleMic}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        micOn ? (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900") : "bg-black text-white shadow-lg"
                    )}
                >
                    {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        videoOn ? (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900") : "bg-black text-white shadow-lg"
                    )}
                >
                    {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                </button>

                <button
                    onClick={toggleShare}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        isSharing ? "bg-premium-accent text-white shadow-lg shadow-premium-accent/20" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                    )}
                >
                    <ScreenShare size={20} />
                </button>

                <button
                    onClick={toggleHand}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        handRaised ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                    )}
                >
                    <Hand size={20} />
                </button>

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        isRecording ? "bg-black text-white shadow-lg shadow-black/20" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                    )}
                >
                    <Circle
                        size={20}
                        fill={isRecording ? 'currentColor' : 'none'}
                        className={isRecording ? 'animate-pulse' : ''}
                    />
                </button>

                <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />

                <button
                    onClick={() => setShowReacts(true)}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    )}
                >
                    <span className="text-xl leading-none">😊</span>
                </button>

                <button
                    onClick={() => { setPanel(panel === 'chat' ? null : 'chat'); setUnread(0); }}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer relative",
                        panel === 'chat' ? "bg-premium-accent text-white" : (D ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900")
                    )}
                >
                    <MessageSquare size={20} />
                    {unread > 0 && panel !== 'chat' && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-premium-surface shadow">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>

                <button
                    onClick={handleLeave}
                    className="h-11 px-6 rounded-xl bg-black hover:bg-black/90 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 border-none cursor-pointer flex items-center gap-2"
                >
                    <PhoneOff size={16} />
                    Leave Room
                </button>
            </div>
        </footer>
    );
};

export default MeetingFooter;
