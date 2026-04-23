import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import server from '../environment';

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings,    setMeetings]    = useState([]);
    const [attendance,  setAttendance]  = useState({});
    const [expanded,    setExpanded]    = useState({});
    const [loadingCode, setLoadingCode] = useState(null);
    const canvasRef = useRef(null);
    const navigate  = useNavigate();

    /* ── Particle canvas — matches home/landing exactly ── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let W = canvas.width  = window.innerWidth;
        let H = canvas.height = window.innerHeight;
        let frame = 0;
        const particles = Array.from({ length: 35 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 1.5 + 0.3,
            dx: (Math.random() - 0.5) * 0.25,
            dy: (Math.random() - 0.5) * 0.25,
            opacity: Math.random() * 0.4 + 0.1,
        }));
        const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        let raf;
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            const t  = frame * 0.005;
            const gx = W * 0.5 + Math.sin(t * 0.4) * W * 0.15;
            const gy = H * 0.4 + Math.cos(t * 0.3) * H * 0.12;
            const g  = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.5);
            g.addColorStop(0, 'rgba(99,102,241,0.08)');
            g.addColorStop(1, 'rgba(99,102,241,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            particles.forEach(p => {
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(148,163,184,${p.opacity})`; ctx.fill();
            });
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            frame++; raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    useEffect(() => {
        (async () => {
            try { setMeetings(await getHistoryOfUser()); } catch {}
        })();
    }, []); // eslint-disable-line

    const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const handleExpand = async (code) => {
        const isOpen = expanded[code];
        setExpanded(prev => ({ ...prev, [code]: !isOpen }));
        if (!isOpen && !attendance[code]) {
            setLoadingCode(code);
            try {
                const res  = await fetch(`${server}/api/v1/ai/attendance/report?meetingCode=${encodeURIComponent(code)}`);
                const data = await res.json();
                setAttendance(prev => ({ ...prev, [code]: data.records || [] }));
            } catch {
                setAttendance(prev => ({ ...prev, [code]: [] }));
            } finally { setLoadingCode(null); }
        }
    };

    const downloadCSV = (code) => {
        const records = attendance[code] || [];
        const header  = 'Name,Join Time,Leave Time,Duration (min),Confidence,Marked By\n';
        const rows    = records.map(r => [
            r.username,
            new Date(r.joinTime).toLocaleString(),
            r.leaveTime ? new Date(r.leaveTime).toLocaleString() : '—',
            r.duration != null ? r.duration : '—',
            r.confidence + '%',
            r.markedBy,
        ].join(',')).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: `attendance_${code}.csv` }).click();
        URL.revokeObjectURL(url);
    };

    const totalAttendees = Object.values(attendance).reduce((a, r) => a + r.length, 0);

    return (
        <div style={s.root}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .h-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; overflow: hidden; transition: border-color 0.25s, transform 0.25s, background 0.25s; margin-bottom: 12px; }
                .h-card:hover { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.04); transform: translateY(-2px); }

                .h-expand-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(226,232,240,0.5); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; font-family: 'Syne', sans-serif; letter-spacing: 0.04em; flex-shrink: 0; }
                .h-expand-btn:hover { background: rgba(99,102,241,0.15); color: #a5b4fc; border-color: rgba(99,102,241,0.3); }

                .h-csv-btn { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #6ee7b7; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; font-family: 'Syne', sans-serif; letter-spacing: 0.04em; flex-shrink: 0; }
                .h-csv-btn:hover { background: rgba(16,185,129,0.2); }

                .h-back { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(226,232,240,0.5); border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.2s, color 0.2s; font-family: 'DM Sans', sans-serif; }
                .h-back:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }

                .h-table { width: 100%; border-collapse: collapse; }
                .h-table th { padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 600; color: rgba(226,232,240,0.28); letter-spacing: 0.09em; text-transform: uppercase; font-family: 'Syne', sans-serif; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .h-table td { padding: 13px 20px; font-size: 13px; color: rgba(226,232,240,0.65); border-bottom: 1px solid rgba(255,255,255,0.04); font-family: 'DM Sans', sans-serif; }
                .h-table tr:last-child td { border-bottom: none; }
                .h-table tbody tr:hover td { background: rgba(255,255,255,0.02); }

                @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                .fu0 { animation: fadeUp 0.45s ease both; }
                .fu1 { animation: fadeUp 0.45s 0.08s ease both; }
                .fu2 { animation: fadeUp 0.45s 0.16s ease both; }
            `}</style>

            <canvas ref={canvasRef} style={s.canvas} />

            {/* Nav */}
            <nav style={s.nav}>
                <div style={s.navInner}>
                    <div style={s.logoWrap} onClick={() => navigate('/')} role="button" tabIndex={0}>
                        <div style={s.logoMark}>
                            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                                <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                                <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="#6366f1" opacity="0.35"/>
                                <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
                            </svg>
                        </div>
                        <span style={s.logoText}>MeetSphere</span>
                    </div>
                    <button className="h-back" onClick={() => navigate('/home')}>← Home</button>
                </div>
            </nav>

            {/* Main */}
            <main style={s.main}>
                <div style={s.container}>

                    {/* Page header */}
                    <div className="fu0" style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.7)' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(226,232,240,0.28)', fontFamily: "'Syne',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your sessions</span>
                        </div>
                        <h1 style={s.title}>Meeting <span style={s.accent}>History</span></h1>
                        <p style={s.sub}>Expand any session to view attendance records. Download CSV anytime.</p>
                    </div>

                    {/* Stats strip */}
                    {meetings.length > 0 && (
                        <div className="fu1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
                            {[
                                { val: meetings.length,   lab: 'Total meetings' },
                                { val: totalAttendees || '—', lab: 'Attendees tracked' },
                                { val: formatDate(meetings[0]?.date), lab: 'Most recent' },
                            ].map((st, i) => (
                                <div key={i} style={s.statCard}>
                                    <div style={s.statVal}>{st.val}</div>
                                    <div style={s.statLab}>{st.lab}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {meetings.length === 0 && (
                        <div className="fu2" style={s.empty}>
                            <svg width="48" height="48" viewBox="0 0 22 22" fill="none" style={{ opacity: 0.15, marginBottom: 16 }}>
                                <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.2"/>
                            </svg>
                            <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: 'rgba(226,232,240,0.35)', marginBottom: 6 }}>No meetings yet</p>
                            <p style={{ fontSize: 13, color: 'rgba(226,232,240,0.2)', fontFamily: "'DM Sans',sans-serif", marginBottom: 20 }}>Join a call to see your history here.</p>
                            <button className="h-back" onClick={() => navigate('/home')}>Join a meeting →</button>
                        </div>
                    )}

                    {/* Cards */}
                    <div className="fu2">
                        {meetings.map((m) => {
                            const code    = m.meetingCode;
                            const isOpen  = !!expanded[code];
                            const records = attendance[code] || [];
                            const loading = loadingCode === code;

                            return (
                                <div key={code} className="h-card">
                                    {/* Header row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', cursor: 'pointer' }} onClick={() => handleExpand(code)}>
                                        {/* Icon */}
                                        <div style={s.meetIcon}>
                                            <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                                                <polygon points="11,1 21,6.5 21,15.5 11,21 1,15.5 1,6.5" fill="none" stroke="#6366f1" strokeWidth="1.5"/>
                                                <circle cx="11" cy="11" r="2.5" fill="#6366f1"/>
                                            </svg>
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: '#e2e8f0', letterSpacing: '0.06em', marginBottom: 3 }}>{code}</div>
                                            <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.28)', fontFamily: "'DM Sans',sans-serif" }}>{formatDate(m.date)}</div>
                                        </div>

                                        {/* Count badge */}
                                        {records.length > 0 && (
                                            <div style={s.badge}>{records.length} present</div>
                                        )}

                                        {/* CSV */}
                                        {isOpen && records.length > 0 && (
                                            <button className="h-csv-btn" onClick={e => { e.stopPropagation(); downloadCSV(code); }}>↓ CSV</button>
                                        )}

                                        {/* Expand */}
                                        <button className="h-expand-btn" onClick={e => { e.stopPropagation(); handleExpand(code); }}>
                                            {isOpen ? '▲ Hide' : '▼ View'}
                                        </button>
                                    </div>

                                    {/* Attendance table */}
                                    {isOpen && (
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            {loading ? (
                                                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.2s ease infinite' }} />
                                                    <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.3)', fontFamily: "'DM Sans',sans-serif" }}>Loading attendance…</span>
                                                </div>
                                            ) : records.length === 0 ? (
                                                <p style={{ padding: '18px 22px', fontSize: 13, color: 'rgba(226,232,240,0.25)', fontFamily: "'DM Sans',sans-serif" }}>No attendance recorded for this meeting.</p>
                                            ) : (
                                                <table className="h-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Name</th>
                                                            <th>Joined</th>
                                                            <th>Duration</th>
                                                            <th>Confidence</th>
                                                            <th>Method</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {records.map((r, i) => (
                                                            <tr key={i}>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <div style={s.avatar}>{r.username[0].toUpperCase()}</div>
                                                                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{r.username}</span>
                                                                    </div>
                                                                </td>
                                                                <td>{formatTime(r.joinTime)}</td>
                                                                <td>{r.duration != null ? `${r.duration} min` : '—'}</td>
                                                                <td>
                                                                    <span style={{
                                                                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                                        fontFamily: "'Syne',sans-serif",
                                                                        background: r.markedBy === 'face' ? 'rgba(74,222,128,0.12)' : 'rgba(250,204,21,0.12)',
                                                                        color:      r.markedBy === 'face' ? '#4ade80'              : '#facc15',
                                                                        border:     r.markedBy === 'face' ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(250,204,21,0.25)',
                                                                    }}>{r.confidence}%</span>
                                                                </td>
                                                                <td style={{ color: r.markedBy === 'face' ? 'rgba(165,180,252,0.6)' : 'rgba(226,232,240,0.3)', textTransform: 'capitalize' }}>{r.markedBy}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer style={s.footer}>
                <span style={s.footerTxt}>© 2026 MeetSphere</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                    <span style={s.footerTxt}>All systems online</span>
                </div>
            </footer>
        </div>
    );
}

const s = {
    root:     { minHeight: '100vh', background: '#090912', color: '#e2e8f0', fontFamily: "'DM Sans',sans-serif", position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    canvas:   { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 },
    nav:      { position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(9,9,18,0.85)', backdropFilter: 'blur(20px)' },
    navInner: { maxWidth: 960, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' },
    logoMark: { width: 34, height: 34, borderRadius: 9, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logoText: { fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: '#e2e8f0', letterSpacing: '-0.02em' },
    main:     { flex: 1, position: 'relative', zIndex: 2, padding: '48px 24px 32px' },
    container:{ maxWidth: 960, margin: '0 auto', width: '100%' },
    title:    { fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 'clamp(30px,5vw,46px)', lineHeight: 1.08, letterSpacing: '-0.03em', color: '#e2e8f0', marginBottom: 10 },
    accent:   { background: 'linear-gradient(135deg,#6366f1 0%,#10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    sub:      { fontSize: 14, color: 'rgba(226,232,240,0.38)', lineHeight: 1.65, fontWeight: 300 },
    statCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px' },
    statVal:  { fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4, background: 'linear-gradient(135deg,#e2e8f0,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    statLab:  { fontSize: 11, color: 'rgba(226,232,240,0.28)', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif" },
    meetIcon: { width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    badge:    { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, fontFamily: "'Syne',sans-serif", flexShrink: 0 },
    avatar:   { width: 26, height: 26, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0, fontFamily: "'Syne',sans-serif" },
    empty:    { textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    footer:   { position: 'relative', zIndex: 2, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    footerTxt:{ fontSize: 11, color: 'rgba(226,232,240,0.18)', fontFamily: "'DM Sans',sans-serif" },
};
