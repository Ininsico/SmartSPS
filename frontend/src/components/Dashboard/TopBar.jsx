import React from 'react';
import { Search, Bell, HelpCircle, ChevronRight, MessageSquare, Zap, Sun, Moon, LogOut } from 'lucide-react';

const TopBar = ({ isDarkMode, toggleTheme, onSignOut }) => {
    const darkMaroon = '#1a0a0a';

    const styles = {
        header: {
            height: '60px',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            backgroundColor: isDarkMode ? darkMaroon : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            transition: 'all 0.3s ease'
        },
        left: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.85rem'
        },
        breadcrumb: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#666',
            fontWeight: '500'
        },
        orgName: {
            color: isDarkMode ? '#fff' : '#000',
            fontWeight: '700'
        },
        center: {
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            maxWidth: '600px'
        },
        searchWrapper: {
            position: 'relative',
            width: '100%',
            maxWidth: '350px'
        },
        searchInput: {
            width: '100%',
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}`,
            borderRadius: '8px',
            padding: '0.5rem 1rem 0.5rem 2.5rem',
            color: isDarkMode ? '#fff' : '#000',
            fontSize: '0.85rem',
            outline: 'none',
            fontFamily: 'inherit'
        },
        searchIcon: {
            position: 'absolute',
            left: '0.8rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: isDarkMode ? 'rgba(255,255,255,0.3)' : '#aaa'
        },
        right: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        },
        actionIcon: {
            color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#666',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        signOutBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : '#eee'}`,
            backgroundColor: 'transparent',
            color: isDarkMode ? '#fff' : '#000',
            fontSize: '0.8rem',
            fontWeight: '700',
            cursor: 'pointer',
            marginLeft: '0.5rem',
            transition: 'all 0.2s'
        }
    };

    return (
        <header style={styles.header}>
            <div style={styles.left}>
                <Zap size={18} fill={isDarkMode ? "#fff" : "#000"} />
                <div style={styles.breadcrumb}>
                    <span>smartMeet</span>
                    <ChevronRight size={14} />
                    <span style={styles.orgName}>Workspace</span>
                </div>
            </div>

            <div style={styles.center}>
                <div style={styles.searchWrapper}>
                    <Search size={16} style={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        style={styles.searchInput}
                    />
                </div>
            </div>

            <div style={styles.right}>
                <div style={styles.actionIcon} onClick={toggleTheme} title="Toggle Theme">
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </div>
                <div style={styles.actionIcon}>
                    <HelpCircle size={18} />
                </div>
                <div style={styles.actionIcon}>
                    <Bell size={18} />
                </div>
                <button style={styles.signOutBtn} onClick={onSignOut}>
                    <LogOut size={16} />
                    <span>Sign out</span>
                </button>
            </div>
        </header>
    );
};

export default TopBar;
