import React, { useState } from 'react';
import { Video, Plus, Keyboard, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = ({ onJoin }) => {
  const [roomName, setRoomName] = useState('');

  return (
    <div className="landing-container">
      <nav className="glass-morphism landing-nav">
        <div className="logo-section">
          <Video className="logo-icon" />
          <span className="logo-text">Nexus<span className="gradient-text">Meet</span></span>
        </div>
        <div className="nav-time">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString()}
        </div>
      </nav>

      <main className="landing-main">
        <div className="content-side">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="hero-title">
              Premium video meetings. <br />
              Now <span className="gradient-text">crystal clear</span> for everyone.
            </h1>
            <p className="hero-subtitle">
              Secure, high-quality video conferencing designed for modern teams.
              Connect, collaborate, and celebrate from anywhere.
            </p>

            <div className="action-row">
              <button
                className="premium-button btn-primary"
                onClick={() => onJoin(Math.random().toString(36).substring(7))}
              >
                <Plus size={20} />
                New Meeting
              </button>

              <div className="input-group">
                <div className="input-wrapper glass-morphism">
                  <Keyboard size={20} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter a code or link"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <button
                  className="join-btn"
                  disabled={!roomName}
                  onClick={() => onJoin(roomName)}
                >
                  Join
                </button>
              </div>
            </div>

            <div className="divider" />

            <div className="promo-section">
              <Sparkles size={18} className="promo-icon" />
              <span>Learn more about <a href="#">NexusMeet Premium</a></span>
            </div>
          </motion.div>
        </div>

        <div className="visual-side">
          <motion.div
            className="feature-card glass-morphism"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <div className="card-image-placeholder" />
            <div className="card-info">
              <h3>Get a link you can share</h3>
              <p>Click <strong>New meeting</strong> to get a link you can send to people you want to meet with</p>
            </div>
          </motion.div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .landing-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .landing-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          margin: 1rem;
          border-radius: 1rem;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .logo-icon {
          color: var(--accent-primary);
        }

        .landing-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          padding: 4rem;
          align-items: center;
          gap: 4rem;
        }

        .hero-title {
          font-size: 3.5rem;
          line-height: 1.2;
          margin-bottom: 2rem;
          font-weight: 800;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 3rem;
          max-width: 600px;
          line-height: 1.6;
        }

        .action-row {
          display: flex;
          gap: 1.5rem;
          align-items: center;
          margin-bottom: 2rem;
        }

        .input-group {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          padding: 0.25rem 1rem;
          border-radius: 0.75rem;
          gap: 0.75rem;
        }

        .input-icon {
          color: var(--text-secondary);
        }

        .input-wrapper input {
          background: transparent;
          border: none;
          color: white;
          padding: 0.75rem 0;
          font-size: 1rem;
          outline: none;
          width: 200px;
        }

        .join-btn {
          background: transparent;
          border: none;
          color: var(--accent-primary);
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
        }

        .join-btn:disabled {
          color: var(--text-secondary);
          cursor: not-allowed;
        }

        .divider {
          height: 1px;
          background: var(--border-glass);
          margin: 2rem 0;
          width: 80%;
        }

        .promo-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .promo-section a {
          color: var(--accent-secondary);
          text-decoration: none;
        }

        .feature-card {
          width: 100%;
          max-width: 450px;
          border-radius: 2rem;
          overflow: hidden;
          padding: 1.5rem;
        }

        .card-image-placeholder {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #111111 0%, #000000 100%);
          border-radius: 1.5rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
          border: 1px solid var(--border-glass);
        }

        .card-image-placeholder::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, #ffffff 0%, transparent 70%);
          opacity: 0.05;
        }

        .card-info {
          text-align: center;
          padding: 0 1rem 1rem;
        }

        .card-info h3 {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .card-info p {
          color: var(--text-secondary);
          line-height: 1.5;
        }

        @media (max-width: 1024px) {
          .landing-main {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-subtitle {
            margin: 0 auto 3rem;
          }
          .action-row {
            justify-content: center;
          }
          .visual-side {
            display: none;
          }
          .divider {
            margin: 2rem auto;
          }
          .promo-section {
            justify-content: center;
          }
        }
      `}} />
    </div>
  );
};

export default LandingPage;
