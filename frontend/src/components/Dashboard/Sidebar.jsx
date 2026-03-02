import React from 'react';
import { Home, Users, BarChart2, Book, Settings, Layers, Box, LayoutGrid } from 'lucide-react';

const Sidebar = ({ isDarkMode }) => {
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
        { icon: LayoutGrid, active: true },
        { icon: Users },
        { icon: Layers },
        { icon: BarChart2 },
        { icon: Book },
        { icon: Box }
    ];

    return (
        <aside style={styles.sidebar}>
            <Home size={22} style={{ color: isDarkMode ? '#fff' : '#000', marginBottom: '2rem' }} />

            <div style={styles.iconGroup}>
                {menuItems.map((item, idx) => (
                    <div
                        key={idx}
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
                <Settings size={20} style={styles.iconWrapper} />
            </div>
        </aside>
    );
};

export default Sidebar;
