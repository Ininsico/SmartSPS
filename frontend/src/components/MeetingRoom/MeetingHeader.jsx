import React from 'react';
import { UserButton } from '@clerk/clerk-react';
import { Video as VideoIcon } from 'lucide-react';
import { cn } from '../../utils';

const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const MeetingHeader = ({ isRecording, recSeconds, uploading, setShowInvite, isDark }) => {
    const D = isDark;
    return (
        <header className={cn(
            "h-16 px-6 flex items-center justify-between z-50 transition-all shrink-0",
            D ? "bg-premium-surface/90 border-b border-white/5 backdrop-blur-xl" : "bg-white/90 border-b border-gray-200 backdrop-blur-xl"
        )}>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-premium-accent flex items-center justify-center shadow-lg shadow-premium-accent/20">
                    <VideoIcon size={18} className="text-white" />
                </div>
                <span className="font-extrabold text-lg tracking-tight">smartMeet</span>
            </div>

            <div className="flex items-center gap-4">
                {isRecording && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-[11px] font-black tracking-widest uppercase">REC {fmtTime(recSeconds)}</span>
                    </div>
                )}
                {uploading && <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Saving...</span>}
                <button
                    onClick={() => setShowInvite(true)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 border",
                        D ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-200 hover:bg-white"
                    )}
                >
                    Invite
                </button>
                <UserButton />
            </div>
        </header>
    );
};

export default MeetingHeader;
