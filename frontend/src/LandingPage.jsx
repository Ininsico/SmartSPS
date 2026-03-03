import React, { useState, useEffect } from 'react';
import { Video, Plus, Keyboard, ExternalLink, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumButton from './PremiumButton';
import { UserButton } from '@clerk/clerk-react';

const LandingPage = ({ onJoin, onStartMeeting, isDarkMode, setIsDarkMode }) => {
  const [roomName, setRoomName] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const words = ['everyone', 'teams', 'creatives', 'founders', 'family', 'future'];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const D = isDarkMode;
  const bg = D ? '#1a0a0a' : '#ffffff';
  const tc = D ? '#ffffff' : '#000000';
  const sc = D ? '#888' : '#666';
  const bc = D ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const nb = D ? 'rgba(26,10,10,0.8)' : 'rgba(255,255,255,0.8)';

  return (
    <div className="landing-container">
      <nav className="landing-nav glass-morphism">
        <div className="logo-section">
          <Video className="logo-icon" size={28} color={tc} />
          <span className="logo-text" style={{ color: tc }}>smart<span className="bold-text">Meet</span></span>
        </div>
        <div className="nav-right">
          <div className="nav-actions">
            <button onClick={() => setIsDarkMode(!D)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', '&:hover': { background: bc } }}>
              {D ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <UserButton afterSignOutUrl="/" />
            <span className="nav-time" style={{ color: sc }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </nav>

      <main className="landing-main">
        <motion.div
          className="hero-section"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="hero-content">
            <h1 className="hero-title" style={{ color: tc }}>
              Secure video conferencing <br /> for <span className="word-rotator-container">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={words[wordIndex]}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="underline-text"
                  >
                    {words[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            <p className="hero-subtitle" style={{ color: sc }}>
              Experience crystal-clear communication with smartMeet <br />
              Enterprise-grade security simplified for your everyday connections
            </p>

            <div className="action-hub">
              <div className="primary-actions">
                <PremiumButton
                  className="hero-btn"
                  icon={Plus}
                  onClick={onStartMeeting}
                >
                  Start a Meeting
                </PremiumButton>

                <div className="input-group-centered" style={{ background: D ? 'rgba(255,255,255,0.03)' : '#fdfdfd', borderColor: D ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
                  <div className="input-wrapper-light">
                    <Keyboard size={20} className="input-icon-left" strokeWidth={1.5} color={sc} />
                    <input
                      type="text"
                      placeholder="Enter a code or link"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      style={{ color: tc }}
                    />
                  </div>
                  <PremiumButton
                    className="join-button-minimal"
                    disabled={!roomName}
                    onClick={() => onJoin(roomName)}
                  >
                    Join Room
                  </PremiumButton>
                </div>
              </div>

              <div className="divider-minimal" style={{ background: bc }} />

              <div className="secondary-info" style={{ color: sc }}>
                <p>New to smartMeet? <a href="#" className="link-action" style={{ color: tc, borderBottomColor: tc }}>Create an account <ExternalLink size={14} /></a></p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .landing-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: ${bg};
          background-image: radial-gradient(${D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px);
          background-size: 32px 32px;
          transition: background-color 0.4s ease;
        }

        .landing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 3rem;
          margin: 0;
          border-bottom: 1px solid ${bc};
          background: ${nb};
          backdrop-filter: blur(10px);
          z-index: 100;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.75rem;
          font-weight: 500;
          letter-spacing: -0.5px;
        }

        .bold-text {
          font-weight: 800;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .landing-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .hero-section {
          max-width: 900px;
          width: 100%;
          text-align: center;
        }

        .hero-title {
          font-size: 4.5rem;
          line-height: 1.1;
          letter-spacing: -2px;
          font-weight: 800;
          margin-bottom: 2.5rem;
        }

        .underline-text {
          text-decoration: underline;
          text-underline-offset: 8px;
          text-decoration-thickness: 4px;
        }

        .word-rotator-container {
          display: inline-flex;
          position: relative;
          min-width: 280px;
          justify-content: flex-start;
          vertical-align: top;
        }

        .hero-subtitle {
          font-size: 1.5rem;
          margin-bottom: 4rem;
          line-height: 1.5;
          max-width: 750px;
          margin-left: auto;
          margin-right: auto;
        }

        .action-hub {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .primary-actions {
          display: flex;
          gap: 2rem;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
        }

        .hero-btn {
          height: 60px;
          padding: 0 2.5rem;
          font-size: 1rem;
          border-radius: 99px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        .input-group-centered {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          border-radius: 99px;
          border: 1px solid;
          transition: all 0.3s ease;
        }

        .input-group-centered:focus-within {
          border-color: ${tc};
          box-shadow: 0 0 0 1px ${tc};
        }

        .input-wrapper-light {
          display: flex;
          align-items: center;
          padding: 0 1.25rem;
          gap: 1rem;
        }

        .input-wrapper-light input {
          border: none;
          background: transparent;
          font-size: 1rem;
          padding: 0.75rem 0;
          outline: none;
          width: 220px;
          font-weight: 600;
          font-family: 'Montserrat', sans-serif;
        }

        .join-button-minimal {
          height: 50px;
          padding: 0 1.75rem !important;
          font-size: 0.75rem !important;
          letter-spacing: 1px !important;
        }

        .divider-minimal {
          width: 100px;
          height: 1px;
        }

        .secondary-info {
          font-size: 1rem;
        }

        .link-action {
          text-decoration: none;
          font-weight: 700;
          border-bottom: 2px solid;
          padding-bottom: 1px;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 3rem;
            letter-spacing: -1px;
          }
          .hero-subtitle {
            font-size: 1.2rem;
          }
          .primary-actions {
            flex-direction: column;
            width: 100%;
          }
          .hero-btn, .input-group-centered {
            width: 100%;
            max-width: 400px;
          }
        }
      `}} />
    </div>
  );
};

export default LandingPage;
