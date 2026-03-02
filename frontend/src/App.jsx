import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import MeetingRoom from './MeetingRoom';
import LoginPage from './LoginPage';
import PreJoinScreen from './components/PreJoinScreen';
import { SignedIn, SignedOut, useUser, useClerk } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import ErrorBoundary from './ErrorBoundary';
import NotFoundPage from './NotFoundPage';
import Dashboard from './components/Dashboard/Dashboard';
import { mediaManager } from './mediaManager';

function App() {
  const [view, setView] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mediaConfig, setMediaConfig] = useState({ micOn: true, videoOn: true });

  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  // ── ONE TIME: Read room from URL on initial load ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      // Will be routed correctly once isLoaded resolves
    }
  }, []); // runs ONCE on mount only

  // ── ONGOING: React to auth state changes ───────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');

    if (roomFromUrl && view !== 'meeting' && view !== 'preview') {
      // Only redirect to preview if we're NOT already in or past the meeting
      if (isSignedIn) {
        setView('preview');
      } else {
        setView('login');
      }
    } else if (isSignedIn && (view === 'landing' || view === 'login')) {
      setView('dashboard');
    } else if (!isSignedIn && (view === 'dashboard' || view === 'meeting' || view === 'preview')) {
      setView('landing');
    }
  }, [isSignedIn, isLoaded]); // ← NO 'view' dependency — prevents re-triggering on every step

  // ── GLOBAL CAMERA KILLSWITCH ────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'meeting' && view !== 'preview') {
      mediaManager.killAll();
    }
  }, [view]);

  const navigateToLogin = () => setView('login');

  const handleStartMeeting = () => {
    if (!isSignedIn) {
      setView('login');
    } else {
      const id = Math.random().toString(36).substring(7);
      setRoomId(id);
      window.history.replaceState({}, '', `?room=${id}`);
      setView('preview');
    }
  };

  const handleJoinAttempt = (id) => {
    setRoomId(id);
    if (!isSignedIn) {
      setView('login');
    } else {
      window.history.replaceState({}, '', `?room=${id}`);
      setView('preview');
    }
  };

  const enterMeeting = (config) => {
    setMediaConfig(config);
    setView('meeting');
  };

  const handleLeave = () => {
    setView(isSignedIn ? 'dashboard' : 'landing');
    setRoomId('');
    window.history.pushState({}, '', '/');
  };

  if (!isLoaded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem' }}>smartMeet</span>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-root">
        {view === '404' && <NotFoundPage />}

        {view !== '404' && (
          <>
            <SignedIn>
              {view === 'meeting' ? (
                <MeetingRoom
                  roomId={roomId}
                  onLeave={handleLeave}
                  initialConfig={mediaConfig}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                />
              ) : view === 'preview' ? (
                <PreJoinScreen
                  roomId={roomId}
                  onJoin={enterMeeting}
                  onBack={() => setView('dashboard')}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                />
              ) : (
                <Dashboard
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  onNewMeeting={handleStartMeeting}
                  onSignOut={() => {
                    signOut();
                    setView('landing');
                  }}
                />
              )}
            </SignedIn>

            <SignedOut>
              {view === 'landing' ? (
                <LandingPage
                  onJoin={handleJoinAttempt}
                  onStartMeeting={navigateToLogin}
                />
              ) : (
                <LoginPage
                  onBack={() => setView('landing')}
                />
              )}
            </SignedOut>
          </>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
          .app-root {
            min-height: 100vh;
            background-color: ${isDarkMode ? '#1a0a0a' : '#ffffff'};
            color: ${isDarkMode ? '#ffffff' : '#000000'};
            transition: background-color 0.3s ease;
          }
        `}} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
