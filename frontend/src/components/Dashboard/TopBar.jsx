import React, { useRef, useState } from 'react';
import { Search, Bell, ChevronRight, Zap, LogOut, Menu, Loader2, Camera } from 'lucide-react';
import { useAuthContext } from '../../AuthContext';
import { cn } from '../../utils';

const TopBar = ({ onSignOut, onMenuClick, searchQuery, setSearchQuery }) => {
    const { user, setUser, getToken } = useAuthContext();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const bc = 'rgba(0,0,0,0.05)';

    const userAvatar = user?.avatar || '/defaultpic.png';
    const userName = user?.name || 'User';

    const handleAvatarClick = () => {
        if (!uploading) fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append('avatar', file);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/profile`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const refreshedUser = await res.json();
                setUser(refreshedUser);
            } else {
                const errData = await res.json();
                console.error('Upload failed:', errData.error);
            }
        } catch (err) {
            console.error('Error uploading avatar:', err);
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };
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
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="right-section">
                <button className="icon-btn hide-tablet"><Bell size={18} /></button>
                <div className="user-profile hide-mobile">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <div className="avatar-container" onClick={handleAvatarClick}>
                        <img src={userAvatar} alt={userName} className={cn("user-avatar", uploading && "opacity-40 animate-pulse")} />
                        {uploading ? (
                            <Loader2 className="avatar-loader animate-spin" size={14} />
                        ) : (
                            <div className="avatar-overlay">
                                <Camera size={12} className="text-white" />
                            </div>
                        )}
                    </div>
                    <span className="user-name">{userName}</span>
                </div>
                <button className="signout-btn" onClick={onSignOut}><LogOut size={16} /><span>Sign out</span></button>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .topbar { height: 60px; border-bottom: 1px solid ${bc}; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; background: #fff; color: #000; z-index: 100; }
                .left-section { display: flex; align-items: center; gap: 0.75rem; }
                .menu-btn { display: none; background: none; border: none; cursor: pointer; color: inherit; padding: 4px; }
                .breadcrumb { display: flex; align-items: center; gap: 0.5rem; color: #666; font-weight: 500; font-size: 0.85rem; }
                .org-name { color: #000; font-weight: 700; }
                .center-section { flex: 1; display: flex; justify-content: center; max-width: 400px; padding: 0 1rem; }
                .search-wrapper { position: relative; width: 100%; }
                .search-wrapper input { width: 100%; background: #f5f5f5; border: 1px solid #eee; border-radius: 8px; padding: 0.5rem 1rem 0.5rem 2.5rem; color: inherit; font-size: 0.85rem; outline: none; }
                .search-icon { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); opacity: 0.3; }
                .right-section { display: flex; align-items: center; gap: 0.5rem; }
                .icon-btn { background: none; border: none; cursor: pointer; color: inherit; padding: 8px; border-radius: 8px; display: flex; }
                .hidden { display: none; }
                .signout-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.85rem; border-radius: 8px; border: 1px solid #eee; background: transparent; color: inherit; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .signout-btn:hover { background: #fef2f2; border-color: #fee2e2; color: #dc2626; }
                .user-profile { display: flex; align-items: center; gap: 0.75rem; padding: 0 0.5rem; margin-right: 0.5rem; border-right: 1px solid ${bc}; }
                .avatar-container { position: relative; width: 32px; height: 32px; cursor: pointer; border-radius: 50%; overflow: hidden; }
                .user-avatar { width: 100%; height: 100%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.3s; }
                .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
                .avatar-container:hover .avatar-overlay { opacity: 1; }
                .avatar-loader { position: absolute; inset: 0; margin: auto; color: #000; }
                .user-name { font-size: 0.85rem; font-weight: 800; color: #000; letter-spacing: -0.01em; }
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
