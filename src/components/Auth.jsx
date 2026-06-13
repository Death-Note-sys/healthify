import { useState } from 'react';
import { supabase } from '../lib/supabase';

// ── Shared palette (mirrors App.jsx) ─────────────────────────
const C = {
  bg: '#07080f', card: '#0e1120', card2: '#151726',
  lime: '#a3e635', blue: '#38bdf8',
  border: 'rgba(255,255,255,0.07)', text: '#fff',
  muted: '#9ca3af', dim: '#6b7280', dimmer: '#374151',
};

const inputStyle = {
  width: '100%', background: C.card2,
  border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12,
  color: '#fff', padding: '13px 16px',
  fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15,
  outline: 'none', transition: 'border-color 0.2s',
};

const Auth = ({ onBack }) => {
  const [mode, setMode]       = useState('login'); // 'login' | 'signup'
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (err) throw err;
        setSuccess('Account created! Check your email to confirm, or sign in if auto-confirmed.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        // onAuthStateChange in useAuth will handle navigation
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  };

  const toggle = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif", color: C.text,
    }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: -180, left: -180, width: 520, height: 520, background: 'radial-gradient(circle, rgba(163,230,53,0.1) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -180, right: -120, width: 460, height: 460, background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Back button */}
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: C.dim, cursor: 'pointer',
            fontSize: 14, fontWeight: 600, marginBottom: 24, padding: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>← Back to Home</button>
        )}

        {/* ── Branding ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: C.lime, marginBottom: 8 }}>
            Healthify<span style={{ color: C.blue, fontSize: 10, verticalAlign: 'super', marginLeft: 2 }}>✦</span>
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            {mode === 'login'
              ? 'Welcome back! Sign in to continue.'
              : 'Create your free account to get started.'}
          </div>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: 24,
        }}>
          <form onSubmit={handleSubmit}>

            {/* Name (sign-up only) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                  Name
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" required style={inputStyle}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters" required minLength={6} style={inputStyle}
              />
            </div>

            {/* Error / Success */}
            {error && (
              <div style={{
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: '#f87171', lineHeight: 1.5,
              }}>{error}</div>
            )}
            {success && (
              <div style={{
                background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: C.lime, lineHeight: 1.5,
              }}>{success}</div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15,
              background: C.lime, color: '#07080f', border: 'none',
              boxShadow: '0 4px 24px rgba(163,230,53,0.22)',
              opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
            }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>



          {/* ── Toggle mode ── */}
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={toggle} style={{
              color: C.lime, cursor: 'pointer', fontWeight: 600,
            }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
