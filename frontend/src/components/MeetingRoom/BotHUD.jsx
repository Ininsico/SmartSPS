import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const BotHUD = ({ botPhase, phaseMsg, countdown }) => {
    return (
        <AnimatePresence>
            {['starting', 'stopping', 'fetching', 'summarizing'].includes(botPhase) && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3.5 rounded-2xl bg-white border border-black shadow-2xl flex items-center gap-3 text-black"
                >
                    <Loader2 size={18} className="animate-spin text-black" />
                    <div className="text-sm font-black tracking-widest uppercase text-black">
                        {phaseMsg} {countdown > 0 && <span className="opacity-50 font-normal">({countdown}s)</span>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BotHUD;
