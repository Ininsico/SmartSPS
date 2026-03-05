import React from 'react';
import { Home, LayoutGrid, Calendar, Video } from 'lucide-react';

const Sidebar = ({ onScheduleClick, onRecordingsClick, onHomeClick, activeSection }) => {
    const styles = {
        sidebar: {
            width: '64px',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '1.5rem 0',
            gap: '2rem',
            transition: 'all 0.3s ease'
        },
        iconGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
        },
        iconWrapper: {
            color: '#aaa',
            cursor: 'pointer',
            padding: '0.6rem',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        activeIcon: {
            color: '#ffffff',
            backgroundColor: '#000000',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
        }
    };

    const menuItems = [
        { icon: LayoutGrid, id: 'dashboard', active: activeSection === 'dashboard' || !activeSection, title: 'Dashboard', onClick: onHomeClick },
        { icon: Calendar, id: 'schedule', title: 'Schedule Meeting', onClick: onScheduleClick },
        { icon: Video, id: 'recordings', active: activeSection === 'recordings', title: 'Recordings', onClick: onRecordingsClick },
    ];

    return (
        <aside style={styles.sidebar}>
            <Home size={22} onClick={onHomeClick} style={{ color: '#000', marginBottom: '2rem', cursor: 'pointer' }} title="Home" />

            <div style={styles.iconGroup}>
                {menuItems.map((item, idx) => (
                    <div
                        key={idx}
                        title={item.title}
                        onClick={item.onClick}
                        style={{
                            ...styles.iconWrapper,
                            ...(item.active ? styles.activeIcon : {})
                        }}
                    >
                        <item.icon size={20} />
                    </div>
                ))}
            </div>

            <div style={{ marginTop: 'auto' }}>
            </div>
        </aside>
    );
};

export default Sidebar;
