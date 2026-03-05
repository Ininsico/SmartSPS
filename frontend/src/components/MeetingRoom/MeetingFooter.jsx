import React from 'react';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare,
    Hand, Circle, MessageSquare, PhoneOff, Smile, Sparkles, MonitorPlay, Loader2, StickyNote
} from 'lucide-react';
import { cn } from '../../utils';

const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const MeetingFooter = ({
    micOn,
    toggleMic,
    videoOn,
    toggleVideo,
    isSharing,
    toggleShare,
    handRaised,
    toggleHand,
    // AI Audio-only recording
    isRecording,
    startRecording,
    stopRecording,
    // Screen+Audio dashboard recording
    isScreenRecording,
    startScreenRecording,
    stopScreenRecording,
    screenRecSeconds,
    screenUploading,
    setShowReacts,
    panel,
    setPanel,
    messages,
    unread,
    setUnread,
    handleLeave,
    isHost,
    onEnd,
    hasAiSummary,
    showTranscript,
    setShowTranscript
}) => {
    return (
        <footer className="h-auto min-h-[80px] flex flex-col items-center justify-center z-50 transition-all shrink-0 bg-white/90 border-t border-gray-200 py-2 gap-1.5">

            {/* Status bar for active recordings */}
            {(isRecording || isScreenRecording || screenUploading) && (
                <div className="flex items-center gap-4 px-4 py-1">
                    {isRecording && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            AI Rec
                        </div>
                    )}
                    {isScreenRecording && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Screen {fmtTime(screenRecSeconds || 0)}
                        </div>
                    )}
                    {screenUploading && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-500">
                            <Loader2 size={10} className="animate-spin" />
                            Saving recording…
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 sm:gap-3 h-full px-4">
                <button
                    onClick={toggleMic}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        micOn ? "bg-gray-100 hover:bg-gray-200 text-gray-900" : "bg-black text-white shadow-lg"
                    )}
                >
                    {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        videoOn ? "bg-gray-100 hover:bg-gray-200 text-gray-900" : "bg-black text-white shadow-lg"
                    )}
                >
                    {videoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                </button>

                <button
                    onClick={toggleShare}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        isSharing ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    )}
                >
                    <ScreenShare size={20} />
                </button>

                <button
                    onClick={toggleHand}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                        handRaised ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    )}
                >
                    <Hand size={20} />
                </button>

                {/* AI Audio Recording Button — feeds Gladia/Groq */}
                <div className="relative group">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        title="AI Audio Record — for meeting summary"
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            isRecording ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        )}
                    >
                        <Circle
                            size={18}
                            fill={isRecording ? 'currentColor' : 'none'}
                            className={isRecording ? 'animate-pulse' : ''}
                        />
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {isRecording ? 'Stop AI Rec' : 'AI Record'}
                    </div>
                </div>

                {/* Screen+Audio Recording Button — saves to Dashboard */}
                <div className="relative group">
                    <button
                        onClick={isScreenRecording ? stopScreenRecording : startScreenRecording}
                        disabled={screenUploading}
                        title="Screen Record — saved to your recordings"
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer",
                            screenUploading ? "bg-blue-100 text-blue-400 cursor-not-allowed" :
                                isScreenRecording ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                        )}
                    >
                        {screenUploading ? <Loader2 size={18} className="animate-spin" /> : <MonitorPlay size={18} />}
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {screenUploading ? 'Saving…' : isScreenRecording ? 'Stop Screen Rec' : 'Screen Record'}
                    </div>
                </div>

                <div className="w-[1px] h-8 bg-gray-200 mx-1 hidden sm:block" />

                <button
                    onClick={() => setShowReacts(true)}
                    className="w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-900"
                >
                    <Smile size={20} />
                </button>

                <button
                    onClick={() => { setPanel(panel === 'chat' ? null : 'chat'); setUnread(0); }}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer relative",
                        panel === 'chat' ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    )}
                >
                    <MessageSquare size={20} />
                    {unread > 0 && panel !== 'chat' && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setPanel(panel === 'notes' ? null : 'notes')}
                    className={cn(
                        "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer relative",
                        panel === 'notes' ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    )}
                    title="Personal Notes"
                >
                    <StickyNote size={20} />
                </button>

                {hasAiSummary && (
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className={cn(
                            "w-11 h-11 rounded-xl border-none transition-all active:scale-90 flex items-center justify-center cursor-pointer relative",
                            showTranscript ? "bg-black text-white shadow-xl" : "bg-black/5 text-black hover:bg-black/10"
                        )}
                    >
                        <Sparkles size={18} fill={showTranscript ? "currentColor" : "none"} />
                        {!showTranscript && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-black rounded-full border-2 border-white animate-pulse" />}
                    </button>
                )}

                {isHost ? (
                    <button
                        onClick={onEnd}
                        className="h-11 px-4 sm:px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 border-none cursor-pointer flex items-center gap-2"
                    >
                        <PhoneOff size={16} />
                        <span className="hidden sm:inline">End Meeting</span>
                    </button>
                ) : (
                    <button
                        onClick={handleLeave}
                        className="h-11 px-4 sm:px-6 rounded-xl bg-black hover:bg-black/90 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 border-none cursor-pointer flex items-center gap-2"
                    >
                        <PhoneOff size={16} />
                        <span className="hidden sm:inline">Leave Room</span>
                    </button>
                )}
            </div>
        </footer>
    );
};

export default MeetingFooter;

