import { Video as VideoIcon, Users, LogOut, PhoneOff } from 'lucide-react';
import { useAuthContext } from '../../AuthContext';
import { cn } from '../../utils';

const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const MeetingHeader = ({ isRecording, recSeconds, uploading, setShowInvite, participantCount, setShowParticipants, isHost, handleLeave, onEnd }) => {
    const { logout } = useAuthContext();
    return (
        <header className="h-16 px-6 flex items-center justify-between z-50 transition-all shrink-0 bg-white/90 border-b border-gray-200 backdrop-blur-xl">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-premium-accent flex items-center justify-center shadow-lg shadow-premium-accent/20">
                    <VideoIcon size={18} className="text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="font-extrabold text-sm tracking-tight leading-none">smartMeet</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Live Session</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {isRecording && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 border border-red-600 text-white mr-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest uppercase">REC {fmtTime(recSeconds)}</span>
                    </div>
                )}

                {uploading && <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest mr-4">Saving...</span>}

                <div className="flex items-center gap-1.5 mr-2">
                    <button
                        onClick={() => setShowParticipants(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all active:scale-95 border bg-white border-gray-100 hover:bg-gray-50 text-gray-600"
                    >
                        <Users size={14} />
                        <span>Members</span>
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-[10px] font-black">
                            {participantCount}
                        </span>
                    </button>
                </div>

                <div className="w-px h-6 bg-gray-100 mx-1" />

                <button
                    onClick={() => setShowInvite(true)}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 border bg-white border-gray-100 hover:bg-gray-50 text-gray-900"
                >
                    Invite
                </button>

                {isHost ? (
                    <button
                        onClick={onEnd}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border bg-red-50 border-red-100 text-red-600 hover:bg-red-500 hover:text-white group shadow-sm hover:shadow-red-200"
                    >
                        <PhoneOff size={14} className="group-hover:-rotate-90 transition-transform" />
                        <span className="hidden sm:inline">End Meeting</span>
                    </button>
                ) : (
                    <button
                        onClick={handleLeave}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border bg-black border-black text-white hover:bg-white hover:text-black group shadow-md"
                    >
                        <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
                        <span className="hidden sm:inline">Leave</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default MeetingHeader;
