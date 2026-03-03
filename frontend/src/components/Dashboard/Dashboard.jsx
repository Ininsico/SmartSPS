import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, CalendarOff, Loader2, X, Clipboard, ExternalLink, Users as UsersIcon } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MeetingCard from './MeetingCard';
import PremiumButton from '../../PremiumButton';
import { useAuth, useUser } from '@clerk/clerk-react';

const MeetingDetailModal = ({ meeting, onClose, isDarkMode }) => {
    if (!meeting) return null;
    const darkMaroon = '#1a0a0a';
    const bg = isDarkMode ? '#1e1a1a' : '#fff';
    const tc = isDarkMode ? '#fff' : '#000';
    const sc = isDarkMode ? '#888' : '#666';
    const bc = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} style={{ background: bg, width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '2rem', border: `1px solid ${bc}`, color: tc, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-1px' }}>Meeting Details</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sc }}><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>Title</label>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{meeting.title}</p>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>Room ID</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f7', padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${bc}` }}>
                            <code style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>{meeting.roomId}</code>
                            <button onClick={() => navigator.clipboard.writeText(meeting.roomId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sc }} title="Copy ID"><Clipboard size={18} /></button>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: sc, letterSpacing: '1px', display: 'block', marginBottom: '0.4rem' }}>Participants ({meeting.participants.length})</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {meeting.participants.map((p, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <img src={p.avatar || 'https://via.placeholder.com/30'} alt={p.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                        <PremiumButton icon={ExternalLink} style={{ width: '100%' }} onClick={() => window.location.href = `?room=${meeting.roomId}`}>
                            Re-join Meeting
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

    const { getToken } = useAuth();
    const { user } = useUser();
    const darkMaroon = '#1a0a0a';

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = await getToken();
                const response = await fetch(`${import.meta.env.VITE_API_URL}/meetings/history`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                setMeetings(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchHistory();
    }, [user, getToken]);

    useEffect(() => {
        document.body.style.backgroundColor = isDarkMode ? darkMaroon : '#ffffff';
        return () => { document.body.style.backgroundColor = '#ffffff'; };
    }, [isDarkMode]);

    const filteredMeetings = useMemo(() => {
        return meetings.filter(m =>
            m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.roomId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [meetings, searchQuery]);

    const styles = {
        container: { height: '100vh', width: '100vw', display: 'flex', backgroundColor: isDarkMode ? darkMaroon : '#ffffff', color: isDarkMode ? '#ffffff' : '#000000', fontFamily: "'Montserrat', sans-serif", overflow: 'hidden', transition: 'background-color 0.3s ease' },
        mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        scrollArea: { flex: 1, overflowY: 'auto', padding: '2.5rem 3.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' },
        emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem', color: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ccc' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }
    };

    return (
        <div style={styles.container}>
            <Sidebar isDarkMode={isDarkMode} />
            <div style={styles.mainContent}>
                <TopBar isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} onSignOut={onSignOut} />
                <div style={styles.scrollArea}>
                    <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: '800', letterSpacing: '-1.5px', margin: 0 }}>Meetings</h1>
                        <PremiumButton variant="primary" icon={Plus} onClick={onNewMeeting} style={{ height: '42px', padding: '0 1.25rem', fontSize: '0.85rem' }}>
                            New meeting
                        </PremiumButton>
                    </section>
                    <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fcfcfc', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}`, borderRadius: '8px', padding: '0 0.75rem', height: '40px', width: '300px' }}>
                                <Search size={16} color={isDarkMode ? "rgba(255,255,255,0.2)" : "#ccc"} />
                                <input type="text" placeholder="Search meetings..." style={{ backgroundColor: 'transparent', border: 'none', color: 'inherit', fontSize: '0.85rem', padding: '0.5rem', width: '100%', outline: 'none' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}` }}>
                            <button onClick={() => setViewType('grid')} style={{ padding: '0 0.85rem', height: '40px', border: 'none', cursor: 'pointer', backgroundColor: viewType === 'grid' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5') : 'transparent', color: isDarkMode ? '#fff' : '#000' }}>
                                <LayoutGrid size={16} />
                            </button>
                            <button onClick={() => setViewType('list')} style={{ padding: '0 0.85rem', height: '40px', border: 'none', cursor: 'pointer', backgroundColor: viewType === 'list' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5') : 'transparent', color: isDarkMode ? '#fff' : '#000' }}>
                                <List size={16} />
                            </button>
                        </div>
                    </section>
                    {loading ? (
                        <div style={styles.emptyState}>
                            <Loader2 size={40} className="animate-spin" />
                            <p>Fetching your universe...</p>
                        </div>
                    ) : filteredMeetings.length === 0 ? (
                        <div style={styles.emptyState}>
                            <CalendarOff size={48} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: isDarkMode ? '#fff' : '#000' }}>{searchQuery ? 'No matching meetings' : 'No meetings found'}</h2>
                            <p>{searchQuery ? 'Try a different search term.' : 'Your history is looking a bit empty. Start a new meeting to fill it up!'}</p>
                        </div>
                    ) : (
                        <section style={styles.grid}>
                            {filteredMeetings.map((meeting) => (
                                <MeetingCard key={meeting._id} meeting={meeting} isDarkMode={isDarkMode} onShowDetails={() => setSelectedMeeting(meeting)} />
                            ))}
                        </section>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {selectedMeeting && <MeetingDetailModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} isDarkMode={isDarkMode} />}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
