import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, CalendarOff, Loader2, X, Clipboard, ExternalLink, Calendar, Clock, ArrowRight, Menu, Link2, Video, Trash2, Play, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MeetingCard from './MeetingCard';
import PremiumButton from '../../PremiumButton';
import { useAuth, useUser } from '@clerk/clerk-react';
import { cn } from '../../utils';

const ScheduleModal = ({ onClose, isDarkMode, onScheduled }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const { getToken } = useAuth();

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
                className={cn(
                    "w-full max-w-[450px] rounded-3xl p-8 border shadow-2xl relative overflow-hidden",
                    isDarkMode ? "bg-premium-surface border-white/10 text-white" : "bg-white border-black/5 text-black"
                )}
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
                            className={cn(
                                "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-premium-accent/50",
                                isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"
                            )}
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
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                                    isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"
                                )}
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-60">Time</label>
                            <input
                                required
                                type="time"
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                                    isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"
                                )}
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

const JoinModal = ({ onClose, isDarkMode }) => {
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
                className={cn(
                    "w-full max-w-[450px] rounded-3xl p-8 border shadow-2xl relative overflow-hidden",
                    isDarkMode ? "bg-premium-surface border-white/10 text-white" : "bg-white border-black/5 text-black"
                )}
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
                            className={cn(
                                "w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-premium-accent/50",
                                isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-black/5"
                            )}
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

const MeetingDetailModal = ({ meeting, onClose, isDarkMode }) => {
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const { getToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!meeting) return;
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const token = await getToken();
                const res = await fetch(`${import.meta.env.VITE_API_URL}/vexa/saved/${meeting.roomId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSummaryData(data);
                    if (data.summary) setShowSummary(true);
                }
            } catch (err) {
                console.error('Failed to fetch summary:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [meeting, getToken]);

    if (!meeting) return null;
    const summary = summaryData?.summary;

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
                className={cn(
                    "w-full max-w-[600px] rounded-3xl border shadow-2xl relative overflow-hidden transition-all max-h-[90vh] flex flex-col",
                    isDarkMode ? "bg-premium-surface border-white/10 text-white" : "bg-white border-black/5 text-gray-900"
                )}
            >
                <div className="p-8 overflow-y-auto scrollbar-none">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="m-0 font-extrabold text-2xl tracking-tight">Meeting Details</h2>
                        <button onClick={onClose} className="bg-none border-none cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">Title</label>
                            <p className="m-0 text-xl font-black">{meeting.title}</p>
                            <div className="flex gap-4 mt-2 text-[11px] font-bold opacity-40 uppercase tracking-tight">
                                <span className="flex items-center gap-1.5 leading-none"><Calendar size={13} /> {new Date(meeting.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1.5 leading-none"><Clock size={13} /> {new Date(meeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        {/* AI Summary Section */}
                        {loading ? (
                            <div className="p-10 text-center opacity-40 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Loader2 size={24} className="animate-spin mx-auto mb-3" />
                                <div className="text-[10px] font-black uppercase tracking-widest">Synthesizing Notes...</div>
                            </div>
                        ) : summary ? (
                            <div className={cn(
                                "rounded-3xl border transition-all overflow-hidden",
                                isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"
                            )}>
                                <button
                                    onClick={() => setShowSummary(!showSummary)}
                                    className="w-full p-5 flex items-center justify-between bg-transparent border-none cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-3 font-bold text-sm tracking-tight">
                                        <Sparkles size={18} />
                                        <span>AI MEETING SUMMARY</span>
                                    </div>
                                    {showSummary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>

                                <AnimatePresence>
                                    {showSummary && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-5 pt-0 flex flex-col gap-6">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Executive Overview</label>
                                                    <p className="m-0 text-sm leading-relaxed opacity-80">{summary.overview}</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {summary.keyPoints?.length > 0 && (
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Key Discussion Points</label>
                                                            <ul className="m-0 p-0 list-none space-y-2.5">
                                                                {summary.keyPoints.map((p, i) => (
                                                                    <li key={i} className="text-sm opacity-80 flex gap-2.5 leading-snug">
                                                                        <span className="font-bold">•</span> {p}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {summary.actionItems?.length > 0 && (
                                                        <div>
                                                            <ul className="m-0 p-0 list-none space-y-2.5">
                                                                {summary.actionItems.map((p, i) => (
                                                                    <li key={i} className="text-sm opacity-80 flex gap-2.5 leading-snug p-2 rounded-xl bg-black/5 border border-black/10">
                                                                        <span className="font-bold text-black">❑</span> {p}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                {summary.decisions?.length > 0 && (
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-3 block">Key Decisions</label>
                                                        <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {summary.decisions.map((p, i) => (
                                                                <li key={i} className="text-xs font-bold p-3 rounded-xl bg-black/5 border border-black/10 flex gap-2.5 items-center">
                                                                    <span className="font-bold text-black">✓</span> {p}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : null}

                        <div className={cn(
                            "p-5 rounded-3xl border flex flex-col gap-1",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                        )}>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Meeting ID</label>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 text-base font-black tracking-widest text-premium-accent truncate">{meeting.roomId.toUpperCase()}</code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(meeting.roomId)}
                                    className="p-2.5 rounded-xl bg-premium-accent/10 text-premium-accent hover:bg-premium-accent/20 transition-all border-none cursor-pointer"
                                >
                                    <Clipboard size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-2">
                            <PremiumButton
                                icon={Video}
                                className="w-full"
                                onClick={() => navigate(`/preview/${meeting.roomId}`)}
                            >
                                Re-join Meeting
                            </PremiumButton>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};



const Dashboard = ({ onNewMeeting, onSignOut, isDarkMode, setIsDarkMode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewType, setViewType] = useState('grid');
    const [meetings, setMeetings] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recLoading, setRecLoading] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [playingRec, setPlayingRec] = useState(null);
    const { getToken } = useAuth();
    const { user } = useUser();
    const darkMaroon = '#1a0a0a';

    const CACHE_KEY = user ? `meeting_history_${user.id}` : null;
    const CACHE_TTL = 60_000; // 60s — matches server cache

    const fetchHistory = async (showLoading = true) => {
        try {
            if (CACHE_KEY) {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_TTL && showLoading) {
                        setMeetings(data);
                        setLoading(false);
                        fetchHistory(false);
                        return;
                    }
                }
            }
            const token = await getToken();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/meetings/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            const meetings = Array.isArray(data) ? data : [];
            setMeetings(meetings);
            if (CACHE_KEY) localStorage.setItem(CACHE_KEY, JSON.stringify({ data: meetings, ts: Date.now() }));
        } catch (err) {
            console.error('Failed to fetch history:', err);
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
            console.error('Failed to fetch recordings:', err);
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
            console.error('Delete failed:', err);
        }
    };

    const fmtDuration = (s) => s > 0 ? `${Math.floor(s / 60)}m ${s % 60}s` : 'N/A';
    const fmtSize = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${(b / 1e3).toFixed(0)} KB` : `${b} B`;

    useEffect(() => {
        if (!user) return;
        fetchHistory();
        fetchRecordings();
        const interval = setInterval(() => fetchHistory(false), CACHE_TTL);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (activeSection === 'recordings') fetchRecordings();
    }, [activeSection]);

    const filteredMeetings = useMemo(() => {
        return meetings.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || m.roomId?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [meetings, searchQuery]);

    return (
        <div className={cn(
            "h-screen w-screen flex overflow-hidden",
            isDarkMode ? "bg-premium-bg text-white" : "bg-white text-black"
        )}>
            {/* Sidebar with responsive handling */}
            <div className={cn(
                "h-full z-[1001] transition-transform duration-300 flex-shrink-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:static fixed inset-y-0 left-0"
            )}>
                <Sidebar
                    isDarkMode={isDarkMode}
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
                    isDarkMode={isDarkMode}
                    toggleTheme={() => setIsDarkMode(!isDarkMode)}
                    onSignOut={onSignOut}
                    onMenuClick={() => setSidebarOpen(true)}
                />

                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 flex flex-col gap-8">
                    {activeSection === 'recordings' ? (
                        <>
                            <section className="flex justify-between items-center">
                                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter m-0">Recordings</h1>
                                <button
                                    onClick={() => setActiveSection('dashboard')}
                                    className={cn(
                                        "flex items-center px-4 py-2 rounded-xl font-semibold border transition-all active:scale-95",
                                        isDarkMode ? "border-white/10 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"
                                    )}
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
                                            className={cn(
                                                "rounded-2xl overflow-hidden border transition-all hover:translate-y-[-4px]",
                                                isDarkMode ? "bg-white/[0.04] border-white/10" : "bg-gray-50 border-gray-100 shadow-sm"
                                            )}
                                        >
                                            {/* Thumbnail */}
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
                                            {/* Info */}
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
                                                        className={cn(
                                                            "p-2.5 rounded-xl text-black hover:bg-black/10 transition-colors bg-black/5"
                                                        )}
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
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tight m-0">Meetings</h1>

                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
                                            <button
                                                onClick={() => setShowJoin(true)}
                                                className={cn(
                                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer",
                                                    isDarkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-black hover:bg-gray-200"
                                                )}
                                            >
                                                <Link2 size={16} className="text-premium-accent" />
                                                Join Meeting
                                            </button>
                                            <button
                                                onClick={() => setShowSchedule(true)}
                                                className={cn(
                                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border-none cursor-pointer",
                                                    isDarkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-black hover:bg-gray-200"
                                                )}
                                            >
                                                <Calendar size={16} className="text-premium-accent" />
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

                            <section className="flex items-center gap-4">
                                <div className={cn(
                                    "flex-1 max-w-[400px] flex items-center gap-3 px-4 h-11 rounded-xl border transition-shadow focus-within:ring-2 focus-within:ring-premium-accent/40",
                                    isDarkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200 shadow-sm"
                                )}>
                                    <Search size={18} className="opacity-30" />
                                    <input
                                        type="text"
                                        placeholder="Search meetings..."
                                        className="bg-transparent border-none outline-none text-sm w-full font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
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
                                            isDarkMode={isDarkMode}
                                            onShowDetails={() => setSelectedMeeting(meeting)}
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
                {selectedMeeting && (
                    <MeetingDetailModal
                        meeting={selectedMeeting}
                        onClose={() => setSelectedMeeting(null)}
                        isDarkMode={isDarkMode}
                    />
                )}
                {showSchedule && (
                    <ScheduleModal
                        onClose={() => setShowSchedule(false)}
                        isDarkMode={isDarkMode}
                        onScheduled={fetchHistory}
                    />
                )}
                {showJoin && (
                    <JoinModal
                        onClose={() => setShowJoin(false)}
                        isDarkMode={isDarkMode}
                    />
                )}
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
