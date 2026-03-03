import React, { useState, useEffect } from 'react';
import { Video, Plus, Keyboard, ExternalLink, Sun, Moon, ArrowRight, X, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumButton from './PremiumButton';
import { UserButton } from '@clerk/clerk-react';
import { cn } from './utils';

const JoinModal = ({ onClose, isDarkMode, onJoin }) => {
  const [roomInput, setRoomInput] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;

    let targetRoom = roomInput.trim();
    try {
      const url = new URL(targetRoom);
      const params = new URLSearchParams(url.search);
      const roomParam = params.get('room');
      if (roomParam) targetRoom = roomParam;
    } catch (e) { }

    onJoin(targetRoom.toLowerCase());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className={cn(
          "w-full max-w-md rounded-3xl p-8 border shadow-2xl transition-all",
          isDarkMode ? "bg-premium-surface border-white/10 text-white" : "bg-white border-black/5 text-black"
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="m-0 font-black text-2xl tracking-tight">Join Meeting</h2>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors border-none cursor-pointer bg-transparent",
              isDarkMode ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
            )}
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleJoin} className="flex flex-col gap-5">
          <div>
            <label className="block mb-2 text-[10px] font-black uppercase tracking-widest opacity-50">Meeting Code or Link</label>
            <input
              required
              type="text"
              placeholder="e.g. abc-def-ghi or https://..."
              className={cn(
                "w-full px-5 py-3.5 rounded-2xl border outline-none font-medium transition-all",
                isDarkMode ? "bg-white/5 border-white/5 text-white focus:bg-white/10" : "bg-gray-50 border-gray-100 text-black focus:bg-white"
              )}
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              autoFocus
            />
          </div>
          <PremiumButton type="submit" className="w-full mt-2" icon={ArrowRight}>
            Join Now
          </PremiumButton>
        </form>
      </motion.div>
    </motion.div>
  );
};

const LandingPage = ({ onJoin, onStartMeeting, isDarkMode, setIsDarkMode }) => {
  const [roomName, setRoomName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const words = ['everyone', 'teams', 'creatives', 'founders', 'family', 'future'];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const D = isDarkMode;

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500 relative overflow-x-hidden",
      D ? "bg-premium-bg text-white" : "bg-white text-black"
    )}>
      {/* Grid Pattern Background */}
      <div className={cn(
        "fixed inset-0 pointer-events-none opacity-[0.03]",
        D ? "bg-[radial-gradient(#fff_1px,transparent_1px)]" : "bg-[radial-gradient(#000_1px,transparent_1px)]"
      )} style={{ backgroundSize: '32px 32px' }} />

      <nav className={cn(
        "flex justify-between items-center px-6 sm:px-12 py-6 border-b sticky top-0 z-[100] backdrop-blur-xl",
        D ? "border-white/5 bg-premium-bg/80" : "border-gray-100 bg-white/80"
      )}>
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
          <button
            onClick={() => setIsDarkMode(!D)}
            className={cn(
              "p-2.5 rounded-xl transition-all active:scale-95 border-none cursor-pointer",
              D ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-black hover:bg-gray-200"
            )}
          >
            {D ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <UserButton afterSignOutUrl="/" />
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

          <p className={cn(
            "text-lg sm:text-2xl font-medium leading-relaxed max-w-2xl mx-auto mb-12",
            D ? "text-white/40" : "text-gray-500"
          )}>
            Experience crystal-clear communication with smartMeet. <br className="hidden sm:block" />
            Enterprise-grade security simplified for everyone.
          </p>

          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <PremiumButton
                className="h-14 sm:h-16 px-8 sm:px-12 text-sm sm:text-base shadow-2xl"
                icon={Plus}
                onClick={onStartMeeting}
              >
                Start Meeting
              </PremiumButton>

              <PremiumButton
                variant="secondary"
                className="h-14 sm:h-16 px-8 sm:px-12 text-sm sm:text-base"
                icon={Link2}
                onClick={() => setShowJoin(true)}
              >
                Join Meeting
              </PremiumButton>

              <div className={cn(
                "flex items-center p-1.5 rounded-full border-2 transition-all group focus-within:border-premium-accent w-full sm:w-auto",
                D ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"
              )}>
                <div className="flex items-center px-4 gap-3">
                  <Keyboard size={20} className="opacity-30" />
                  <input
                    type="text"
                    placeholder="Enter code or link"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className={cn(
                      "bg-transparent border-none outline-none text-sm font-bold w-full sm:w-[200px] py-2",
                      D ? "text-white placeholder:text-white/20" : "text-black placeholder:text-gray-400"
                    )}
                  />
                </div>
                <PremiumButton
                  className="px-6 h-11 text-[10px] !uppercase tracking-widest shrink-0"
                  disabled={!roomName}
                  onClick={() => {
                    let target = roomName.trim();
                    try {
                      if (target.includes('://')) {
                        const url = new URL(target);
                        const params = new URLSearchParams(url.search);
                        const roomParam = params.get('room');
                        if (roomParam) target = roomParam;
                        else {
                          // Try to get from end of pathname
                          const parts = url.pathname.split('/');
                          target = parts[parts.length - 1];
                        }
                      }
                    } catch (e) { }
                    onJoin(target.toLowerCase());
                  }}
                >
                  Join
                </PremiumButton>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-2 text-sm font-bold",
              D ? "text-white/40" : "text-gray-400"
            )}>
              New to smartMeet?
              <a href="#" className={cn(
                "flex items-center gap-1.5 underline underline-offset-4 decoration-2 transition-colors",
                D ? "text-white hover:text-premium-accent" : "text-black hover:text-premium-accent"
              )}>
                Create an account <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {showJoin && <JoinModal onClose={() => setShowJoin(false)} isDarkMode={D} onJoin={onJoin} />}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
