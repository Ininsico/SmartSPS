import React from 'react';
import { MoreVertical, Calendar, ArrowRight, Clock } from 'lucide-react';

const MeetingCard = ({ meeting, onShowDetails }) => {
    const { title, participants, createdAt, roomId, hasNotes } = meeting;

    const styles = {
        card: {
            flex: 1,
            minWidth: '320px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
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
            color: '#000000',
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
            color: '#666',
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
            border: '2px solid #fff',
            marginLeft: '-8px',
            backgroundColor: '#eee',
            objectFit: 'cover'
        },
        participantCount: {
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#000',
            marginLeft: '0.5rem'
        },
        footerBadge: {
            fontSize: '0.65rem',
            fontWeight: '800',
            padding: '4px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            backgroundColor: '#f5f5f5',
            color: '#888'
        },
        detailsBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#000',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background 0.2s'
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const isLive = meeting.status === 'active';

    return (
        <div style={styles.card} onClick={onShowDetails}>
            <div style={styles.header}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={styles.title}>{title}</h3>
                        {isLive && (
                            <div style={{
                                backgroundColor: '#000',
                                color: '#fff',
                                fontSize: '8px',
                                fontWeight: 900,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                animation: 'pulse 2s infinite'
                            }}>
                                • LIVE
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={styles.dateGroup}>
                            <Calendar size={12} />
                            <span>{formatDate(createdAt)}</span>
                        </div>
                        {(() => {
                            const start = meeting.startTime ? new Date(meeting.startTime) : new Date(createdAt);
                            const end = meeting.endTime ? new Date(meeting.endTime) : null;
                            if (!end) return null;
                            const diffSec = Math.floor((end - start) / 1000);
                            if (diffSec <= 0) return null;
                            const m = Math.floor(diffSec / 60);
                            const s = diffSec % 60;
                            const dur = m > 0 ? `${m}m ${s}s` : `${s}s`;
                            return (
                                <div style={{ ...styles.dateGroup, color: '#999', marginLeft: '4px' }}>
                                    <Clock size={12} />
                                    <span>{dur}</span>
                                </div>
                            );
                        })()}
                        {hasNotes && (
                            <div style={{
                                backgroundColor: '#000',
                                color: '#fff',
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
                <MoreVertical size={18} style={{ color: '#ccc' }} />
            </div>

            <div style={styles.participantsSection}>
                <div style={styles.avatarStack}>
                    {(participants || []).slice(0, 3).map((p, idx) => (
                        <img
                            key={idx}
                            src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}&background=random`}
                            alt={p.name}
                            style={{ ...styles.avatar, marginLeft: idx === 0 ? 0 : '-8px' }}
                            title={p.name}
                        />
                    ))}
                    {(participants?.length || 0) > 3 && (
                        <div style={{ ...styles.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: '#000', backgroundColor: '#f0f0f0' }}>
                            +{(participants.length - 3)}
                        </div>
                    )}
                    <span style={styles.participantCount}>{participants?.length || 0} joined</span>
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
