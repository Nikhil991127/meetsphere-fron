import React, { useContext, useState, useEffect, useRef } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'

function HomeComponent() {
  const navigate = useNavigate()
  const [meetingCode, setMeetingCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [codeError, setCodeError] = useState('')
  const canvasRef = useRef(null)
  const inputRef = useRef(null)

  const { addToUserHistory } = useContext(AuthContext)

  /* ── Time-based greeting ── */
  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  /* ── Animated canvas background ── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    let frame = 0

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.4 + 0.1,
    }))

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    let raf
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const t = frame * 0.005
      const gx = W * 0.5 + Math.sin(t * 0.4) * W * 0.15
      const gy = H * 0.4 + Math.cos(t * 0.3) * H * 0.12
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.5)
      g.addColorStop(0, 'rgba(99,102,241,0.09)')
      g.addColorStop(1, 'rgba(99,102,241,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(148,163,184,${p.opacity})`
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - dist / 100)})`
            ctx.lineWidth = 0.5
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

  const handleJoin = async () => {
    if (!meetingCode.trim()) {
      setCodeError('Please enter a meeting code')
      inputRef.current?.focus()
      return
    }
    setCodeError('')
    setJoining(true)
    try {
      await addToUserHistory(meetingCode.trim())
      navigate(`/${meetingCode.trim()}`)
    } catch {
      setJoining(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleJoin() }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/auth')
  }

  const quickActions = [
    { icon: '⬡', label: 'Register Face', sub: 'One-time setup for attendance', path: '/register-face', accent: '#6366f1' },
    { icon: '⬡', label: 'Meeting History', sub: 'View past calls & reports', path: '/history', accent: '#10b981' },
  ]

  const stats = [
    { value: 'HD',  label: 'Video Quality' },
    { value: 'AI',  label: 'Summaries' },
    { value: '👁',  label: 'Face Attend.' },
    { value: '∞',   label: 'Free to use' },
  ]

  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ms-code-input {
          flex: 1; min-width: 0;
          background: transparent;
          border: none; outline: none;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          color: #e2e8f0;
          letter-spacing: 0.08em;
        }
        .ms-code-input::placeholder { color: rgba(226,232,240,0.2); letter-spacing: 0.12em; }

        .ms-join-btn {
          background: #6366f1; color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 13px;
          letter-spacing: 0.04em;
          border: none; border-radius: 10px;
          padding: 11px 20px; cursor: pointer;
          flex-shrink: 0;
          transition: background 0.18s, transform 0.15s, box-shadow 0.18s, opacity 0.2s;
        }
        .ms-join-btn:hover:not(:disabled) { background: #4f52e0; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,0.4); }
        .ms-join-btn:active:not(:disabled) { transform: translateY(0); }
        .ms-join-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ms-nav-link {
          background: none; border: none;
          color: rgba(226,232,240,0.4);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          cursor: pointer; padding: 0;
          transition: color 0.2s;
        }
        .ms-nav-link:hover { color: rgba(226,232,240,0.75); }

        .ms-logout {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.18);
          color: rgba(248,113,113,0.75);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          cursor: pointer; border-radius: 8px;
          padding: 7px 14px;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .ms-logout:hover { background: rgba(239,68,68,0.13); color: #f87171; border-color: rgba(239,68,68,0.3); }

        .ms-quick-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 20px;
          cursor: pointer; text-align: left; width: 100%;
          display: flex; align-items: center; gap: 14px;
          transition: border-color 0.22s, background 0.22s, transform 0.22s;
        }
        .ms-quick-card:hover { border-color: rgba(99,102,241,0.38); background: rgba(99,102,241,0.05); transform: translateY(-2px); }

        .ms-stat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 18px 12px;
          text-align: center;
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }

        .a0{animation:fadeUp 0.5s 0.04s ease both}
        .a1{animation:fadeUp 0.5s 0.12s ease both}
        .a2{animation:fadeUp 0.5s 0.20s ease both}
        .a3{animation:fadeUp 0.5s 0.28s ease both}
        .a4{animation:fadeUp 0.5s 0.36s ease both}

        @media(max-width:600px){
          .quick-grid{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .code-row{flex-direction:column!important}
          .ms-join-btn{width:100%}
        }
      `}</style>

      <canvas ref={canvasRef} style={s.canvas} />
      <div style={s.noise} />

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.logo} onClick={() => navigate('/')} role="button" tabIndex={0}>
            <div style={s.logoMark}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="#6366f1" opacity="0.35"/>
                <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
              </svg>
            </div>
            <span style={s.logoText}>MeetSphere</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button className="ms-nav-link" onClick={() => navigate('/register-face')}>Register Face</button>
            <button className="ms-nav-link" onClick={() => navigate('/history')}>History</button>
            <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.09)' }} />
            <button className="ms-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={s.main}>
        <div style={s.container}>

          {/* Greeting pill */}
          <div className="a0" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.7)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(226,232,240,0.35)', fontFamily: "'Syne',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {greeting}
            </span>
          </div>

          {/* Headline */}
          <h1 className="a1" style={s.title}>
            Ready to <span style={s.accent}>connect?</span>
          </h1>
          <p className="a2" style={s.sub}>
            Enter a code to jump in, or explore your actions below.
          </p>

          {/* Meeting code input */}
          <div className="a2" style={{ marginTop: 36, maxWidth: 520 }}>
            <div style={{
              ...s.inputBox,
              borderColor: inputFocused ? 'rgba(99,102,241,0.6)' : codeError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.09)',
              boxShadow: inputFocused ? '0 0 0 3px rgba(99,102,241,0.11)' : 'none',
              background: inputFocused ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.04)',
            }}>
              {/* Grid icon */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="rgba(99,102,241,0.6)" strokeWidth="1.2"/>
                <path d="M5 8h6M8 5v6" stroke="rgba(99,102,241,0.45)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>

              <div className="code-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <input
                  ref={inputRef}
                  className="ms-code-input"
                  placeholder="abc-xyz-123"
                  value={meetingCode}
                  onChange={e => { setMeetingCode(e.target.value); setCodeError('') }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={handleKey}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button className="ms-join-btn" onClick={handleJoin} disabled={joining}>
                  {joining
                    ? <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <svg style={{ animation:'spin 0.8s linear infinite' }} width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                          <path d="M7 2a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Joining…
                      </span>
                    : 'Join now →'
                  }
                </button>
              </div>
            </div>
            {codeError
              ? <p style={{ marginTop: 8, fontSize: 12, color: '#fca5a5', fontFamily:"'DM Sans',sans-serif", paddingLeft: 4 }}>⚠ {codeError}</p>
              : <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(226,232,240,0.2)', fontFamily:"'DM Sans',sans-serif", paddingLeft: 4 }}>Press Enter to join instantly</p>
            }
          </div>

          {/* Divider */}
          <div className="a3" style={{ display:'flex', alignItems:'center', gap:14, margin:'40px 0 22px' }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize:11, fontWeight:600, color:'rgba(226,232,240,0.18)', fontFamily:"'Syne',sans-serif", letterSpacing:'0.1em', textTransform:'uppercase' }}>quick actions</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Quick action cards */}
          <div className="a3 quick-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:28 }}>
            {quickActions.map((a, i) => (
              <button key={i} className="ms-quick-card" onClick={() => navigate(a.path)}>
                <div style={{ width:42, height:42, borderRadius:12, background:`${a.accent}18`, border:`1px solid ${a.accent}28`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:a.accent, flexShrink:0 }}>
                  {a.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', fontFamily:"'Syne',sans-serif", marginBottom:3 }}>{a.label}</div>
                  <div style={{ fontSize:12, color:'rgba(226,232,240,0.32)', fontFamily:"'DM Sans',sans-serif" }}>{a.sub}</div>
                </div>
                <span style={{ color:'rgba(226,232,240,0.18)', fontSize:18, flexShrink:0 }}>›</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="a4 stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {stats.map((st, i) => (
              <div key={i} className="ms-stat-card">
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, background:'linear-gradient(135deg,#e2e8f0,#6366f1)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:5 }}>
                  {st.value}
                </div>
                <div style={{ fontSize:10, color:'rgba(226,232,240,0.28)', fontFamily:"'DM Sans',sans-serif", letterSpacing:'0.07em', textTransform:'uppercase' }}>
                  {st.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <span style={s.footerTxt}>© 2026 MeetSphere</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'pulse 2.4s ease-in-out infinite' }} />
          <span style={s.footerTxt}>All systems online</span>
        </div>
      </footer>
    </div>
  )
}

const s = {
  root: { minHeight:'100vh', background:'#090912', color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' },
  canvas: { position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0 },
  noise: { position:'fixed', inset:0, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`, opacity:0.4, pointerEvents:'none', zIndex:1 },
  nav: { position:'relative', zIndex:10, borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(9,9,18,0.85)', backdropFilter:'blur(20px)' },
  navInner: { maxWidth:1000, margin:'0 auto', padding:'0 24px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' },
  logo: { display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none' },
  logoMark: { width:34, height:34, borderRadius:9, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'center' },
  logoText: { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:17, color:'#e2e8f0', letterSpacing:'-0.02em' },
  main: { flex:1, position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 24px 24px' },
  container: { maxWidth:600, width:'100%' },
  title: { fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(36px,6vw,58px)', lineHeight:1.08, letterSpacing:'-0.03em', color:'#e2e8f0', marginBottom:14 },
  accent: { background:'linear-gradient(135deg,#6366f1 0%,#10b981 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' },
  sub: { fontSize:15, color:'rgba(226,232,240,0.4)', lineHeight:1.65, fontWeight:300 },
  inputBox: { display:'flex', alignItems:'center', gap:12, border:'1px solid', borderRadius:16, padding:'12px 14px', transition:'border-color 0.2s, box-shadow 0.2s, background 0.2s' },
  footer: { position:'relative', zIndex:2, borderTop:'1px solid rgba(255,255,255,0.05)', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  footerTxt: { fontSize:11, color:'rgba(226,232,240,0.18)', fontFamily:"'DM Sans',sans-serif" },
}

export default withAuth(HomeComponent)
