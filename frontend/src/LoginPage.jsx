import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Video, ArrowLeft } from 'lucide-react';

const LoginPage = ({ mode = 'signin', onBack, isDarkMode }) => {
  const D = isDarkMode;
  const bg = D ? '#1a0a0a' : '#ffffff';
  const tc = D ? '#ffffff' : '#000000';
  const sc = D ? '#888' : '#666666';
  const bc = D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const containerStyle = {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: bg,
    backgroundImage: `radial-gradient(${D ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px)`,
    backgroundSize: '32px 32px',
    overflow: 'hidden',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'background-color 0.4s ease'
  };

  const navStyle = {
    padding: '1.5rem 3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const logoSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.25rem',
    fontWeight: 500,
    color: tc,
    cursor: 'pointer'
  };

  const mainStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem'
  };

  const clerkAppearance = {
    layout: {
      socialButtonsPlacement: 'top',
      showOptionalFields: false,
    },
    variables: {
      colorPrimary: D ? '#ffffff' : '#000000',
      colorText: tc,
      colorTextSecondary: sc,
      fontFamily: "'Montserrat', sans-serif",
      colorBackground: D ? '#2a1a1a' : '#ffffff',
      colorInputBackground: D ? '#2a1a1a' : '#fcfcfc',
      colorInputText: tc
    },
    elements: {
      card: {
        border: `1px solid ${bc}`,
        boxShadow: D ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px -10px rgba(0,0,0,0.05)',
        borderRadius: '1.5rem',
        padding: '2rem',
        width: '400px',
        maxWidth: '100%',
        backgroundColor: D ? '#2a1a1a' : '#ffffff'
      },
      headerTitle: {
        fontWeight: 800,
        letterSpacing: '-1px',
        fontSize: '1.5rem',
        color: tc
      },
      headerSubtitle: {
        fontWeight: 500,
        fontSize: '0.9rem',
        color: sc
      },
      socialButtonsBlockButton: {
        borderRadius: '99px',
        border: `1px solid ${bc}`,
        height: '44px',
        backgroundColor: D ? 'rgba(255,255,255,0.05)' : '#fff',
        '&:hover': {
          borderColor: tc,
          backgroundColor: D ? 'rgba(255,255,255,0.1)' : '#fafafa'
        }
      },
      socialButtonsBlockButtonText: {
        fontWeight: 700,
        fontSize: '0.8rem',
        color: tc
      },
      formButtonPrimary: {
        backgroundColor: tc,
        color: bg,
        borderRadius: '99px',
        height: '48px',
        textTransform: 'uppercase',
        fontWeight: 800,
        letterSpacing: '1px',
        fontSize: '0.75rem',
        marginTop: '0.5rem',
        '&:hover': {
          backgroundColor: sc
        }
      },
      formFieldInput: {
        borderRadius: '0.75rem',
        border: `1px solid ${bc}`,
        backgroundColor: D ? 'rgba(0,0,0,0.2)' : '#fcfcfc',
        height: '42px',
        fontSize: '0.85rem',
        color: tc
      },
      formFieldLabel: {
        fontWeight: 700,
        fontSize: '0.8rem',
        color: tc,
      },
      footerActionLink: {
        color: tc,
        fontWeight: 800,
        textDecoration: 'underline'
      },
      dividerText: {
        fontWeight: 800,
        fontSize: '0.65rem',
        color: sc,
        textTransform: 'uppercase'
      },
      identityPreviewText: { color: tc },
      identityPreviewEditButtonIcon: { color: tc }
    }
  };

  return (
    <div style={containerStyle}>
      <nav style={navStyle}>
        <div style={logoSectionStyle} onClick={onBack}>
          <Video size={24} />
          <span>smart<span style={{ fontWeight: 800 }}>Meet</span></span>
        </div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
      </nav>

      <main style={mainStyle}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {mode === 'signin' ? (
            <SignIn routing="hash" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" appearance={clerkAppearance} />
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default LoginPage;
