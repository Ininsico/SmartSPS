import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, ArrowLeft, Loader2, User, Lock, Mail, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useAuthContext } from './AuthContext';
import { useNavigate } from 'react-router-dom';

// Google Sign-In Button — temporarily disabled
// const GoogleSignInButton = ({ onCredential, loading }) => {
//   const divRef = useRef(null);
//   useEffect(() => {
//     const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
//     if (!clientId || !window.google) return;
//     window.google.accounts.id.initialize({
//       client_id: clientId,
//       callback: (response) => onCredential(response.credential),
//     });
//     window.google.accounts.id.renderButton(divRef.current, {
//       type: 'standard', theme: 'outline', size: 'large',
//       shape: 'rectangular', width: '100%', logo_alignment: 'center', text: 'continue_with',
//     });
//   }, []);
//   return <div ref={divRef} className={cn('w-full flex justify-center transition-opacity', loading && 'opacity-50 pointer-events-none')} />;
// };

const LoginPage = ({ onBack, initialMode = 'login' }) => {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  // const [googleLoading, setGoogleLoading] = useState(false); // Google auth — temporarily disabled
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuthContext();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const payload = isRegister ? { email, password, name } : { email, password };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google auth handler — temporarily disabled
  // const handleGoogleCredential = async (credential) => {
  //   setGoogleLoading(true); setError('');
  //   try {
  //     const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
  //       method: 'POST', headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ credential }),
  //     });
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
  //     login(data.token, data.user); navigate('/dashboard');
  //   } catch (err) { setError(err.message); } finally { setGoogleLoading(false); }
  // };

  return (
    <div className="min-h-screen w-full flex flex-col transition-colors duration-500 overflow-hidden relative font-montserrat bg-white text-black">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)]"
        style={{ backgroundSize: '32px 32px' }}
      />

      <nav className="flex items-center justify-between px-8 sm:px-12 py-8 relative z-10">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onBack}>
          <div className="w-8 h-8 rounded-lg bg-premium-accent flex items-center justify-center shadow-lg shadow-premium-accent/20 transition-transform group-hover:scale-110">
            <Video size={18} className="text-white" />
          </div>
          <span className="text-xl font-medium tracking-tight">smart<span className="font-black">Meet</span></span>
        </div>

        <button onClick={onBack} className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.2em] transition-all hover:opacity-70 active:scale-95 bg-transparent border-none cursor-pointer text-black">
          <ArrowLeft size={16} /> Back
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[440px] p-8 sm:p-12 rounded-[2.5rem] border shadow-2xl relative overflow-hidden bg-white border-black/5"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tighter m-0 mb-2">
              {isRegister ? 'Join the Future' : 'Welcome Back'}
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">
              {isRegister ? 'Create your smartMeet account' : 'Sign in to your dashboard'}
            </p>
          </div>

          {/* Google Sign-In — temporarily disabled */}
          {/* <div className="mb-6">
            <GoogleSignInButton onCredential={handleGoogleCredential} loading={googleLoading} />
            {googleLoading && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-black/40 font-bold">
                <Loader2 size={14} className="animate-spin" /> Signing in with Google…
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-black/5" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">or with email</span>
            <div className="flex-1 h-px bg-black/5" />
          </div> */}

          {/* ── Email / Password form ── */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {isRegister && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                    <input
                      required={isRegister}
                      type="text"
                      placeholder="Full Name"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border outline-none font-medium transition-all focus:ring-2 focus:ring-premium-accent/20 bg-gray-50 border-gray-100"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input
                  required
                  type="email"
                  placeholder="username@email.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border outline-none font-medium transition-all focus:ring-2 focus:ring-premium-accent/20 bg-gray-50 border-gray-100"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border outline-none font-medium transition-all focus:ring-2 focus:ring-premium-accent/20 bg-gray-50 border-gray-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-14 rounded-2xl bg-premium-accent hover:opacity-90 active:scale-95 text-black font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-premium-accent/20 flex items-center justify-center gap-3 border-none cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isRegister ? 'Register' : 'Sign In'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => setIsRegister(!isRegister)}
            className="w-full mt-8 text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer text-black"
          >
            {isRegister ? 'Already have an account? Sign In' : 'New to smartMeet? Create Account'}
          </button>
        </motion.div>
      </main>

      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-premium-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-premium-danger/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

export default LoginPage;
