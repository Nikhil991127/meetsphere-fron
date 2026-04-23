import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const router = useNavigate()
  const canvasRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  /* ── Animated particle orb background ── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    let frame = 0

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.5 + 0.15,
    }))

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Moving gradient orbs
      const t = frame * 0.006
      const gx1 = W * 0.25 + Math.sin(t * 0.7) * W * 0.12
      const gy1 = H * 0.35 + Math.cos(t * 0.5) * H * 0.10
      const g1 = ctx.createRadialGradient(gx1, gy1, 0, gx1, gy1, W * 0.38)
      g1.addColorStop(0, 'rgba(99,102,241,0.18)')
      g1.addColorStop(1, 'rgba(99,102,241,0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, W, H)

      const gx2 = W * 0.72 + Math.cos(t * 0.6) * W * 0.10
      const gy2 = H * 0.6  + Math.sin(t * 0.8) * H * 0.12
      const g2 = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, W * 0.32)
      g2.addColorStop(0, 'rgba(16,185,129,0.13)')
      g2.addColorStop(1, 'rgba(16,185,129,0)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, W, H)

      // Particles
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(148,163,184,${p.opacity})`
        ctx.fill()
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 110) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,102,241,${0.07 * (1 - dist / 110)})`
            ctx.lineWidth = 0.6
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      frame++
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const features = [
    { icon: '⬡', title: 'Crystal HD Video', desc: 'Adaptive streaming that adjusts to your network in real time — no freezing, no dropping.' },
    { icon: '⬡', title: 'AI Meeting Summary', desc: 'Gemini-powered summaries and action items generated instantly after your call ends.' },
    { icon: '⬡', title: 'Face Attendance', desc: 'Hosts can take attendance in one click using live face recognition — no manual roll call.' },
    { icon: '⬡', title: 'Live Captions', desc: 'Real-time speech-to-text captions for every participant, built right into the call.' },
    { icon: '⬡', title: 'Smart Replies', desc: 'AI suggests contextual chat replies based on the live conversation flow.' },
    { icon: '⬡', title: 'Screen Sharing', desc: 'Share your screen instantly with a single click. Switch back to camera anytime.' },
  ]

  const stats = [
    { value: 'HD', label: 'Video Quality' },
    { value: 'AI', label: 'Powered' },
    { value: '<1s', label: 'Join Time' },
    { value: '∞', label: 'Participants' },
  ]

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        .ms-nav-link {
          color: rgba(226,232,240,0.6);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: color 0.2s;
          font-family: 'DM Sans', sans-serif;
          background: none; border: none; padding: 0;
        }
        .ms-nav-link:hover { color: #e2e8f0; }

        .ms-cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #6366f1;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.03em;
          border: none;
          border-radius: 14px;
          padding: 14px 28px;
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s, background 0.18s;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }
        .ms-cta-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .ms-cta-primary:hover { background: #4f52e0; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.45); }
        .ms-cta-primary:hover::before { opacity: 1; }
        .ms-cta-primary:active { transform: translateY(0); }

        .ms-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent;
          color: rgba(226,232,240,0.75);
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 15px;
          border: 1px solid rgba(226,232,240,0.15);
          border-radius: 14px;
          padding: 13px 24px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
          text-decoration: none;
        }
        .ms-cta-ghost:hover { border-color: rgba(226,232,240,0.35); color: #e2e8f0; background: rgba(255,255,255,0.04); }

        .ms-feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px 28px;
          transition: border-color 0.25s, transform 0.25s, background 0.25s;
          cursor: default;
        }
        .ms-feature-card:hover {
          border-color: rgba(99,102,241,0.35);
          background: rgba(99,102,241,0.05);
          transform: translateY(-4px);
        }

        .ms-stat { text-align: center; }
        .ms-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 800;
          background: linear-gradient(135deg, #e2e8f0, #6366f1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 8px;
        }
        .ms-stat-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(226,232,240,0.4);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 500;
        }

        .ms-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 999px;
          padding: 6px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #a5b4fc;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .ms-mockup {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          overflow: hidden;
          position: relative;
        }
        .ms-mockup-bar {
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 12px 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .ms-dot { width: 10px; height: 10px; border-radius: 50%; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .anim-fade-up { animation: fadeUp 0.7s ease both; }
        .anim-fade-up-1 { animation: fadeUp 0.7s 0.1s ease both; }
        .anim-fade-up-2 { animation: fadeUp 0.7s 0.2s ease both; }
        .anim-fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .anim-float { animation: float 5s ease-in-out infinite; }

        .ms-mobile-menu {
          display: none;
          position: fixed; inset: 0; z-index: 200;
          background: rgba(9,9,18,0.97);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
        }
        .ms-mobile-menu.open { display: flex; }
        .ms-mobile-menu .ms-nav-link { font-size: 22px; font-weight: 600; }

        @media (max-width: 768px) {
          .ms-desktop-nav { display: none !important; }
          .ms-hamburger { display: flex !important; }
          .ms-hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .ms-hero-btns a, .ms-hero-btns button { text-align: center; justify-content: center; }
          .ms-features-grid { grid-template-columns: 1fr !important; }
          .ms-stats-row { grid-template-columns: repeat(2, 1fr) !important; }
          .ms-footer-inner { flex-direction: column !important; gap: 16px !important; text-align: center; }
        }
      `}</style>

      {/* Canvas background */}
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Noise overlay */}
      <div style={s.noise} />

      {/* ── NAV ── */}
      <nav style={{ ...s.nav, background: scrollY > 40 ? 'rgba(9,9,18,0.9)' : 'transparent', backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none', borderBottom: scrollY > 40 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent' }}>
        <div style={s.navInner}>
          {/* Logo */}
          <div style={s.logo}>
            <div style={s.logoMark}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="#6366f1" opacity="0.4"/>
                <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
              </svg>
            </div>
            <span style={s.logoText}>MeetSphere</span>
          </div>

          {/* Desktop nav */}
          <div className="ms-desktop-nav" style={s.navLinks}>
            <button className="ms-nav-link" onClick={() => router('/auth')}>Features</button>
            <button className="ms-nav-link" onClick={() => router('/auth')}>Pricing</button>
            <button className="ms-nav-link" onClick={() => router('/auth')}>About</button>
          </div>

          <div className="ms-desktop-nav" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="ms-nav-link" onClick={() => router('/auth')}>Sign in</button>
            <button className="ms-cta-primary" onClick={() => router('/auth')} style={{ padding: '10px 20px', fontSize: 13 }}>
              Get started →
            </button>
          </div>

          {/* Hamburger */}
          <button className="ms-hamburger" onClick={() => setMenuOpen(true)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`ms-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <button onClick={() => setMenuOpen(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <button className="ms-nav-link" onClick={() => { setMenuOpen(false); router('/auth') }}>Features</button>
        <button className="ms-nav-link" onClick={() => { setMenuOpen(false); router('/auth') }}>Pricing</button>
        <button className="ms-nav-link" onClick={() => { setMenuOpen(false); router('/auth') }}>About</button>
        <button className="ms-nav-link" onClick={() => { setMenuOpen(false); router('/auth') }}>Sign in</button>
        <button className="ms-cta-primary" onClick={() => { setMenuOpen(false); router('/auth') }}>Get started →</button>
      </div>

      {/* ── HERO ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>

          <div className="anim-fade-up" style={{ marginBottom: 24 }}>
            <span className="ms-badge">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Now with AI-powered attendance
            </span>
          </div>

          <h1 className="anim-fade-up-1" style={s.heroTitle}>
            Video calls that<br />
            <span style={s.heroAccent}>think with you</span>
          </h1>

          <p className="anim-fade-up-2" style={s.heroSub}>
            MeetSphere brings HD video, live captions, face attendance,<br className="hide-sm" />
            and AI meeting summaries into one seamless space.
          </p>

          <div className="ms-hero-btns anim-fade-up-3" style={s.heroBtns}>
            <Link to="/auth" className="ms-cta-primary" style={{ fontSize: 15, padding: '15px 32px' }}>
              Start a meeting →
            </Link>
            <button className="ms-cta-ghost" onClick={() => router('/aljk23')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
                <polygon points="6.5,5 11.5,8 6.5,11" fill="currentColor"/>
              </svg>
              Join as guest
            </button>
          </div>

          {/* App mockup */}
          <div className="anim-float" style={{ marginTop: 64, maxWidth: 740, width: '100%' }}>
            <div className="ms-mockup">
              <div className="ms-mockup-bar">
                <div className="ms-dot" style={{ background: '#f87171' }} />
                <div className="ms-dot" style={{ background: '#facc15' }} />
                <div className="ms-dot" style={{ background: '#4ade80' }} />
                <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'rgba(226,232,240,0.3)', fontFamily: 'DM Sans' }}>meetsphere.app/room/abc123</div>
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'rgba(9,9,18,0.5)' }}>
                {[
                  { name: 'Arjun S.', color: '#6366f1' },
                  { name: 'Priya M.', color: '#10b981' },
                  { name: 'Rahul K.', color: '#f59e0b' },
                  { name: 'You', color: '#ec4899', muted: true },
                ].map((p, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: p.name === 'You' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)', minHeight: 100 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: p.color + '22', border: `2px solid ${p.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontFamily: 'Syne', fontWeight: 700, color: p.color }}>
                      {p.name[0]}
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)', fontFamily: 'DM Sans' }}>{p.name}</span>
                    {p.muted && <span style={{ fontSize: 10, color: '#f87171', fontFamily: 'DM Sans', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 999 }}>muted</span>}
                  </div>
                ))}
              </div>
              {/* Control bar */}
              <div style={{ background: 'rgba(9,9,18,0.8)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', justifyContent: 'center', gap: 12 }}>
                {['🎙', '📷', '💬', '🤖', '📋'].map((icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: `1px solid ${i === 0 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                    {icon}
                  </div>
                ))}
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📵</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={s.statsSection}>
        <div style={s.container}>
          <div className="ms-stats-row" style={s.statsRow}>
            {stats.map((st, i) => (
              <div key={i} className="ms-stat">
                <div className="ms-stat-value">{st.value}</div>
                <div className="ms-stat-label">{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={s.featuresSection}>
        <div style={s.container}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span className="ms-badge" style={{ marginBottom: 20 }}>Features</span>
            <h2 style={s.sectionTitle}>Everything your meetings<br />have been missing</h2>
            <p style={s.sectionSub}>Purpose-built tools that make every call more productive.</p>
          </div>

          <div className="ms-features-grid" style={s.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} className="ms-feature-card">
                <div style={{ fontSize: 22, color: '#6366f1', marginBottom: 16, fontFamily: 'monospace' }}>{f.icon}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={s.ctaSection}>
        <div style={s.container}>
          <div style={s.ctaBanner}>
            {/* Glow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '60%', height: '100%', background: 'radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <span className="ms-badge" style={{ marginBottom: 24, position: 'relative' }}>Free to use</span>
            <h2 style={{ ...s.sectionTitle, position: 'relative', marginBottom: 16 }}>Ready to connect?</h2>
            <p style={{ ...s.sectionSub, position: 'relative', marginBottom: 36 }}>Join thousands of teams already using MeetSphere.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <Link to="/auth" className="ms-cta-primary" style={{ fontSize: 15, padding: '15px 36px' }}>
                Create your account →
              </Link>
              <button className="ms-cta-ghost" onClick={() => router('/aljk23')}>
                Try without signup
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={{ ...s.container, ...s.footerInner }}>
          <div className="ms-footer-inner" style={s.footerRow}>
            <div style={s.logo}>
              <div style={s.logoMark}>
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                  <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
                </svg>
              </div>
              <span style={{ ...s.logoText, fontSize: 15 }}>MeetSphere</span>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)', fontFamily: 'DM Sans' }}>
              © 2026 MeetSphere. Built with ♥ and AI.
            </span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'Support'].map(l => (
                <button key={l} className="ms-nav-link" style={{ fontSize: 13 }} onClick={() => router('/auth')}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

const s = {
  root: {
    minHeight: '100vh',
    background: '#090912',
    color: '#e2e8f0',
    fontFamily: "'DM Sans', sans-serif",
    overflowX: 'hidden',
    position: 'relative',
  },
  canvas: {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  noise: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
    opacity: 0.4,
    pointerEvents: 'none',
    zIndex: 1,
  },
  nav: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
  },
  navInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px',
    height: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
  },
  logoMark: {
    width: 36,
    height: 36,
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
  navLinks: {
    display: 'flex',
    gap: 28,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    position: 'relative',
    zIndex: 2,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '120px 24px 80px',
    textAlign: 'center',
  },
  heroInner: {
    maxWidth: 800,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(40px, 7vw, 80px)',
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: '-0.03em',
    color: '#e2e8f0',
    marginBottom: 24,
  },
  heroAccent: {
    background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: {
    fontSize: 'clamp(15px, 2vw, 18px)',
    color: 'rgba(226,232,240,0.55)',
    lineHeight: 1.7,
    marginBottom: 40,
    fontWeight: 300,
  },
  heroBtns: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statsSection: {
    position: 'relative',
    zIndex: 2,
    padding: '60px 24px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.015)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 32,
  },
  featuresSection: {
    position: 'relative',
    zIndex: 2,
    padding: 'clamp(60px, 8vw, 100px) 24px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  featureTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 10,
    letterSpacing: '-0.01em',
  },
  featureDesc: {
    fontSize: 14,
    color: 'rgba(226,232,240,0.45)',
    lineHeight: 1.65,
    fontWeight: 300,
  },
  sectionTitle: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 'clamp(28px, 4vw, 46px)',
    color: '#e2e8f0',
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
    marginBottom: 16,
  },
  sectionSub: {
    fontSize: 16,
    color: 'rgba(226,232,240,0.45)',
    lineHeight: 1.6,
    fontWeight: 300,
  },
  ctaSection: {
    position: 'relative',
    zIndex: 2,
    padding: 'clamp(60px, 8vw, 100px) 24px',
  },
  ctaBanner: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 28,
    padding: 'clamp(40px, 6vw, 80px) 40px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  footer: {
    position: 'relative',
    zIndex: 2,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    padding: '28px 24px',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    width: '100%',
  },
  footerInner: {},
}
