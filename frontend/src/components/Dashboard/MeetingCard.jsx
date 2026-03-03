import React from 'react';
import { MoreVertical, Calendar, ArrowRight } from 'lucide-react';

const MeetingCard = ({ meeting, isDarkMode, onShowDetails }) => {
    const { title, participants, createdAt, roomId, hasNotes } = meeting;

    const styles = {
        card: {
            flex: 1,
            minWidth: '320px',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            boxShadow: isDarkMode ? 'none' : '0 4px 12px rgba(0,0,0,0.02)',
            position: 'relative',
            overflow: 'hidden'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
        },
        title: {
            fontSize: '1rem',
            fontWeight: '700',
            color: isDarkMode ? '#ffffff' : '#000000',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '220px'
        },
        dateGroup: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#666',
            fontWeight: '500'
        },
        participantsSection: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.5rem'
        },
        avatarStack: {
            display: 'flex',
            alignItems: 'center'
        },
        avatar: {
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: `2px solid ${isDarkMode ? '#000000' : '#fff'}`,
            marginLeft: '-8px',
            backgroundColor: isDarkMode ? '#333' : '#eee',
            objectFit: 'cover'
        },
        participantCount: {
            fontSize: '0.75rem',
            fontWeight: '700',
            color: isDarkMode ? '#fff' : '#000',
            marginLeft: '0.5rem'
        },
        footerBadge: {
            fontSize: '0.65rem',
            fontWeight: '800',
            padding: '4px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
            color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#888'
        },
        detailsBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#ef4444',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background 0.2s',
            '&:hover': {
                background: isDarkMode ? 'rgba(229, 62, 62, 0.1)' : 'rgba(229, 62, 62, 0.05)'
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div style={styles.card} onClick={onShowDetails}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>{title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={styles.dateGroup}>
                            <Calendar size={12} />
                            <span>{formatDate(createdAt)}</span>
                        </div>
                        {hasNotes && (
                            <div style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                fontSize: '8px',
                                fontWeight: 900,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                letterSpacing: '0.05em'
                            }}>
                                <span style={{ fontSize: '10px' }}>✦</span> AI NOTES
                            </div>
                        )}
                    </div>
                </div>
                <MoreVertical size={18} style={{ color: isDarkMode ? 'rgba(255,255,255,0.2)' : '#ccc' }} />
            </div>

            <div style={styles.participantsSection}>
                <div style={styles.avatarStack}>
                    {participants.slice(0, 3).map((p, idx) => (
                        <img
                            key={idx}
                            src={p.avatar || 'https://via.placeholder.com/30'}
                            alt={p.name}
                            style={{ ...styles.avatar, marginLeft: idx === 0 ? 0 : '-8px' }}
                            title={p.name}
                        />
                    ))}
                    {participants.length > 3 && (
                        <div style={{ ...styles.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#888' }}>
                            +{participants.length - 3}
                        </div>
                    )}
                    <span style={styles.participantCount}>{participants.length} joined</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span style={styles.footerBadge}>ID: {roomId?.substring(0, 8)}</span>
                <button
                    style={styles.detailsBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        onShowDetails();
                    }}
                >
                    <span>Details</span>
                    <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default MeetingCard;
