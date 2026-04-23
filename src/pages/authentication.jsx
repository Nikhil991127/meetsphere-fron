import * as React from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function Authentication() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name,     setName]     = React.useState('');
  const [error,    setError]    = React.useState('');
  const [message,  setMessage]  = React.useState('');
  const [formState, setFormState] = React.useState(0); // 0 = login, 1 = register
  const [loading,  setLoading]  = React.useState(false);
  const [toast,    setToast]    = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  /* ── show toast then hide ── */
  const showToast = (msg) => {
    setMessage(msg);
    setToast(true);
    setTimeout(() => setToast(false), 3500);
  };

  const handleAuth = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(name, username, password);
        showToast(result || 'Account created! Please sign in.');
        setName(''); setUsername(''); setPassword('');
        setFormState(0);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleAuth(); };

  /* ── decorative hexagon positions ── */
  const hexagons = [
    { size: 180, top: '8%',  left: '-4%',  opacity: 0.06, delay: '0s' },
    { size: 120, top: '55%', left: '82%',  opacity: 0.05, delay: '0.5s' },
    { size: 80,  top: '80%', left: '12%',  opacity: 0.07, delay: '1s' },
    { size: 60,  top: '20%', left: '70%',  opacity: 0.05, delay: '1.5s' },
    { size: 200, top: '60%', left: '-8%',  opacity: 0.04, delay: '2s' },
  ];

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ms-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #e2e8f0;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          -webkit-autofill: none;
        }
        .ms-input::placeholder { color: rgba(226,232,240,0.28); }
        .ms-input:focus {
          border-color: rgba(99,102,241,0.6);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .ms-tab {
          flex: 1;
          padding: 10px 0;
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .ms-tab.active {
          background: rgba(99,102,241,0.18);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.3);
        }
        .ms-tab.inactive {
          background: transparent;
          color: rgba(226,232,240,0.35);
          border: 1px solid transparent;
        }
        .ms-tab.inactive:hover { color: rgba(226,232,240,0.6); }

        .ms-submit {
          width: 100%;
          padding: 14px;
          background: #6366f1;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.04em;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          position: relative;
          overflow: hidden;
        }
        .ms-submit::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .ms-submit:hover:not(:disabled) {
          background: #4f52e0;
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(99,102,241,0.4);
        }
        .ms-submit:hover:not(:disabled)::before { opacity: 1; }
        .ms-submit:active:not(:disabled) { transform: translateY(0); }
        .ms-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .ms-pass-toggle {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(226,232,240,0.35);
          font-size: 12px; font-family: 'DM Sans', sans-serif;
          transition: color 0.2s; padding: 2px 4px;
        }
        .ms-pass-toggle:hover { color: rgba(226,232,240,0.7); }

        .ms-divider {
          display: flex; align-items: center; gap: 12;
          color: rgba(226,232,240,0.2);
          font-size: 12px; font-family: 'DM Sans', sans-serif;
        }
        .ms-divider::before, .ms-divider::after {
          content: ''; flex: 1; height: 1px;
          background: rgba(255,255,255,0.07);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes hexFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50%       { transform: translateY(-18px) rotate(5deg); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; } to { opacity: 0; }
        }

        .ms-card { animation: fadeUp 0.5s ease both; }
        .ms-field { animation: fadeUp 0.4s ease both; }
        .ms-field-1 { animation-delay: 0.05s; }
        .ms-field-2 { animation-delay: 0.1s; }
        .ms-field-3 { animation-delay: 0.15s; }

        .ms-hex {
          position: absolute;
          animation: hexFloat var(--dur, 8s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
          pointer-events: none;
        }

        @media (max-width: 600px) {
          .ms-left-panel { display: none !important; }
          .ms-right-panel { width: 100% !important; padding: 32px 20px !important; }
        }
      `}</style>

      {/* Decorative hexagons */}
      {hexagons.map((h, i) => (
        <div key={i} className="ms-hex" style={{ top: h.top, left: h.left, '--dur': `${8 + i * 2}s`, '--delay': h.delay }}>
          <svg width={h.size} height={h.size} viewBox="0 0 100 100" fill="none">
            <polygon points="50,2 93,26 93,74 50,98 7,74 7,26" stroke="#6366f1" strokeWidth="1" fill="none" opacity={h.opacity} />
          </svg>
        </div>
      ))}

      {/* Ambient glow blobs */}
      <div style={{ position: 'fixed', top: '20%', left: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

      {/* ── SPLIT LAYOUT ── */}
      <div style={s.layout}>

        {/* LEFT PANEL — branding */}
        <div className="ms-left-panel" style={s.leftPanel}>
          <div style={s.leftContent}>
            {/* Logo */}
            <div style={s.logo}>
              <div style={s.logoMark}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                  <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="#6366f1" opacity="0.35"/>
                  <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
                </svg>
              </div>
              <span style={s.logoText}>MeetSphere</span>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <h2 style={s.leftTitle}>Your meeting space,<br /><span style={s.leftAccent}>reimagined.</span></h2>
              <p style={s.leftSub}>HD video, AI summaries, face attendance, and live captions — all in one place.</p>

              {/* Feature pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
                {[
                  { icon: '⬡', text: 'AI-powered meeting summaries' },
                  { icon: '⬡', text: 'Face recognition attendance' },
                  { icon: '⬡', text: 'Live captions & smart replies' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6366f1', flexShrink: 0 }}>
                      {f.icon}
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.5)', fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom quote */}
            <div style={{ marginTop: 'auto', paddingTop: 40 }}>
              <p style={{ fontSize: 12, color: 'rgba(226,232,240,0.2)', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', lineHeight: 1.6 }}>
                "The meeting tool that actually thinks with you."
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — form */}
        <div className="ms-right-panel" style={s.rightPanel}>
          <div className="ms-card" style={s.card}>

            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              {/* Mobile logo */}
              <div style={{ ...s.logo, marginBottom: 28, display: 'none' }} className="ms-mobile-logo">
                <div style={s.logoMark}>
                  <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                    <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                    <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
                  </svg>
                </div>
                <span style={{ ...s.logoText, fontSize: 16 }}>MeetSphere</span>
              </div>

              <h1 style={s.formTitle}>
                {formState === 0 ? 'Welcome back' : 'Create account'}
              </h1>
              <p style={s.formSub}>
                {formState === 0
                  ? 'Sign in to your MeetSphere account'
                  : 'Join MeetSphere — it\'s free'}
              </p>
            </div>

            {/* Tab switcher */}
            <div style={s.tabs}>
              <button className={`ms-tab ${formState === 0 ? 'active' : 'inactive'}`} onClick={() => { setFormState(0); setError(''); }}>
                Sign In
              </button>
              <button className={`ms-tab ${formState === 1 ? 'active' : 'inactive'}`} onClick={() => { setFormState(1); setError(''); }}>
                Sign Up
              </button>
            </div>

            {/* Fields */}
            <div style={s.fields}>
              {formState === 1 && (
                <div className="ms-field ms-field-1" style={s.fieldWrap}>
                  <label style={s.label}>Full Name</label>
                  <input
                    className="ms-input"
                    type="text"
                    placeholder="Arjun Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={handleKey}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className={`ms-field ${formState === 1 ? 'ms-field-2' : 'ms-field-1'}`} style={s.fieldWrap}>
                <label style={s.label}>Username</label>
                <input
                  className="ms-input"
                  type="text"
                  placeholder="arjun123"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKey}
                  autoComplete="username"
                />
              </div>

              <div className={`ms-field ${formState === 1 ? 'ms-field-3' : 'ms-field-2'}`} style={s.fieldWrap}>
                <label style={s.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="ms-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKey}
                    autoComplete={formState === 0 ? 'current-password' : 'new-password'}
                    style={{ paddingRight: 56 }}
                  />
                  <button className="ms-pass-toggle" type="button" onClick={() => setShowPass(!showPass)}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={s.errorBox}>
                <span style={{ fontSize: 16 }}>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button className="ms-submit" onClick={handleAuth} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {formState === 0 ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                formState === 0 ? 'Sign In →' : 'Create Account →'
              )}
            </button>

            {/* Divider */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                {formState === 0 ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setFormState(formState === 0 ? 1 : 0); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, padding: 0 }}
                >
                  {formState === 0 ? 'Sign up' : 'Sign in'}
                </button>
              </span>
            </div>

            {/* Terms */}
            {formState === 1 && (
              <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(226,232,240,0.2)', textAlign: 'center', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{ ...s.toast, animation: 'toastIn 0.35s ease' }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh',
    background: '#090912',
    color: '#e2e8f0',
    fontFamily: "'DM Sans', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  layout: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
    zIndex: 2,
  },
  leftPanel: {
    width: '42%',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.015)',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 18,
    color: '#e2e8f0',
    letterSpacing: '-0.02em',
  },
  leftTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(28px, 3vw, 40px)',
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    color: '#e2e8f0',
    marginTop: 56,
  },
  leftAccent: {
    background: 'linear-gradient(135deg, #6366f1, #10b981)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  leftSub: {
    fontSize: 14,
    color: 'rgba(226,232,240,0.4)',
    lineHeight: 1.7,
    marginTop: 14,
    fontWeight: 300,
    maxWidth: 320,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
  formTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(24px, 3vw, 32px)',
    letterSpacing: '-0.02em',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  formSub: {
    fontSize: 14,
    color: 'rgba(226,232,240,0.4)',
    fontWeight: 300,
    lineHeight: 1.5,
  },
  tabs: {
    display: 'flex',
    gap: 6,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    marginBottom: 20,
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(226,232,240,0.45)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: "'Syne', sans-serif",
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#fca5a5',
    marginBottom: 12,
    fontFamily: "'DM Sans', sans-serif",
  },
  toast: {
    position: 'fixed',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: 14,
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: '#6ee7b7',
    fontFamily: "'DM Sans', sans-serif",
    zIndex: 999,
    whiteSpace: 'nowrap',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
};
