import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';

const LoginPage = ({ mode = 'signin', onBack }) => {
  // Inline styles for layout
  const containerStyle = {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    backgroundImage: 'radial-gradient(#00000005 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    overflow: 'hidden',
    fontFamily: "'Montserrat', sans-serif"
  };

  const navStyle = {
    padding: '1rem 2rem',
    display: 'flex',
    alignItems: 'center'
  };

  const logoSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.25rem',
    fontWeight: 500,
    color: '#000',
    cursor: 'pointer'
  };

  const mainStyle = {
    flex: 1,
    display: 'flex',
    alignItems: 'center', // Center vertically
    justifyContent: 'center', // Center horizontally
    padding: '0.5rem'
  };

  const clerkAppearance = {
    layout: {
      socialButtonsPlacement: 'top',
      showOptionalFields: false,
    },
    variables: {
      colorPrimary: '#000000',
      colorText: '#000000',
      colorTextSecondary: '#666666',
      fontFamily: "'Montserrat', sans-serif",
    },
    elements: {
      card: {
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)',
        borderRadius: '1.5rem',
        padding: '2rem',
        width: '400px',
        maxWidth: '100%',
      },
      headerTitle: {
        fontWeight: 800,
        letterSpacing: '-1px',
        fontSize: '1.5rem',
      },
      headerSubtitle: {
        fontWeight: 500,
        fontSize: '0.9rem',
      },
      socialButtonsBlockButton: {
        borderRadius: '99px',
        border: '1px solid #eee',
        height: '44px',
        backgroundColor: '#fff',
        '&:hover': {
          borderColor: '#000',
          backgroundColor: '#fafafa'
        }
      },
      socialButtonsBlockButtonText: {
        fontWeight: 700,
        fontSize: '0.8rem',
      },
      socialButtonsBlockButtonArrow: {
        display: 'none'
      },
      formButtonPrimary: {
        backgroundColor: '#000',
        borderRadius: '99px',
        height: '48px',
        textTransform: 'uppercase',
        fontWeight: 800,
        letterSpacing: '1px',
        fontSize: '0.75rem',
        marginTop: '0.5rem'
      },
      formFieldInput: {
        borderRadius: '0.75rem',
        border: '1px solid #f0f0f0',
        backgroundColor: '#fcfcfc',
        height: '42px',
        fontSize: '0.85rem',
        fontFamily: "'Montserrat', sans-serif",
      },
      formFieldLabel: {
        fontWeight: 700,
        fontSize: '0.8rem',
        color: '#000',
      },
      footerActionLink: {
        color: '#000',
        fontWeight: 800,
        textDecoration: 'underline'
      },
      dividerText: {
        fontWeight: 800,
        fontSize: '0.65rem',
        color: '#ccc',
        textTransform: 'uppercase'
      }
    }
  };

  return (
    <div style={containerStyle}>
      <nav style={navStyle}>
        <div style={logoSectionStyle} onClick={onBack}>
          <Video size={24} />
          <span>smart<span style={{ fontWeight: 800 }}>Meet</span></span>
        </div>
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
