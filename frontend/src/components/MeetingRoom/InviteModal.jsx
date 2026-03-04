import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, X, Clipboard } from 'lucide-react';
import { cn } from '../../utils';

const InviteModal = ({ roomId, onClose, isDark }) => {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(`${window.location.origin}/?room=${roomId}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[2000] p-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
                className={cn(
                    "p-8 rounded-[38px] w-full max-w-sm border shadow-2xl transition-all",
                    isDark ? "bg-premium-surface border-white/10 text-white" : "bg-white border-black/5 text-gray-900"
                )}
            >
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-[22px] bg-black/10 flex items-center justify-center">
                        <MessageSquare size={32} className="text-black" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black tracking-tighter m-0">Invite People</h2>
                        <p className="text-sm opacity-50 font-bold tracking-tight mt-1 px-4">
                            Share this code with your participants to join the session
                        </p>
                    </div>

                    <div className={cn(
                        "w-full p-6 rounded-3xl border flex flex-col gap-1 items-center justify-center transition-all",
                        isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                    )}>
                        <span className="text-[10px] font-black uppercase tracking-[.3em] opacity-40">Meeting Code</span>
                        <code className="text-3xl font-black tracking-[.2em] text-black">
                            {roomId.toUpperCase()}
                        </code>
                    </div>

                    <div className="w-full flex flex-col gap-3 mt-2">
                        <button
                            onClick={copy}
                            className={cn(
                                "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-none cursor-pointer",
                                copied ? "bg-black text-white border border-black" : "bg-black text-white hover:bg-black shadow-xl shadow-black/30"
                            )}
                        >
                            {copied ? 'COPIED!' : 'COPY MEETING LINK'}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-4 text-[10px] font-black tracking-[.2em] uppercase opacity-40 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
                        >
                            Back to Meeting
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default InviteModal;
