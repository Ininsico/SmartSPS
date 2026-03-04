import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

const SelectionModal = ({ options, onSelect, onClose, isDark }) => (
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
                "p-8 rounded-[32px] grid grid-cols-4 gap-4 shadow-2xl border transition-all",
                isDark ? "bg-[#1a1010] border-white/10" : "bg-white border-black/5"
            )}
        >
            {options.map(o => {
                const Icon = o.icon;
                return (
                    <button
                        key={o.key}
                        onClick={() => { onSelect(o.key); onClose(); }}
                        className={cn(
                            "aspect-square flex items-center justify-center rounded-2xl hover:scale-110 active:scale-95 transition-all bg-black/5 hover:bg-black/10 border-none cursor-pointer p-4",
                            o.color
                        )}
                    >
                        <Icon size={28} />
                    </button>
                );
            })}
        </motion.div>
    </motion.div>
);

export default SelectionModal;
