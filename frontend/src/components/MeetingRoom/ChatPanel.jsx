import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { cn } from '../../utils';

const ChatPanel = ({ messages, onSend, onClose, isDark }) => {
    const [t, setT] = useState('');
    const scrollRef = useRef();

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="m-0 text-base font-black tracking-tight flex items-center gap-2">
                    <MessageSquare size={16} className="text-black" />
                    MEETING CHAT
                </h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors border-none cursor-pointer text-gray-400 hover:text-white"
                >
                    <X size={18} />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
                        <MessageSquare size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[.2em]">Start the conversation</p>
                    </div>
                ) : messages.map((m, i) => (
                    <div key={m.id || i} className={cn(
                        "flex flex-col gap-1",
                        m.from === 'me' ? "items-end" : "items-start"
                    )}>
                        {m.from !== 'me' && (
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">
                                {m.userName}
                            </span>
                        )}
                        <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] break-words leading-relaxed transition-all",
                            m.from === 'me'
                                ? "bg-black text-white rounded-tr-none"
                                : (isDark ? "bg-white/5 text-white border border-white/5 rounded-tl-none" : "bg-gray-100 text-gray-900 border border-gray-200 rounded-tl-none")
                        )}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-black/20 backdrop-blur-xl border-t border-white/5 shrink-0">
                <form
                    onSubmit={e => { e.preventDefault(); if (t.trim()) { onSend(t); setT(''); } }}
                    className="flex gap-2"
                >
                    <input
                        autoFocus
                        value={t}
                        onChange={e => setT(e.target.value)}
                        className={cn(
                            "flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all outline-none border-none",
                            isDark ? "bg-white/5 text-white focus:bg-white/10 placeholder:text-white/20" : "bg-gray-50 text-gray-900 focus:bg-white border border-gray-200 placeholder:text-gray-400"
                        )}
                        placeholder="Message everyone..."
                    />
                    <button
                        type="submit"
                        disabled={!t.trim()}
                        className="w-12 h-11 flex items-center justify-center rounded-xl bg-black text-white hover:bg-black transition-all active:scale-95 disabled:opacity-30 disabled:grayscale border-none cursor-pointer shadow-lg shadow-black/20"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;
