import React, { useState, useEffect } from 'react';
import { Video, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const { isSignedIn, logout } = useAuthContext();
  const navigate = useNavigate();
  const [wordIndex, setWordIndex] = useState(0);
  const words = ['everyone', 'teams', 'creatives', 'founders', 'family', 'future'];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-500 relative overflow-x-hidden bg-white text-black">
      {/* Grid Pattern Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)]"
        style={{ backgroundSize: '32px 32px' }}
      />

      <nav className="flex justify-between items-center px-6 sm:px-12 py-6 border-b sticky top-0 z-[100] backdrop-blur-xl border-gray-100 bg-white/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-premium-accent flex items-center justify-center shadow-lg shadow-premium-accent/20">
            <Video className="text-white" size={18} />
          </div>
          <span className="text-xl font-medium tracking-tight">smart<span className="font-black">Meet</span></span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-3 text-xs font-bold opacity-40 uppercase tracking-widest">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString()}
          </div>
          {isSignedIn ? (
            <button
              onClick={logout}
              className="px-5 py-2.5 rounded-xl transition-all active:scale-95 border-none cursor-pointer font-bold text-xs uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl transition-all active:scale-95 border-none cursor-pointer font-black text-xs uppercase tracking-widest bg-premium-accent text-black hover:opacity-90 shadow-lg shadow-black/5 border border-black/5"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <motion.div
          className="max-w-4xl w-full text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-7xl font-black leading-[1.05] tracking-tight mb-8">
            Secure video conferencing <br className="hidden sm:block" />
            for <span className="inline-flex relative min-w-[200px] sm:min-w-[320px] justify-center sm:justify-start">
              <AnimatePresence mode="wait">
                <motion.span
                  key={words[wordIndex]}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="underline underline-offset-[8px] decoration-premium-accent decoration-4 sm:decoration-8"
                >
                  {words[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="text-lg sm:text-2xl font-medium leading-relaxed max-w-2xl mx-auto mb-12 text-gray-500">
            Experience crystal-clear communication with smartMeet. <br className="hidden sm:block" />
            Enterprise-grade security simplified for everyone.
          </p>

          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
              New to smartMeet?
              <button
                onClick={() => navigate('/signup')}
                className="flex items-center gap-1.5 underline underline-offset-4 decoration-2 transition-opacity bg-transparent border-none cursor-pointer font-bold text-black hover:opacity-60"
              >
                Create an account <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;
