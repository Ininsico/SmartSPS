import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Download, FileJson, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

const SummarySidebar = ({ transcript, summary, onClose, onExport, isDark }) => {
    if (!transcript) return null;

    return (
        <div className="h-full flex flex-col bg-premium-surface/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-premium-accent/10">
                        <Sparkles size={18} className="text-premium-accent" />
                    </div>
                    <div>
                        <h3 className="m-0 text-sm font-black tracking-tight text-white uppercase">AI Meeting Notes</h3>
                        <p className="m-0 text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">Powered by SmartMeet AI</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors border-none cursor-pointer text-gray-400 hover:text-white"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-none pb-24">
                {summary ? (
                    <>
                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            <label className="text-[10px] font-black uppercase tracking-[.2em] text-premium-accent">Executive Overview</label>
                            <p className="text-sm leading-relaxed text-white/80 font-medium">
                                {summary.overview}
                            </p>
                        </motion.section>

                        {summary.keyPoints?.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-4"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Key Discussion Points</label>
                                <ul className="space-y-3 p-0 m-0 list-none">
                                    {summary.keyPoints.map((point, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-white/70 group">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-premium-accent shrink-0 group-hover:scale-125 transition-transform" />
                                            <span className="leading-snug">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.section>
                        )}

                        {summary.actionItems?.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Action Items</label>
                                <div className="space-y-2">
                                    {summary.actionItems.map((item, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-3 items-start group hover:bg-white/[0.08] transition-all">
                                            <div className="mt-0.5 w-4 h-4 rounded border border-premium-accent/40 flex items-center justify-center shrink-0 group-hover:border-premium-accent transition-colors">
                                                <div className="w-2 h-2 rounded-sm bg-premium-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-sm text-white/80 font-medium leading-tight">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {summary.decisions?.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-4"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Key Decisions</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {summary.decisions.map((decision, i) => (
                                        <div key={i} className="px-4 py-3 rounded-xl bg-premium-accent/10 border border-premium-accent/20 flex items-center gap-3">
                                            <ChevronRight size={14} className="text-premium-accent" />
                                            <span className="text-xs font-bold text-white/90">{decision}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-30 py-20">
                        <Sparkles size={48} />
                        <p className="text-xs font-black uppercase tracking-[.2em]">Summary Pending...</p>
                    </div>
                )}
            </div>

            <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-3xl space-y-3 shrink-0">
                <p className="m-0 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Export Transcript</p>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onExport('json')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black text-white/80 border-none cursor-pointer"
                    >
                        <FileJson size={14} /> JSON
                    </button>
                    <button
                        onClick={() => onExport('csv')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black text-white/80 border-none cursor-pointer"
                    >
                        <FileText size={14} /> CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SummarySidebar;
