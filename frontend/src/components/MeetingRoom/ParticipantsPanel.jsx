import React from 'react';
import { X, User, Crown, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

const ParticipantsPanel = ({ participants, onClose, isHost, myId, peerStates }) => {
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black tracking-tight">Members</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {participants.length} PEOPLE IN CALL
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all border-none cursor-pointer"
                >
                    <X size={20} className="text-gray-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
                {participants.map((p) => {
                    const isMe = String(p.id) === String(myId);
                    const state = peerStates[p.agoraUid || p.id] || {};
                    const muted = isMe ? false : (state.muted || state.adminMuted);
                    const videoOff = isMe ? false : !p.videoTrack;

                    return (
                        <motion.div
                            layout
                            key={p.id}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                    {p.userAvatar ? (
                                        <img src={p.userAvatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={18} className="text-gray-400" />
                                    )}
                                </div>
                                {p.isHost && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                        <Crown size={10} className="text-white" fill="currentColor" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-sm truncate text-gray-900">
                                        {p.userName || 'Guest'}
                                    </span>
                                    {isMe && (
                                        <span className="text-[9px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                                            You
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-widest mt-0.5">
                                    {p.isHost ? 'Meeting Host' : 'Participant'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {muted ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} className="text-gray-300" />}
                                {videoOff ? <VideoOff size={14} className="text-red-400" /> : <Video size={14} className="text-gray-300" />}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default ParticipantsPanel;
