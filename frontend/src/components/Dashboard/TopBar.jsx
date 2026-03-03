import React from 'react';
import { Search, Bell, HelpCircle, ChevronRight, Zap, Sun, Moon, LogOut, Menu } from 'lucide-react';

const TopBar = ({ isDarkMode, toggleTheme, onSignOut, onMenuClick }) => {
    const darkMaroon = '#000000';
    const bc = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    return (
        <header className="topbar">
            <div className="left-section">
                <button className="menu-btn" onClick={onMenuClick}><Menu size={20} /></button>
                <Zap size={18} fill="currentColor" className="opacity-80" />
                <div className="breadcrumb">
                    <span>smartMeet</span>
                    <ChevronRight size={14} className="hide-mobile" />
                    <span className="org-name hide-mobile">Workspace</span>
                </div>
            </div>
            <div className="center-section">
                <div className="search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input type="text" placeholder="Search meetings..." />
                </div>
            </div>
            <div className="right-section">
                <button className="icon-btn" onClick={toggleTheme}><Sun size={18} className={isDarkMode ? '' : 'hidden'} /><Moon size={18} className={isDarkMode ? 'hidden' : ''} /></button>
                <button className="icon-btn hide-tablet"><Bell size={18} /></button>
                <button className="signout-btn" onClick={onSignOut}><LogOut size={16} /><span>Sign out</span></button>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .topbar { height: 60px; border-bottom: 1px solid ${bc}; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; background: ${isDarkMode ? darkMaroon : '#fff'}; color: ${isDarkMode ? '#fff' : '#000'}; z-index: 100; }
                .left-section { display: flex; align-items: center; gap: 0.75rem; }
                .menu-btn { display: none; background: none; border: none; cursor: pointer; color: inherit; padding: 4px; }
                .breadcrumb { display: flex; align-items: center; gap: 0.5rem; color: ${isDarkMode ? 'rgba(255,255,255,0.5)' : '#666'}; font-weight: 500; font-size: 0.85rem; }
                .org-name { color: ${isDarkMode ? '#fff' : '#000'}; font-weight: 700; }
                .center-section { flex: 1; display: flex; justify-content: center; max-width: 400px; padding: 0 1rem; }
                .search-wrapper { position: relative; width: 100%; }
                .search-wrapper input { width: 100%; background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5'}; border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#eee'}; border-radius: 8px; padding: 0.5rem 1rem 0.5rem 2.5rem; color: inherit; font-size: 0.85rem; outline: none; }
                .search-icon { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); opacity: 0.3; }
                .right-section { display: flex; align-items: center; gap: 0.5rem; }
                .icon-btn { background: none; border: none; cursor: pointer; color: inherit; padding: 8px; border-radius: 8px; display: flex; }
                .hidden { display: none; }
                .signout-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; border-radius: 8px; border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.2)' : '#eee'}; background: transparent; color: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }
                @media (max-width: 768px) {
                    .topbar { padding: 0 1rem; }
                    .menu-btn { display: block; }
                    .center-section { display: none; }
                    .hide-mobile { display: none; }
                    .signout-btn span { display: none; }
                    .signout-btn { padding: 0.5rem; }
                }
                @media (max-width: 1024px) {
                    .hide-tablet { display: none; }
                }
            ` }} />
        </header>
    );
};

export default TopBar;
