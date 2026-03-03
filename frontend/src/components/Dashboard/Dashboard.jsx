import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, CalendarOff, Loader2, X, Clipboard, ExternalLink, Calendar, Clock, ArrowRight, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MeetingCard from './MeetingCard';
import PremiumButton from '../../PremiumButton';
import { useAuth, useUser } from '@clerk/clerk-react';

const ScheduleModal = ({ onClose, isDarkMode, onScheduled }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const { getToken } = useAuth();
    const darkMaroon = '#1a0a0a';
    const bg = isDarkMode ? '#1e1a1a' : '#fff';
    const tc = isDarkMode ? '#fff' : '#000';
    const bc = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} style={{ background: bg, width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '2rem', border: `1px solid ${bc}`, color: tc }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem' }}>Schedule Meeting</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc }}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>Meeting Title</label>
                        <input required type="text" placeholder="Strategy Session" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${bc}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9f9f9', color: tc, outline: 'none' }} value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="schedule-row">
                        <div className="schedule-col">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>Date</label>
                            <input required type="date" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${bc}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9f9f9', color: tc, outline: 'none' }} value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="schedule-col">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 700 }}>Time</label>
                            <input required type="time" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${bc}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9f9f9', color: tc, outline: 'none' }} value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>
                    <PremiumButton type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }} icon={Calendar}>
                        {loading ? 'Scheduling...' : 'Confirm Schedule'}
                    </PremiumButton>
                </form>
            </motion.div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .schedule-row { display: flex; gap: 1rem; }
                .schedule-col { flex: 1; }
                @media (max-width: 480px) {
                    .schedule-row { flex-direction: column; }
                }
            ` }} />
        </motion.div>
    );
};

const MeetingDetailModal = ({ meeting, onClose, isDarkMode }) => {
    if (!meeting) return null;
    const bg = isDarkMode ? '#1e1a1a' : '#fff';
    const tc = isDarkMode ? '#fff' : '#000';
    const sc = isDarkMode ? '#888' : '#666';
    const bc = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} style={{ background: bg, width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '2rem', border: `1px solid ${bc}`, color: tc, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem' }}>Meeting Details</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sc }}><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>Title</label>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{meeting.title}</p>
                    </div>
                    {meeting.status === 'scheduled' && (
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>Scheduled For</label>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#e53e3e' }}>{new Date(meeting.scheduleTime).toLocaleString()}</p>
                        </div>
                    )}
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>Room ID</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f7', padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${bc}` }}>
                            <code style={{ fontSize: '1rem', fontWeight: 700, flex: 1, wordBreak: 'break-all' }}>{meeting.roomId}</code>
                            <button onClick={() => navigator.clipboard.writeText(meeting.roomId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sc }}><Clipboard size={18} /></button>
                        </div>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                        <PremiumButton icon={ExternalLink} style={{ width: '100%' }} onClick={() => window.location.href = `?room=${meeting.roomId}`}>
                            {meeting.status === 'scheduled' ? 'Start Meeting Now' : 'Re-join Meeting'}
                        </PremiumButton>
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
    const [loading, setLoading] = useState(true);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [showSchedule, setShowSchedule] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { getToken } = useAuth();
    const { user } = useUser();
    const darkMaroon = '#1a0a0a';

    const CACHE_KEY = user ? `meeting_history_${user.id}` : null;
    const CACHE_TTL = 60_000; // 60s — matches server cache

    const fetchHistory = async (showLoading = true) => {
        try {
            // Serve stale cache instantly while re-fetching
            if (CACHE_KEY) {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, ts } = JSON.parse(cached);
                    if (Date.now() - ts < CACHE_TTL && showLoading) {
                        setMeetings(data);
                        setLoading(false);
                        // Still refresh in background (stale-while-revalidate)
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

            // Write to local cache
            if (CACHE_KEY) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ data: meetings, ts: Date.now() }));
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchHistory();
        // Refresh every 60s while dashboard is open
        const interval = setInterval(() => fetchHistory(false), CACHE_TTL);
        return () => clearInterval(interval);
    }, [user]);

    const filteredMeetings = useMemo(() => {
        return meetings.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()) || m.roomId?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [meetings, searchQuery]);

    return (
        <div className="dashboard-root">
            <div className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}>
                <Sidebar isDarkMode={isDarkMode} onScheduleClick={() => { setShowSchedule(true); setSidebarOpen(false); }} />
            </div>
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
            <div className="main-content">
                <TopBar isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} onSignOut={onSignOut} onMenuClick={() => setSidebarOpen(true)} />
                <div className="scroll-area">
                    <section className="section-header">
                        <h1 className="title">Meetings</h1>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <PremiumButton variant="secondary" icon={Calendar} onClick={() => setShowSchedule(true)} className="hide-mobile">
                                Schedule
                            </PremiumButton>
                            <PremiumButton variant="primary" icon={Plus} onClick={onNewMeeting}>
                                New
                            </PremiumButton>
                        </div>
                    </section>
                    <section className="filters-section">
                        <div className="search-box">
                            <Search size={16} color={isDarkMode ? "rgba(255,255,255,0.2)" : "#ccc"} />
                            <input type="text" placeholder="Search meetings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </section>
                    {loading ? (
                        <div className="empty-state">
                            <Loader2 size={40} className="animate-spin" />
                            <p>Fetching your universe...</p>
                        </div>
                    ) : filteredMeetings.length === 0 ? (
                        <div className="empty-state">
                            <CalendarOff size={48} />
                            <h2>No meetings found</h2>
                        </div>
                    ) : (
                        <div className={`meetings-grid ${viewType}`}>
                            {filteredMeetings.map((meeting) => (
                                <MeetingCard key={meeting._id} meeting={meeting} isDarkMode={isDarkMode} onShowDetails={() => setSelectedMeeting(meeting)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {selectedMeeting && <MeetingDetailModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} isDarkMode={isDarkMode} />}
                {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} isDarkMode={isDarkMode} onScheduled={fetchHistory} />}
            </AnimatePresence>
            <style dangerouslySetInnerHTML={{
                __html: `
                .dashboard-root { height: 100vh; width: 100vw; display: flex; background: ${isDarkMode ? darkMaroon : '#ffffff'}; color: ${isDarkMode ? '#fff' : '#000'}; overflow: hidden; }
                .sidebar-container { height: 100%; z-index: 1001; transition: transform 0.3s ease; flex-shrink: 0; }
                .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
                .scroll-area { flex: 1; overflow-y: auto; padding: 2.5rem 3.5rem; display: flex; flex-direction: column; gap: 2.5rem; }
                .section-header { display: flex; justify-content: space-between; align-items: center; }
                .title { font-size: 2.25rem; font-weight: 800; letter-spacing: -1.5px; margin: 0; }
                .filters-section { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
                .search-box { display: flex; align-items: center; background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#fcfcfc'}; border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}; border-radius: 8px; padding: 0 0.75rem; height: 40px; width: 300px; }
                .search-box input { background: transparent; border: none; color: inherit; font-size: 0.85rem; padding: 0.5rem; width: 100%; outline: none; }
                .meetings-grid { display: grid; gap: 1.5rem; }
                .meetings-grid.grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
                .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; gap: 1rem; opacity: 0.4; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @media (max-width: 768px) {
                    .hide-mobile { display: none !important; }
                    .sidebar-container { position: fixed; transform: translateX(-100%); left: 0; top: 0; }
                    .sidebar-container.open { transform: translateX(0); }
                    .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; }
                    .scroll-area { padding: 1.5rem 1rem; gap: 1.5rem; }
                    .title { font-size: 1.75rem; }
                    .search-box { width: 100%; }
                }
            ` }} />
        </div>
    );
};

export default Dashboard;
