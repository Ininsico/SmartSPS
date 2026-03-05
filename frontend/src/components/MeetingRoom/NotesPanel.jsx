import React from 'react';
import { motion } from 'framer-motion';
import { X, StickyNote, Loader2, Save } from 'lucide-react';
import { cn } from '../../utils';

const NotesPanel = ({ notes, setNotes, isSaving, onClose }) => {
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                        <StickyNote size={18} className="text-yellow-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Personal Notes</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Synced to your dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSaving && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 text-[10px] font-bold text-gray-500">
                            <Loader2 size={10} className="animate-spin" />
                            SAVING
                        </div>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors border-none cursor-pointer bg-transparent">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Capture your thoughts, action items, or private observations here... 📝"
                    className="w-full h-full resize-none border-none outline-none font-medium text-sm leading-relaxed text-gray-700 placeholder:text-gray-300 placeholder:font-normal"
                />
            </div>

            <div className="p-4 border-t bg-gray-50/50">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <Save size={10} />
                    Auto-saves as you type
                </div>
            </div>
        </div>
    );
};

export default NotesPanel;
