import React from 'react';
import { Home, LayoutGrid, Calendar, History, Settings, Video } from 'lucide-react';

const Sidebar = ({ isDarkMode, onScheduleClick, onRecordingsClick, onHomeClick, activeSection }) => {
    const darkMaroon = '#1a0a0a';

    const styles = {
        sidebar: {
            width: '64px',
            height: '100%',
            backgroundColor: isDarkMode ? darkMaroon : '#ffffff',
            borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
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
            color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#aaa',
            cursor: 'pointer',
            padding: '0.6rem',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        activeIcon: {
            color: isDarkMode ? '#fff' : '#000',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5'
        }
    };

    const menuItems = [
        { icon: LayoutGrid, id: 'dashboard', active: activeSection === 'dashboard' || !activeSection, title: 'Dashboard', onClick: onHomeClick },
        { icon: Calendar, id: 'schedule', title: 'Schedule Meeting', onClick: onScheduleClick },
        { icon: Video, id: 'recordings', active: activeSection === 'recordings', title: 'Recordings', onClick: onRecordingsClick },
        { icon: History, id: 'history', title: 'History' },
    ];

    return (
        <aside style={styles.sidebar}>
            <Home size={22} onClick={onHomeClick} style={{ color: isDarkMode ? '#fff' : '#000', marginBottom: '2rem', cursor: 'pointer' }} title="Home" />

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
                <Settings size={20} style={styles.iconWrapper} title="Settings" />
            </div>
        </aside>
    );
};

export default Sidebar;
