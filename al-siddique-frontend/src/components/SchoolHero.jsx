"use client";

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import PremiumLogo from './PremiumLogo';

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function splitSchoolName(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['SCHOOL', 'OPERATING SYSTEM'];
  if (words.length === 1) return [words[0].toUpperCase(), ''];
  if (words.length === 2) return [words[0].toUpperCase(), words[1].toUpperCase()];
  if (words.length === 3) return [words[0].toUpperCase(), words.slice(1).join(' ').toUpperCase()];
  return [words.slice(0, 2).join(' ').toUpperCase(), words.slice(2).join(' ').toUpperCase()];
}

export default function SchoolHero({ schoolName, schoolLogo, compact = false }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fullDateLabel = now.toLocaleDateString('en-GB');
  const formatTime = (date) => {
    let h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${m} ${ampm}`;
  };

  const initials = useMemo(() => getInitials(schoolName), [schoolName]);
  const titleLines = useMemo(() => splitSchoolName(schoolName), [schoolName]);

  const shellPadding = compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6 xl:p-7';
  const contentGap = compact ? 'gap-4 xl:gap-5' : 'gap-5 xl:gap-6';
  const titleSize = compact ? 'clamp(1.1rem, 1.6vw, 1.35rem)' : 'clamp(1.25rem, 1.8vw, 1.6rem)';
  const secondLineSize = compact ? 'clamp(1.2rem, 2.1vw, 1.72rem)' : 'clamp(1.4rem, 2.35vw, 1.98rem)';
  const heroLogoSize = compact ? 58 : 72;
  const cardWidth = compact ? 'min(100%, 250px)' : 'min(100%, 280px)';

  const generateDays = (date) => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      days.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        isToday: i === 0
      });
    }
    return days;
  };
  const daysList = generateDays(now);

  return (
    <section
      className={`super-reveal relative overflow-hidden rounded-[30px] border border-slate-700/60 bg-gradient-to-br from-slate-900/95 via-slate-900/88 to-slate-800/72 ${shellPadding} shadow-2xl`}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className={`school-hero-grid relative grid grid-cols-1 items-center ${contentGap} lg:grid-cols-[1fr_0.8fr]`}>
        <div className={`flex items-center ${compact ? 'gap-4 sm:gap-4.5' : 'gap-5 sm:gap-6'}`}>
          <div
            className="super-reveal relative shrink-0"
            style={{ transformStyle: 'preserve-3d', perspective: '1200px' }}
          >
            <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-amber-400/20 via-cyan-500/10 to-transparent blur-2xl" />
            <div className="absolute inset-0 animate-pulse rounded-full border border-amber-300/20" />
            {schoolLogo && schoolLogo !== 'null' ? (
              <PremiumLogo src={schoolLogo} size={heroLogoSize} variant="hero" />
            ) : (
              <div className={`flex items-center justify-center ${compact ? 'h-24 w-24' : 'h-28 w-28'} rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-400/20 to-cyan-500/20 text-xl sm:text-2xl font-black text-white shadow-xl overflow-hidden`} style={{ lineHeight: 1 }}>
                {initials}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.38em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              System Online
            </p>

            <h1
              className="super-reveal mt-3 font-black tracking-tight text-white"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                lineHeight: 0.96,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: titleSize,
                  color: '#F9FAFB',
                  letterSpacing: '0.04em',
                  marginBottom: compact ? 2 : 4,
                  whiteSpace: 'normal',
                  wordBreak: 'normal',
                  lineHeight: 1.2,
                }}
              >
                {titleLines[0]}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: secondLineSize,
                  lineHeight: 1.1,
                  color: '#FFFFFF',
                  textShadow: '0 0 24px rgba(200,153,26,0.18)',
                  whiteSpace: 'normal',
                  wordBreak: 'normal',
                }}
              >
                {titleLines[1] || ''}
              </span>
            </h1>

            <p className={`mt-3 ${compact ? 'max-w-[30rem]' : 'max-w-[36rem]'} text-sm leading-6 text-slate-400 sm:text-[14px]`}>
              {compact
                ? 'Live school operations, records, and calendar updates in a tighter premium control header.'
                : 'Admin dashboard for school operations, live records, and real-time academic oversight.'}
            </p>
          </div>
        </div>

        <div className="school-hero-calendar super-reveal mx-auto w-full justify-self-center lg:ml-auto lg:mr-2 lg:justify-self-end" style={{ maxWidth: compact ? '130px' : '150px' }}>
          <div 
            className="relative flex flex-col rounded-[24px] overflow-hidden"
            style={{
              width: compact ? '130px' : '150px',
              height: compact ? '150px' : '170px',
              background: 'linear-gradient(160deg, #0f172a, #020617)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
              padding: '12px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
            }}
          >
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', borderRadius: '12px', padding: '2px' }}>
                <div style={{ padding: '3px 8px', background: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', color: '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>Today</div>
              </div>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '400' }}>+</div>
            </div>

            {/* Middle: Month, Date and Time */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '2px' }}>
              <div style={{ fontSize: compact ? '14px' : '16px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0px', textTransform: 'uppercase' }}>{now.toLocaleDateString('en-US', { month: 'short' })}</div>
              <div style={{ fontSize: compact ? '38px' : '44px', fontWeight: '300', color: '#fff', letterSpacing: '-1px', lineHeight: 1.1 }}>{now.getDate()}</div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '1px' }}>
                {now.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 'auto' }}>
              <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 'bold', background: 'rgba(0,0,0,0.4)', padding: '5px 10px', borderRadius: '10px', letterSpacing: '0.2px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {formatTime(now)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
