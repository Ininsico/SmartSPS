import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import { reactionByKey } from './Constants';

const FloatingReaction = ({ reactionKey, name, onDone }) => {
    useEffect(() => {
        const t = setTimeout(onDone, 3200);
        return () => clearTimeout(t);
    }, [onDone]);

    const r = reactionByKey[reactionKey];
    if (!r) return null;
    const Icon = r.icon;

    return (
        <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -200, scale: 1.5 }}
            transition={{ duration: 3, ease: 'easeOut' }}
            className="fixed bottom-28 right-[40px] z-[900] pointer-events-none text-center"
            style={{ right: `${Math.random() * 200 + 40}px` }}
        >
            <div className={cn("mb-1 p-3 rounded-full bg-black/40 backdrop-blur-sm shadow-2xl", r.color)}>
                <Icon size={32} fill="currentColor" />
            </div>
            <div className="text-[10px] text-white bg-black/60 rounded-md px-2 py-0.5 font-bold uppercase tracking-wider">
                {name}
            </div>
        </motion.div>
    );
};

export default FloatingReaction;
