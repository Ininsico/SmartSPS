import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, CalendarOff, Loader2, X, Clipboard, ExternalLink, Calendar, Clock, ArrowRight, Menu, Link2, Video, Trash2, Play, Sparkles, ChevronDown, ChevronUp, MessageSquare, ChevronRight, Edit, Save, XCircle, StickyNote, AlertCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MeetingCard from './MeetingCard';
import PremiumButton from '../../PremiumButton';
import { useAuthContext } from '../../AuthContext';
import { cn } from '../../utils';

const ScheduleModal = ({ onClose, onScheduled }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const { getToken } = useAuthContext();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = await getToken();
            const roomId = Math.random().toString(36).substring(7);
            const scheduleTime = new Date(`${date}T${time}`);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/meetings/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title, scheduleTime, roomId })
            });
            if (response.ok) {
                onScheduled();
                onClose();
            }
        } catch (err) {
            console.error('Failed to schedule:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[450px] rounded-3xl p-8 border shadow-2xl relative overflow-hidden bg-white border-black/5 text-black"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="m-0 font-extrabold text-2xl">Schedule Meeting</h2>
                    <button onClick={onClose} className="bg-none border-none cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Meeting Title</label>
                        <input
                            required
                            type="text"
                            placeholder="Strategy Session"
                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-premium-accent/50 bg-gray-50 border-black/5"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-3 rounded-xl border outline-none transition-all bg-gray-50 border-black/5"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Time</label>
                            <input
                                required
                                type="time"
                                className="w-full px-4 py-3 rounded-xl border outline-none transition-all bg-gray-50 border-black/5"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <PremiumButton type="submit" disabled={loading} className="w-full mt-4" icon={Calendar}>
                        {loading ? 'Scheduling...' : 'Confirm Schedule'}
                    </PremiumButton>
                </form>
            </motion.div>
        </motion.div>
    );
};

const JoinModal = ({ onClose }) => {
    const [roomInput, setRoomInput] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (!roomInput.trim()) return;

        let targetRoom = roomInput.trim();
        try {
            const url = new URL(targetRoom);
            const params = new URLSearchParams(url.search);
            const roomParam = params.get('room');
            if (roomParam) targetRoom = roomParam;
        } catch (e) { }

        navigate(`/preview/${targetRoom.toLowerCase()}`);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[450px] rounded-3xl p-8 border shadow-2xl relative overflow-hidden bg-white border-black/5 text-black"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="m-0 font-extrabold text-2xl">Join Meeting</h2>
                    <button onClick={onClose} className="bg-none border-none cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleJoin} className="flex flex-col gap-5">
                    <div>
                        <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Meeting Code or Link</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. abc-def-ghi"
                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-premium-accent/50 bg-gray-50 border-black/5"
                            value={roomInput}
                            onChange={e => setRoomInput(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <PremiumButton type="submit" className="w-full mt-4" icon={ArrowRight}>
                        Join Now
                    </PremiumButton>
                </form>
            </motion.div>
        </motion.div>
    );
};

const MeetingDetailView = ({ meeting, onClose }) => {
    const [summaryData, setSummaryData] = useState(null);
    const [personalNotes, setPersonalNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDraft, setEditDraft] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const { getToken, user } = useAuthContext();
    const navigate = useNavigate();

    const isHost = meeting?.hostId && user?.id && String(meeting.hostId) === String(user.id);

    useEffect(() => {
        if (!meeting) return;
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const token = await getToken();

                // Fetch AI Summary
                const summaryRes = await fetch(`${import.meta.env.VITE_API_URL}/vexa/saved/${meeting.roomId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (summaryRes.ok) {
                    const data = await summaryRes.json();
                    setSummaryData(data);
                }

                // Fetch Personal Notes
                const notesRes = await fetch(`${import.meta.env.VITE_API_URL}/meetings/notes/${meeting.roomId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (notesRes.ok) {
                    const data = await notesRes.json();
                    setPersonalNotes(data.content || '');
                }
            } catch (err) {
                console.error('Failed to fetch details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [meeting, getToken]);

    const startEditing = () => {
        const s = summaryData?.summary || {};
        setEditDraft({
            overview: s.overview || '',
            keyPoints: (s.keyPoints || []).join('\n'),
            decisions: (s.decisions || []).join('\n'),
            actionItems: (s.actionItems || []).join('\n'),
            roles: s.roles || [],
        });
        setIsEditing(true);
        setSaveError(null);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditDraft(null);
        setSaveError(null);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            const token = await getToken();
            const updatedSummary = {
                ...summaryData.summary,
                overview: editDraft.overview,
                keyPoints: editDraft.keyPoints.split('\n').filter(l => l.trim()),
                decisions: editDraft.decisions.split('\n').filter(l => l.trim()),
                actionItems: editDraft.actionItems.split('\n').filter(l => l.trim()),
                roles: editDraft.roles,
            };

            const res = await fetch(`${import.meta.env.VITE_API_URL}/vexa/update/${meeting.roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ summary: updatedSummary })
            });

            if (res.ok) {
                const data = await res.json();
                setSummaryData(prev => ({ ...prev, summary: data.summary }));
                setIsEditing(false);
                setEditDraft(null);
            } else {
                const err = await res.json();
                setSaveError(err.error || 'Failed to save changes');
            }
        } catch (err) {
            setSaveError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const updateRole = (index, field, value) => {
        setEditDraft(prev => {
            const roles = [...(prev.roles || [])];
            roles[index] = { ...roles[index], [field]: value };
            return { ...prev, roles };
        });
    };

    const updateRoleResponsibility = (roleIndex, respIndex, value) => {
        setEditDraft(prev => {
            const roles = [...(prev.roles || [])];
            const responsibilities = [...(roles[roleIndex].responsibilities || [])];
            responsibilities[respIndex] = value;
            roles[roleIndex] = { ...roles[roleIndex], responsibilities };
            return { ...prev, roles };
        });
    };

    if (!meeting) return null;
    const summary = summaryData?.summary;

    // ── Reusable editable field styles ──
    const taBase = "w-full rounded-2xl border border-black/10 bg-white/80 outline-none resize-none p-4 font-medium text-sm leading-relaxed transition-all focus:border-black/30 focus:ring-2 focus:ring-black/5 focus:bg-white placeholder:text-black/20";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-8 pb-20"
        >
            {/* Header row */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-black/5 border-none bg-transparent cursor-pointer font-black text-[10px] uppercase tracking-widest text-black/60 transition-all hover:text-black"
                >
                    ← Back to History
                </button>
                <div className="flex gap-3 items-center">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                        meeting.status === 'active' ? "bg-green-100 text-green-600" :
                            meeting.status === 'ended' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                        {meeting.status}
                    </span>
                    {meeting.status !== 'ended' && (
                        <button
                            onClick={() => navigate(`/preview/${meeting.roomId}`)}
                            className="px-4 py-1.5 rounded-xl bg-black text-white border-none cursor-pointer font-black text-[10px] uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-black/10"
                        >
                            Join Now
                        </button>
                    )}
                </div>
            </div>

            {/* Title Block */}
            <div className="space-y-2">
                <span className="text-[10px] font-bold opacity-30 uppercase tracking-[.3em] block">
                    {new Date(meeting.startTime || meeting.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <h1 className="m-0 font-black text-4xl md:text-5xl tracking-tighter leading-none">{meeting.title}</h1>
            </div>

            {/* Edit Mode Banner — only visible to host when report exists */}
            {isHost && summary && (
                <div className={cn(
                    "flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                    isEditing
                        ? "bg-amber-50 border-amber-200"
                        : "bg-gray-50 border-black/5"
                )}>
                    <div className="flex items-center gap-3">
                        {isEditing ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-amber-700">Edit Mode — all fields unlocked</span>
                            </>
                        ) : (
                            <>
                                <Edit size={14} className="opacity-40" />
                                <span className="text-[11px] font-black uppercase tracking-widest opacity-40">You are the host — you can edit this report</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                {saveError && <span className="text-red-500 text-[10px] font-black mr-2">{saveError}</span>}
                                <button
                                    onClick={cancelEditing}
                                    disabled={saving}
                                    className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 text-black text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAll}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest border-none cursor-pointer transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    {saving ? 'Saving…' : 'Save All'}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={startEditing}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest border-none cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                            >
                                <Edit size={12} />
                                Edit Report
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-12">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-30">
                            <Loader2 size={32} className="animate-spin" />
                            <p className="text-xs font-black uppercase tracking-widest">Synthesizing Meeting Insights...</p>
                        </div>
                    ) : summary ? (
                        <>
                            {/* ── Executive Overview ── */}
                            <section>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 block">Executive Overview</label>
                                {isEditing ? (
                                    <textarea
                                        value={editDraft.overview}
                                        onChange={e => setEditDraft(p => ({ ...p, overview: e.target.value }))}
                                        rows={5}
                                        placeholder="Write an executive overview of the meeting…"
                                        className={taBase}
                                    />
                                ) : (
                                    <p className="m-0 text-lg leading-relaxed text-black/80 font-medium max-w-2xl">{summary.overview}</p>
                                )}
                            </section>

                            {/* ── Highlights & Decisions ── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <section>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 block">Highlights</label>
                                    {isEditing ? (
                                        <textarea
                                            value={editDraft.keyPoints}
                                            onChange={e => setEditDraft(p => ({ ...p, keyPoints: e.target.value }))}
                                            rows={6}
                                            placeholder={"• One highlight per line\n• Press Enter for a new one"}
                                            className={taBase}
                                        />
                                    ) : (
                                        <ul className="m-0 p-0 list-none space-y-4">
                                            {summary.keyPoints?.map((p, i) => (
                                                <li key={i} className="text-sm font-bold text-black/70 flex gap-3 leading-snug">
                                                    <ChevronRight size={16} className="shrink-0 opacity-20 mt-0.5" /> {p}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                <section>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 block">Decisions</label>
                                    {isEditing ? (
                                        <textarea
                                            value={editDraft.decisions}
                                            onChange={e => setEditDraft(p => ({ ...p, decisions: e.target.value }))}
                                            rows={6}
                                            placeholder={"One decision per line\nPress Enter for the next"}
                                            className={taBase}
                                        />
                                    ) : (
                                        <ul className="m-0 p-0 list-none space-y-4">
                                            {summary.decisions?.map((p, i) => (
                                                <li key={i} className="text-sm font-black text-black flex gap-3 leading-snug">
                                                    <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                                                        <div className="w-2 h-2 rounded-full bg-black/60" />
                                                    </div>
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </div>

                            {/* ── Participants & Roles ── */}
                            {(summary.roles?.length > 0 || isEditing) && (
                                <section>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-5 block">Participants &amp; Roles</label>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            {(editDraft.roles || []).map((r, i) => (
                                                <div key={i} className="p-5 rounded-2xl border border-black/10 bg-white/60 space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1 block">Name</label>
                                                            <input
                                                                value={r.person || ''}
                                                                onChange={e => updateRole(i, 'person', e.target.value)}
                                                                className="w-full rounded-xl border border-black/10 bg-white outline-none p-2.5 text-sm font-bold focus:border-black/30 focus:ring-1 focus:ring-black/5 transition-all"
                                                                placeholder="Person name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1 block">Role</label>
                                                            <input
                                                                value={r.role || ''}
                                                                onChange={e => updateRole(i, 'role', e.target.value)}
                                                                className="w-full rounded-xl border border-black/10 bg-white outline-none p-2.5 text-sm font-bold focus:border-black/30 focus:ring-1 focus:ring-black/5 transition-all"
                                                                placeholder="e.g. Project Lead"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1 block">Responsibilities (one per line)</label>
                                                        <textarea
                                                            value={(r.responsibilities || []).join('\n')}
                                                            onChange={e => {
                                                                const resps = e.target.value.split('\n');
                                                                updateRole(i, 'responsibilities', resps);
                                                            }}
                                                            rows={3}
                                                            className={taBase + " text-xs"}
                                                            placeholder="List responsibilities, one per line"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {summary.roles.map((r, i) => (
                                                <div key={i} className="p-6 rounded-3xl bg-gray-50 border border-black/5 space-y-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-[11px] font-black text-black uppercase tracking-tight">
                                                            {r.person} <span className="opacity-40 ml-1">/ {r.role}</span>
                                                        </span>
                                                    </div>
                                                    <ul className="m-0 p-0 list-none pl-4 flex flex-col gap-1">
                                                        {r.responsibilities?.map((res, j) => (
                                                            <li key={j} className="text-[11px] text-black/50 font-bold italic opacity-80 leading-snug tracking-tighter">• {res}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* ── Action Items ── */}
                            {(summary.actionItems?.length > 0 || isEditing) && (
                                <section className={cn(
                                    "p-10 rounded-[2.5rem] shadow-2xl transition-all",
                                    isEditing ? "bg-gray-900" : "bg-black"
                                )}>
                                    <div className="mb-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                                            Next Steps &amp; Action Items
                                        </label>
                                    </div>
                                    {isEditing ? (
                                        <textarea
                                            value={editDraft.actionItems}
                                            onChange={e => setEditDraft(p => ({ ...p, actionItems: e.target.value }))}
                                            rows={6}
                                            placeholder={"One action item per line\nAssign tasks and next steps here"}
                                            className="w-full rounded-2xl border border-white/10 bg-white/5 outline-none resize-none p-4 font-medium text-sm leading-relaxed text-white transition-all focus:border-white/30 focus:ring-2 focus:ring-white/5 placeholder:text-white/20"
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 gap-5">
                                            {summary.actionItems?.map((item, i) => (
                                                <div key={i} className="flex items-start gap-4 group">
                                                    <div className="w-6 h-6 rounded-xl border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                                                        <div className="w-3 h-3 rounded bg-premium-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className="text-sm font-bold text-white tracking-tight leading-normal">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* ── Meeting Transcript ── */}
                            {summaryData?.segments?.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-black/5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-30">Full Meeting Transcript</label>
                                        <span className="text-[10px] font-bold opacity-30">{summaryData.segments.length} segments</span>
                                    </div>
                                    <div className="space-y-4">
                                        {summaryData.segments.map((seg, i) => (
                                            <div key={i} className="flex gap-4 group">
                                                <div className="w-[100px] shrink-0 text-[10px] font-black uppercase tracking-tighter opacity-20 pt-1 group-hover:opacity-100 transition-opacity">
                                                    {seg.speaker}
                                                </div>
                                                <p className="m-0 text-sm font-medium text-black/70 leading-relaxed flex-1">
                                                    {seg.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                        </>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-black/5 rounded-[2.5rem] bg-gray-50/50">
                            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
                                <AlertCircle size={24} className="text-black/20" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-black/30">No AI activated for this instance</p>
                        </div>
                    )}

                    {/* ── Personal Notes – always shown, independent of AI summary ── */}
                    {!loading && personalNotes && (
                        <section className="overflow-hidden">
                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className="w-full flex items-center justify-between p-6 rounded-3xl bg-yellow-50 border border-yellow-200/50 hover:bg-yellow-100/50 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                                        <StickyNote size={18} className="text-yellow-700" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-black text-yellow-900 block">Your Personal Notes</span>
                                        <span className="text-[10px] font-bold text-yellow-700/60 uppercase tracking-widest">Only visible to you</span>
                                    </div>
                                </div>
                                {showNotes ? <ChevronUp size={20} className="text-yellow-700" /> : <ChevronDown size={20} className="text-yellow-700" />}
                            </button>
                            <AnimatePresence>
                                {showNotes && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-yellow-50/30 border-x border-b border-yellow-200/30 rounded-b-3xl -mt-4 pt-8 pb-6 px-10"
                                    >
                                        <p className="m-0 text-sm leading-relaxed text-yellow-900/80 font-medium whitespace-pre-wrap italic">
                                            {personalNotes}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>
                    )}

                    {/* ── All Participants' Notes – always shown for host ── */}
                    {!loading && isHost && summaryData?.personalNotes?.length > 0 && (
                        <section className="space-y-6 pt-8 border-t border-black/5">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30 block">Participant Feedbacks &amp; Notes</label>
                            <div className="grid grid-cols-1 gap-4">
                                {summaryData.personalNotes.map((note, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-gray-50 border border-black/5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-black/5 border border-black/5">
                                                {note.userAvatar
                                                    ? <img src={note.userAvatar} alt={note.userName} className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center text-xs font-black opacity-20">{note.userName?.[0]}</div>
                                                }
                                            </div>
                                            <div>
                                                <span className="text-sm font-black block">{note.userName}</span>
                                                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Participant Notes</span>
                                            </div>
                                        </div>
                                        <p className="m-0 text-sm font-medium text-black/60 leading-relaxed italic border-l-2 border-black/10 pl-4">
                                            {note.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Meta Sidebar */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="p-8 rounded-[2rem] border bg-gray-50 border-black/5 space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1.5 block">Record ID</label>
                            <div className="flex items-center gap-3">
                                <code className="text-xs font-black tracking-widest text-black/40 truncate">{meeting.roomId.toUpperCase()}</code>
                                <button onClick={() => navigator.clipboard.writeText(meeting.roomId)} className="p-2 rounded-xl hover:bg-black/5 border-none cursor-pointer opacity-40 text-black"><Clipboard size={14} /></button>
                            </div>
                        </div>
                        <div className="flex gap-10">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1.5 block">Started At</label>
                                <p className="m-0 text-sm font-black">{new Date(meeting.startTime || meeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {meeting.endTime && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1.5 block">Duration</label>
                                    <p className="m-0 text-sm font-black">
                                        {(() => {
                                            const start = new Date(meeting.startTime || meeting.createdAt);
                                            const end = new Date(meeting.endTime);
                                            const diffMs = end - start;
                                            const diffSec = Math.floor(diffMs / 1000);
                                            if (diffSec <= 0) return '0s';
                                            const m = Math.floor(diffSec / 60);
                                            const s = diffSec % 60;
                                            return m > 0 ? `${m}m ${s}s` : `${s}s`;
                                        })()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {summaryData?.chat?.length > 0 && (
                        <div className="rounded-[2rem] border overflow-hidden bg-white border-black/5 shadow-sm">
                            <div className="p-5 border-b border-black/5 bg-gray-50/50 flex items-center gap-2">
                                <MessageSquare size={16} className="opacity-40" />
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Meeting Chat</label>
                            </div>
                            <div className="p-6 max-h-[400px] overflow-y-auto scrollbar-none flex flex-col gap-6">
                                {summaryData.chat.map((c, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-black shrink-0 flex items-center justify-center text-[10px] font-black text-white">{c.senderName?.[0] || '?'}</div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black opacity-30 uppercase block mb-0.5">{c.senderName}</span>
                                            <p className="m-0 text-[11px] font-bold text-black/80 leading-normal">{c.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};



const Dashboard = ({ onNewMeeting, onSignOut }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewType, setViewType] = useState('grid');
    const [meetings, setMeetings] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recLoading, setRecLoading] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [playingRec, setPlayingRec] = useState(null);
    const { getToken, user } = useAuthContext();
    const location = useLocation();

    const CACHE_KEY = user ? `meeting_history_${user.id}` : null;
    const CACHE_TTL = 60_000; // 60s — matches server cache

    // Bust localStorage cache and force a fresh fetch from server
    const forceRefresh = useCallback(async () => {
        setLoading(true);
        // Step 1: Small delay to let backend writes (like status='ended') settle in the DB
        await new Promise(r => setTimeout(r, 600));

        // Step 2: Clear LOCAL cache
        if (CACHE_KEY) localStorage.removeItem(CACHE_KEY);
        const REC_KEY = user ? `recordings_${user.id}` : null;
        if (REC_KEY) localStorage.removeItem(REC_KEY);

        try {
            const token = await getToken();
            // Step 3: Fetch with cache-buster to bypass any network/server cache
            const buster = `?t=${Date.now()}`;

            const [hisRes, recRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/meetings/history${buster}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/recordings`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (hisRes.ok) {
                const data = await hisRes.json();
                const m = Array.isArray(data) ? data : [];
                setMeetings(m);
                if (CACHE_KEY) localStorage.setItem(CACHE_KEY, JSON.stringify({ data: m, ts: Date.now() }));
            }
            if (recRes.ok) {
                const data = await recRes.json();
                setRecordings(Array.isArray(data) ? data : []);
            }
        } catch (err) {
        } finally {
            setLoading(false);
        }
    }, [CACHE_KEY, getToken, user]);

    const fetchHistory = async (showLoading = true) => {
        try {
            if (CACHE_KEY && showLoading) {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_TTL) {
                        setMeetings(data);
                        setLoading(false);
                        fetchHistory(false);
                        return;
                    }
                }
            }
            if (showLoading) setLoading(true);
            const token = await getToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/meetings/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            const meetings = Array.isArray(data) ? data : [];
            setMeetings(meetings);
            if (CACHE_KEY) localStorage.setItem(CACHE_KEY, JSON.stringify({ data: meetings, ts: Date.now() }));
        } catch (err) {
            // Silencing history fetch errors
        } finally {
            setLoading(false);
        }
    };

    const fetchRecordings = async () => {
        setRecLoading(true);
        try {
            const REC_KEY = user ? `recordings_${user.id}` : null;
            if (REC_KEY) {
                const cached = localStorage.getItem(REC_KEY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_TTL) { setRecordings(data); setRecLoading(false); return; }
                }
            }
            const token = await getToken();
            const res = await fetch(`${import.meta.env.VITE_API_URL}/recordings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const recs = Array.isArray(data) ? data : [];
            setRecordings(recs);
            if (REC_KEY) localStorage.setItem(REC_KEY, JSON.stringify({ data: recs, ts: Date.now() }));
        } catch (err) {
            // Silently fail fetching recordings
        } finally {
            setRecLoading(false);
        }
    };

    const deleteRecording = async (id) => {
        try {
            const token = await getToken();
            await fetch(`${import.meta.env.VITE_API_URL}/recordings/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setRecordings(prev => prev.filter(r => r._id !== id));
            if (user?.id) localStorage.removeItem(`recordings_${user.id}`);
        } catch (err) {
            // Silently fail delete
        }
    };

    const fmtDuration = (s) => s > 0 ? `${Math.floor(s / 60)}m ${s % 60}s` : 'N/A';
    const fmtSize = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${(b / 1e3).toFixed(0)} KB` : `${b} B`;

    // Derive the selected meeting live from the meetings array so the modal always shows fresh status
    const selectedMeeting = useMemo(
        () => meetings.find(m => m.roomId === selectedMeetingId) || null,
        [meetings, selectedMeetingId]
    );

    useEffect(() => {
        if (!user) return;
        // Skip fetchHistory on mount if forceRefresh is already going to run (avoids race condition
        // where cached stale data overwrites fresh data from forceRefresh)
        if (!location.state?.refresh) {
            fetchHistory();
            fetchRecordings();
        }
        const interval = setInterval(() => fetchHistory(false), CACHE_TTL);
        return () => clearInterval(interval);
    }, [user]);

    // Bust cache and force-reload when navigating back to the dashboard (e.g. after leaving a meeting)
    useEffect(() => {
        if (!user || !location.state?.refresh) return;
        // Immediate visual feedback that we are refreshing
        setLoading(true);
        forceRefresh();
        // Clear navigation state so it doesn't loop
        window.history.replaceState({}, document.title);
    }, [location.state, user, forceRefresh]);

    useEffect(() => {
        if (activeSection === 'recordings') fetchRecordings();
    }, [activeSection]);

    const filteredMeetings = useMemo(() => {
        return meetings.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || m.roomId?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [meetings, searchQuery]);

    return (
        <div className="h-screen w-screen flex overflow-hidden bg-white text-black">
            {/* Sidebar with responsive handling */}
            <div className={cn(
                "h-full z-[1001] transition-transform duration-300 flex-shrink-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:static fixed inset-y-0 left-0"
            )}>
                <Sidebar
                    activeSection={activeSection}
                    onHomeClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}
                    onScheduleClick={() => { setShowSchedule(true); setSidebarOpen(false); }}
                    onRecordingsClick={() => { setActiveSection('recordings'); setSidebarOpen(false); }}
                />
            </div>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[1000] md:hidden cursor-pointer backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <TopBar
                    onSignOut={onSignOut}
                    onMenuClick={() => setSidebarOpen(true)}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />

                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 flex flex-col gap-8">
                    {selectedMeeting ? (
                        <MeetingDetailView
                            meeting={selectedMeeting}
                            onClose={() => setSelectedMeetingId(null)}
                        />
                    ) : activeSection === 'recordings' ? (
                        <>
                            <section className="flex justify-between items-center">
                                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter m-0">Recordings</h1>
                                <button
                                    onClick={() => setActiveSection('dashboard')}
                                    className="flex items-center px-4 py-2 rounded-xl font-semibold border transition-all active:scale-95 border-gray-200 hover:bg-gray-50 bg-transparent cursor-pointer"
                                >
                                    ← Back
                                </button>
                            </section>

                            {recLoading ? (
                                <div className="flex flex-col items-center justify-center h-[400px] gap-4 opacity-40">
                                    <Loader2 size={40} className="animate-spin" />
                                    <p className="font-bold">Loading recordings...</p>
                                </div>
                            ) : recordings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[400px] gap-3 opacity-40 text-center">
                                    <Video size={48} />
                                    <h2 className="text-xl font-bold">No recordings yet</h2>
                                    <p className="text-sm">Start a recording in a meeting to see it here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {recordings.map(rec => (
                                        <div
                                            key={rec._id}
                                            className="rounded-2xl overflow-hidden border transition-all hover:translate-y-[-4px] bg-gray-50 border-gray-100 shadow-sm"
                                        >
                                            <div
                                                onClick={() => setPlayingRec(rec)}
                                                className="relative aspect-video bg-black cursor-pointer group flex items-center justify-center overflow-hidden"
                                            >
                                                {rec.thumbnail
                                                    ? <img src={rec.thumbnail} alt={rec.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    : <Video size={40} className="text-gray-700" />
                                                }
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                                                        <Play size={24} className="ml-1 text-black fill-black" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="font-bold text-sm mb-1 truncate">{rec.title}</div>
                                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider opacity-40 mb-4">
                                                    <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                                                    <span>{fmtDuration(rec.duration)} · {fmtSize(rec.size)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <a
                                                        href={rec.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white text-xs font-black uppercase tracking-widest transition-opacity hover:opacity-90 active:scale-[0.98]"
                                                    >
                                                        <ExternalLink size={14} /> Download
                                                    </a>
                                                    <button
                                                        onClick={() => deleteRecording(rec._id)}
                                                        className="p-2.5 rounded-xl text-black hover:bg-black/10 transition-colors bg-black/5"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <section className="flex flex-col gap-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight m-0">Meetings</h1>
                                        <button
                                            onClick={forceRefresh}
                                            className="p-2 ml-2 rounded-lg hover:bg-black/5 transition-colors border-none bg-transparent cursor-pointer opacity-40 hover:opacity-100"
                                            title="Sync History"
                                        >
                                            <Loader2 size={20} className={loading ? "animate-spin" : ""} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
                                            <button
                                                onClick={() => setShowJoin(true)}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer bg-gray-100 text-black hover:bg-gray-200"
                                            >
                                                <Link2 size={16} className="text-black/60" />
                                                Join Meeting
                                            </button>
                                            <button
                                                onClick={() => setShowSchedule(true)}
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer bg-gray-100 text-black hover:bg-gray-200"
                                            >
                                                <Calendar size={16} className="text-black/60" />
                                                Schedule
                                            </button>
                                        </div>

                                        <PremiumButton
                                            variant="primary"
                                            icon={Plus}
                                            onClick={onNewMeeting}
                                            className="h-14 px-8 shadow-2xl shadow-premium-accent/20"
                                        >
                                            New Meeting
                                        </PremiumButton>
                                    </div>
                                </div>
                            </section>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-[400px] gap-4 opacity-40">
                                    <Loader2 size={40} className="animate-spin" />
                                    <p className="font-bold tracking-tight">Fetching your universe...</p>
                                </div>
                            ) : filteredMeetings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[400px] gap-3 opacity-40 text-center">
                                    <CalendarOff size={48} />
                                    <h2 className="text-xl font-bold">No meetings found</h2>
                                </div>
                            ) : (
                                <div className={cn(
                                    "grid gap-6 transition-all",
                                    viewType === 'grid' ? "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3" : "flex flex-col"
                                )}>
                                    {filteredMeetings.map((meeting) => (
                                        <MeetingCard
                                            key={meeting._id}
                                            meeting={meeting}
                                            onShowDetails={() => setSelectedMeetingId(meeting.roomId)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Global Modals */}
            <AnimatePresence>
                {showSchedule && (
                    <ScheduleModal
                        onClose={() => setShowSchedule(false)}
                        onScheduled={forceRefresh}
                    />
                ) || null}
                {showJoin && (
                    <JoinModal
                        onClose={() => setShowJoin(false)}
                    />
                ) || null}
                {playingRec && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPlayingRec(null)}
                        className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4 md:p-8 backdrop-blur-xl"
                    >
                        <div onClick={e => e.stopPropagation()} className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden relative shadow-2xl">
                            <button
                                onClick={() => setPlayingRec(null)}
                                className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/90 p-2 rounded-full text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <video src={playingRec.url} controls autoPlay className="w-full max-h-[75vh] block" />
                            <div className="p-6 text-white bg-premium-surface">
                                <div className="text-lg font-extrabold mb-1">{playingRec.title}</div>
                                <div className="text-xs font-bold uppercase tracking-widest opacity-40">
                                    {new Date(playingRec.createdAt).toLocaleString()} · {fmtDuration(playingRec.duration)}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Dashboard;
