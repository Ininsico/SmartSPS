import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Download, FileJson, FileText, ChevronRight, FileDown, UserCheck } from 'lucide-react';
import { cn } from '../../utils';

const SummarySidebar = ({ transcript, summary, onClose, onExport }) => {
    if (!transcript) return null;

    return (
        <div className="h-full flex flex-col bg-white border-l border-gray-200 shadow-2xl overflow-hidden text-black">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-black/5">
                        <Sparkles size={18} className="text-black/60" />
                    </div>
                    <div>
                        <h3 className="m-0 text-sm font-black tracking-tight text-black uppercase">AI Meeting Notes</h3>
                        <p className="m-0 text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5 text-gray-400">Powered by SmartMeet AI</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors border-none cursor-pointer text-gray-400 hover:text-black"
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
                            <label className="text-[10px] font-black uppercase tracking-[.2em] text-black/40">Executive Overview</label>
                            <p className="text-sm leading-relaxed text-gray-800 font-medium">
                                {summary.overview}
                            </p>
                        </motion.section>

                        {summary.roles?.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className="space-y-4"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-black/40">Roles & Responsibilities</label>
                                <div className="space-y-3">
                                    {summary.roles.map((role, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-black/5 border border-black/5 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <UserCheck size={14} className="text-black/60" />
                                                <span className="text-xs font-black uppercase tracking-wider">{role.person} — {role.role}</span>
                                            </div>
                                            <ul className="m-0 p-0 list-none space-y-1">
                                                {role.responsibilities?.map((res, j) => (
                                                    <li key={j} className="text-[11px] text-gray-600 flex gap-2">
                                                        <span className="opacity-30">•</span> {res}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {summary.keyPoints?.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-4"
                            >
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-gray-400">Key Discussion Points</label>
                                <ul className="space-y-3 p-0 m-0 list-none">
                                    {summary.keyPoints.map((point, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-gray-700 group">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black/20 shrink-0 group-hover:scale-125 transition-transform" />
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
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-gray-400">Action Items</label>
                                <div className="space-y-2">
                                    {summary.actionItems.map((item, i) => (
                                        <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex gap-3 items-start group hover:bg-gray-100 transition-all">
                                            <div className="mt-0.5 w-4 h-4 rounded border border-black/10 flex items-center justify-center shrink-0 group-hover:border-black/40 transition-colors">
                                                <div className="w-2 h-2 rounded-sm bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-sm text-gray-800 font-medium leading-tight">{item}</span>
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
                                <label className="text-[10px] font-black uppercase tracking-[.2em] text-gray-400">Key Decisions</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {summary.decisions.map((decision, i) => (
                                        <div key={i} className="px-4 py-3 rounded-xl bg-gray-100 border border-gray-200 flex items-center gap-3">
                                            <ChevronRight size={14} className="text-black/40" />
                                            <span className="text-xs font-bold text-gray-900">{decision}</span>
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

            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3 shrink-0">
                <p className="m-0 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Export Transcript</p>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => onExport('pdf')}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-black text-white hover:bg-black/90 transition-all cursor-pointer border-none shadow-lg shadow-black/20"
                    >
                        <FileDown size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">PDF</span>
                    </button>
                    <button
                        onClick={() => onExport('json')}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 transition-all text-gray-800 cursor-pointer"
                    >
                        <FileJson size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">JSON</span>
                    </button>
                    <button
                        onClick={() => onExport('csv')}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 transition-all text-gray-800 cursor-pointer"
                    >
                        <FileText size={14} />
                        <span className="text-[9px] font-black uppercase tracking-widest">CSV</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SummarySidebar;
