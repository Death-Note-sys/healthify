import { useState } from 'react';
import { supabase } from '../lib/supabase';

const inputStyle = {
  width: '100%', background: 'transparent',
  border: '1.5px solid var(--glass-border-outer)', borderRadius: 12,
  color: 'var(--ink-primary)', padding: '13px 16px',
  fontFamily: "'Inter', sans-serif", fontSize: 15,
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

  const toggle = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
    }} className="app-background">

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

        {/* Back button */}
        {onBack && (
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, marginBottom: 24, padding: 0,
            fontFamily: "'Inter', sans-serif",
          }}>← Back to Home</button>
        )}

        {/* ── Branding ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="display" style={{ color: 'var(--accent-green)', marginBottom: 8 }}>
            Healthify<span style={{ color: 'var(--accent-blue)', fontSize: 10, verticalAlign: 'super', marginLeft: 2 }}>✦</span>
          </div>
          <div className="body" style={{ color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
            {mode === 'login'
              ? 'Welcome back! Sign in to continue.'
              : 'Create your free account to get started.'}
          </div>
        </div>

        {/* ── Card ── */}
        <div className="glass-card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit}>

            {/* Name (sign-up only) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label className="label" style={{ display: 'block', marginBottom: 7 }}>Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" required style={inputStyle}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label className="label" style={{ display: 'block', marginBottom: 7 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required style={inputStyle}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label className="label" style={{ display: 'block', marginBottom: 7 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters" required minLength={6} style={inputStyle}
              />
            </div>

            {/* Error / Success */}
            {error && (
              <div style={{
                background: 'rgba(176,42,42,0.09)', border: '1px solid rgba(176,42,42,0.22)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--accent-red)', lineHeight: 1.5,
              }}>
                <i className="ti ti-alert-circle" style={{marginRight: 4, verticalAlign: 'middle'}}></i> 
                {error}
              </div>
            )}
            {success && (
              <div style={{
                background: 'rgba(26,122,60,0.12)', border: '1px solid rgba(26,122,60,0.28)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--accent-green)', lineHeight: 1.5,
              }}>
                <i className="ti ti-circle-check" style={{marginRight: 4, verticalAlign: 'middle'}}></i>
                {success}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15 }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* ── Toggle mode ── */}
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--ink-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={toggle} style={{
              color: 'var(--accent-green)', cursor: 'pointer', fontWeight: 600,
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
