import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import LandingPage from './LandingPage';
import MeetingRoom from './MeetingRoom';
import LoginPage from './LoginPage';
import PreJoinScreen from './components/PreJoinScreen';
import { SignedIn, SignedOut, useUser, useClerk, RedirectToSignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import ErrorBoundary from './ErrorBoundary';
import NotFoundPage from './NotFoundPage';
import Dashboard from './components/Dashboard/Dashboard';
import { mediaManager } from './mediaManager';
import { cn } from './utils';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (!saved) return true;
    return saved === 'dark';
  });
  const [mediaConfig, setMediaConfig] = useState({ micOn: true, videoOn: true });
  const [isHost, setIsHost] = useState(false);

  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.style.backgroundColor = isDarkMode ? '#1a0a0a' : '#ffffff';
    document.body.style.backgroundColor = isDarkMode ? '#1a0a0a' : '#ffffff';
  }, [isDarkMode]);

  // Handle legacy ?room= URL redirects
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const legacyRoomId = params.get('room');
    if (legacyRoomId) {
      navigate(`/preview/${legacyRoomId.toLowerCase()}`, { replace: true });
    }
  }, [location.search, navigate]);

  // Handle media cleanup when not in meeting/preview
  useEffect(() => {
    const isMeetingPath = location.pathname.startsWith('/meeting/') || location.pathname.startsWith('/preview/');
    if (!isMeetingPath) {
      mediaManager.killAll();
    }
  }, [location.pathname]);

  const handleStartMeeting = () => {
    const id = Math.random().toString(36).substring(7);
    setIsHost(true);
    navigate(`/preview/${id}`);
  };

  const handleJoinMeeting = (id) => {
    setIsHost(false);
    navigate(`/preview/${id}`);
  };

  const enterMeeting = (id, config) => {
    setMediaConfig(config);
    navigate(`/meeting/${id}`);
  };

  const handleLeave = () => {
    navigate(isSignedIn ? '/dashboard' : '/');
  };

  if (!isLoaded) {
    return (
      <div className={cn(
        "h-screen flex items-center justify-center transition-colors duration-300",
        isDarkMode ? "bg-premium-bg" : "bg-white"
      )}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <span className={cn(
            "font-black text-2xl tracking-tighter",
            isDarkMode ? "text-white" : "text-black"
          )}>smartMeet</span>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn(
        "min-h-screen transition-colors duration-300",
        isDarkMode ? "bg-premium-bg text-white" : "bg-white text-black"
      )}>
        <Routes>
          {/* Public Routes - but redirect if signed in */}
          <Route path="/" element={
            isSignedIn ? <Navigate to="/dashboard" replace /> : (
              <LandingPage
                onJoin={handleJoinMeeting}
                onStartMeeting={() => navigate('/login')}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
              />
            )
          } />

          <Route path="/login" element={
            isSignedIn ? <Navigate to="/dashboard" replace /> : (
              <LoginPage
                onBack={() => navigate('/')}
                isDarkMode={isDarkMode}
              />
            )
          } />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            isSignedIn ? (
              <Dashboard
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                onNewMeeting={handleStartMeeting}
                onSignOut={() => {
                  signOut();
                  navigate('/');
                }}
              />
            ) : <Navigate to="/login" replace />
          } />

          <Route path="/preview/:roomId" element={
            isSignedIn ? (
              <RouteWrapper component={PreJoinScreen}
                props={{
                  onJoin: (id, config) => enterMeeting(id, config),
                  onBack: () => navigate('/dashboard'),
                  isDarkMode: isDarkMode,
                  setIsDarkMode: setIsDarkMode
                }}
              />
            ) : <Navigate to="/login" replace />
          } />

          <Route path="/meeting/:roomId" element={
            (isSignedIn || new URLSearchParams(window.location.search).get('bot_token')) ? (
              <RouteWrapper component={MeetingRoom}
                props={{
                  onLeave: handleLeave,
                  initialConfig: mediaConfig,
                  isHost: isHost,
                  isDarkMode: isDarkMode,
                  setIsDarkMode: setIsDarkMode
                }}
              />
            ) : <Navigate to="/login" replace />
          } />

          {/* Fallback */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={
            isSignedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
          } />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

// Small helper to pass params from URL to components that expect them in props (to minimize component refactoring)
function RouteWrapper({ component: Component, props }) {
  const { roomId } = useParams();
  const { onJoin, ...otherProps } = props;

  // Intercept onJoin to include roomId if it's the preview screen
  const handleJoin = (config) => {
    if (onJoin) onJoin(roomId, config);
  };

  return <Component roomId={roomId} {...otherProps} onJoin={handleJoin} />;
}

export default App;
