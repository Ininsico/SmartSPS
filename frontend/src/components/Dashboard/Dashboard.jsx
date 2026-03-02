import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronDown, LayoutGrid, List, Sun, Moon, CalendarOff, Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MeetingCard from './MeetingCard';
import PremiumButton from '../../PremiumButton';
import { useAuth, useUser } from '@clerk/clerk-react';

const Dashboard = ({ onNewMeeting, onSignOut, isDarkMode, setIsDarkMode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewType, setViewType] = useState('grid');
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

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
        return () => {
            document.body.style.backgroundColor = '#ffffff';
        };
    }, [isDarkMode]);

    const styles = {
        container: {
            height: '100vh',
            width: '100vw',
            display: 'flex',
            backgroundColor: isDarkMode ? darkMaroon : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            fontFamily: "'Montserrat', sans-serif",
            overflow: 'hidden',
            transition: 'background-color 0.3s ease'
        },
        mainContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        },
        scrollArea: {
            flex: 1,
            overflowY: 'auto',
            padding: '2.5rem 3.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem'
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            gap: '1rem',
            color: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ccc'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
        }
    };

    return (
        <div style={styles.container}>
            <Sidebar isDarkMode={isDarkMode} />

            <div style={styles.mainContent}>
                <TopBar
                    isDarkMode={isDarkMode}
                    toggleTheme={() => setIsDarkMode(!isDarkMode)}
                    onSignOut={onSignOut}
                />

                <div style={styles.scrollArea}>
                    <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: '800', letterSpacing: '-1.5px', margin: 0 }}>Meetings</h1>
                        <PremiumButton
                            variant="primary"
                            icon={Plus}
                            onClick={onNewMeeting}
                            style={{ height: '42px', padding: '0 1.25rem', fontSize: '0.85rem' }}
                        >
                            New meeting
                        </PremiumButton>
                    </section>

                    <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fcfcfc',
                                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}`,
                                borderRadius: '8px',
                                padding: '0 0.75rem',
                                height: '40px',
                                width: '300px'
                            }}>
                                <Search size={16} color={isDarkMode ? "rgba(255,255,255,0.2)" : "#ccc"} />
                                <input
                                    type="text"
                                    placeholder="Search and filter..."
                                    style={{ backgroundColor: 'transparent', border: 'none', color: 'inherit', fontSize: '0.85rem', padding: '0.5rem', width: '100%', outline: 'none' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}` }}>
                            <button
                                onClick={() => setViewType('grid')}
                                style={{ padding: '0 0.85rem', height: '40px', border: 'none', cursor: 'pointer', backgroundColor: viewType === 'grid' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5') : 'transparent', color: isDarkMode ? '#fff' : '#000' }}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewType('list')}
                                style={{ padding: '0 0.85rem', height: '40px', border: 'none', cursor: 'pointer', backgroundColor: viewType === 'list' ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5') : 'transparent', color: isDarkMode ? '#fff' : '#000' }}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </section>

                    {loading ? (
                        <div style={styles.emptyState}>
                            <Loader2 size={40} className="animate-spin" />
                            <p>Fetching your universe...</p>
                        </div>
                    ) : meetings.length === 0 ? (
                        <div style={styles.emptyState}>
                            <CalendarOff size={48} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: isDarkMode ? '#fff' : '#000' }}>No meetings found</h2>
                            <p>Your history is looking a bit empty. Start a new meeting to fill it up!</p>
                        </div>
                    ) : (
                        <section style={styles.grid}>
                            {meetings.map((meeting) => (
                                <MeetingCard
                                    key={meeting._id}
                                    meeting={meeting}
                                    isDarkMode={isDarkMode}
                                />
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
