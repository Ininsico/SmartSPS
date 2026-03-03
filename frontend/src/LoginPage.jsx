import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Video, ArrowLeft } from 'lucide-react';
import { cn } from './utils';

const LoginPage = ({ mode = 'signin', onBack, isDarkMode }) => {
  const D = isDarkMode;

  const clerkAppearance = {
    layout: {
      socialButtonsPlacement: 'top',
      showOptionalFields: false,
    },
    variables: {
      colorPrimary: D ? '#ffffff' : '#000000',
      colorText: D ? '#ffffff' : '#000000',
      colorTextSecondary: D ? 'rgba(255,255,255,0.4)' : '#666666',
      fontFamily: "'Montserrat', sans-serif",
      colorBackground: D ? '#1a1010' : '#ffffff',
      colorInputBackground: D ? '#1e1a1a' : '#fcfcfc',
      colorInputText: D ? '#ffffff' : '#000000'
    },
    elements: {
      card: {
        border: `1px solid ${D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        boxShadow: D ? '0 30px 60px rgba(0,0,0,0.6)' : '0 20px 40px -10px rgba(0,0,0,0.05)',
        borderRadius: '2rem',
        padding: '2.5rem',
        width: '440px',
        maxWidth: '100%',
        backgroundColor: D ? '#1a1010' : '#ffffff'
      },
      headerTitle: {
        fontWeight: 900,
        letterSpacing: '-1.5px',
        fontSize: '1.75rem',
      },
      headerSubtitle: {
        fontWeight: 600,
        fontSize: '0.95rem',
      },
      socialButtonsBlockButton: {
        borderRadius: '1rem',
        border: `1px solid ${D ? 'rgba(255,255,255,0.1)' : '#eee'}`,
        height: '48px',
        backgroundColor: D ? 'rgba(255,255,255,0.05)' : '#fff',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: D ? '#fff' : '#000',
          backgroundColor: D ? 'rgba(255,255,255,0.1)' : '#fafafa'
        }
      },
      socialButtonsBlockButtonText: {
        fontWeight: 800,
        fontSize: '0.85rem',
      },
      formButtonPrimary: {
        backgroundColor: D ? '#ffffff' : '#000000',
        color: D ? '#000000' : '#ffffff',
        borderRadius: '1rem',
        height: '52px',
        textTransform: 'uppercase',
        fontWeight: 900,
        letterSpacing: '1.5px',
        fontSize: '0.8rem',
        marginTop: '1rem',
        transition: 'all 0.3s ease',
        '&:hover': {
          opacity: 0.9,
          transform: 'translateY(-2px)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
        }
      },
      formFieldInput: {
        borderRadius: '1rem',
        border: `1px solid ${D ? 'rgba(255,255,255,0.1)' : '#eee'}`,
        backgroundColor: D ? 'rgba(0,0,0,0.15)' : '#fcfcfc',
        height: '46px',
        fontSize: '0.9rem',
        transition: 'all 0.2s ease',
        '&:focus': {
          borderColor: D ? '#fff' : '#000'
        }
      },
      formFieldLabel: {
        fontWeight: 800,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '0.5rem',
        opacity: 0.5
      },
      footerActionLink: {
        fontWeight: 900,
        textDecoration: 'underline',
        textUnderlineOffset: '4px'
      },
      dividerLine: {
        backgroundColor: D ? 'rgba(255,255,255,0.1)' : '#eee'
      },
      dividerText: {
        fontWeight: 900,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        opacity: 0.4
      }
    }
  };

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col transition-colors duration-500 overflow-hidden relative",
      D ? "bg-premium-bg text-white" : "bg-white text-black"
    )}>
      {/* Grid Pattern */}
      <div className={cn(
        "absolute inset-0 pointer-events-none opacity-[0.03]",
        D ? "bg-[radial-gradient(#fff_1px,transparent_1px)]" : "bg-[radial-gradient(#000_1px,transparent_1px)]"
      )} style={{ backgroundSize: '32px 32px' }} />

      <nav className="flex items-center justify-between px-8 sm:px-12 py-8 relative z-10">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onBack}
        >
          <div className="w-8 h-8 rounded-lg bg-premium-accent flex items-center justify-center shadow-lg shadow-premium-accent/20 transition-transform group-hover:scale-110">
            <Video size={18} className="text-white" />
          </div>
          <span className="text-xl font-medium tracking-tight">smart<span className="font-black">Meet</span></span>
        </div>

        <button
          onClick={onBack}
          className={cn(
            "flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] transition-all hover:opacity-70 active:scale-95 bg-transparent border-none cursor-pointer",
            D ? "text-white" : "text-black"
          )}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full flex justify-center"
        >
          {mode === 'signin' ? (
            <SignIn routing="hash" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" appearance={clerkAppearance} />
          )}
        </motion.div>
      </main>

      {/* Soft decorative blur */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-premium-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-premium-danger/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

export default LoginPage;
