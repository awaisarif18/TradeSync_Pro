/* TradeSync Pro · Slave Desktop App (PySide 6 mock) — Direction A
   Three artboards rendered at 1400×900 (the design target):
     1. Login screen
     2. Dashboard · Empty state (no master subscribed)
     3. Dashboard · Active state (Sasha Ng, listening live)
*/

const SD = {
  bg: '#0a0e0d',
  surface: '#11181a',
  surface2: '#18222a',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.14)',
  text: '#e8eef0',
  text2: '#8a9ba0',
  text3: '#5d6d72',
  accent: '#00c389',
  accent2: '#00a378',
  accentSoft: 'rgba(0,195,137,0.12)',
  violet: '#7c5cff',
  violetSoft: 'rgba(124,92,255,0.12)',
  danger: '#ff5a4a',
  dangerSoft: 'rgba(255,90,74,0.12)',
  warn: '#ffb547',
  warnSoft: 'rgba(255,181,71,0.12)',
};

const sdSans = `'Inter', -apple-system, system-ui, sans-serif`;
const sdMono = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`;

/* ───────────────────── Pulse styles (CSS keyframe injected once) ───────────────────── */
function SdStyles() {
  return (
    <style>{`
      @keyframes sd-pulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(0,195,137,0.12); }
        50%      { opacity: 0.55; box-shadow: 0 0 0 5px rgba(0,195,137,0.08); }
      }
      @keyframes sd-pulse-warn {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.5; }
      }
      @keyframes sd-sweep {
        0%   { background-position: -200px 0; }
        100% { background-position: 200px 0; }
      }
      .sd-pulse-dot   { animation: sd-pulse 2s ease-in-out infinite; }
      .sd-row:hover   { background: rgba(255,255,255,0.025); }
      .sd-row:hover .sd-row-action { opacity: 1; }
      .sd-card:hover  { border-color: rgba(255,255,255,0.14) !important; }
      .sd-nav-item:hover { background: rgba(0,195,137,0.06); }
      .sd-nav-item:hover .sd-nav-icon { color: ${SD.accent}; }
      .sd-icon-btn:hover { background: rgba(255,90,74,0.12); color: ${SD.danger}; }
      .sd-chip-x:hover { color: ${SD.danger} !important; }
      .sd-input:focus  { border-color: ${SD.accent}; background: #14202b; outline: none; }
      .sd-btn-primary:hover { background: ${SD.accent2}; }
      .sd-btn-ghost:hover   { background: rgba(255,255,255,0.04); }
      .sd-stop-btn-band {
        background: linear-gradient(90deg, transparent 0%, ${SD.accent} 50%, transparent 100%);
        background-size: 200px 2px;
        animation: sd-sweep 1.6s linear infinite;
      }
    `}</style>
  );
}

/* ───────────────────── Primitives ───────────────────── */

function StatusPill({ variant = 'listening', label, mono = true }) {
  const v = {
    listening: { c: SD.accent, dot: 'pulse' },
    live:      { c: SD.accent, dot: 'pulse' },
    broadcasting: { c: SD.accent, dot: 'pulse' },
    idle:      { c: SD.text3, dot: 'hollow' },
    notSub:    { c: SD.text3, dot: 'hollow' },
    reconnect: { c: SD.warn,  dot: 'warn' },
    error:     { c: SD.danger, dot: 'solid' },
  }[variant] || { c: SD.accent, dot: 'pulse' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontFamily: mono ? sdMono : sdSans,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.6px',
      textTransform: 'uppercase',
      color: v.c, border: `1px solid ${v.c}`,
      padding: '4px 10px', borderRadius: 999,
      background: 'transparent',
    }}>
      <Dot variant={v.dot} color={v.c} />
      {label}
    </span>
  );
}

function Dot({ variant = 'pulse', color = SD.accent, size = 7 }) {
  const base = { width: size, height: size, borderRadius: '50%', display: 'inline-block', flex: '0 0 auto' };
  if (variant === 'hollow') return <span style={{ ...base, border: `1.5px solid ${color}` }} />;
  if (variant === 'solid')  return <span style={{ ...base, background: color }} />;
  if (variant === 'warn')   return <span className="sd-pulse-dot" style={{ ...base, background: color }} />;
  return <span className="sd-pulse-dot" style={{ ...base, background: color }} />;
}

function MicroLabel({ children, color = SD.text3, style = {} }) {
  return (
    <div style={{
      fontFamily: sdSans, fontSize: 10, fontWeight: 600, letterSpacing: '0.6px',
      textTransform: 'uppercase', color, ...style,
    }}>{children}</div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block', fontFamily: sdSans, fontSize: 12, fontWeight: 500,
      color: SD.text2, marginBottom: 6, letterSpacing: '-0.005em',
    }}>{children}</label>
  );
}

function Input({ value, placeholder, type = 'text', mono = false, suffix = null, error = false }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="sd-input"
        defaultValue={value}
        placeholder={placeholder}
        type={type}
        style={{
          width: '100%',
          background: SD.surface2,
          border: `1px solid ${error ? SD.danger : SD.line}`,
          borderRadius: 8,
          color: SD.text,
          fontFamily: mono ? sdMono : sdSans,
          fontSize: 13,
          padding: '10px 12px',
          paddingRight: suffix ? 36 : 12,
          letterSpacing: '-0.005em',
        }}
      />
      {suffix && (
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: SD.text3, fontSize: 14, pointerEvents: 'none',
        }}>{suffix}</div>
      )}
    </div>
  );
}

function Spinbox({ value = '1.00', width = 96 }) {
  return (
    <div style={{ position: 'relative', width, display: 'inline-block' }}>
      <input
        className="sd-input"
        defaultValue={value}
        style={{
          width: '100%', background: SD.surface2, border: `1px solid ${SD.line}`,
          borderRadius: 8, color: SD.text, fontFamily: sdMono, fontSize: 13,
          padding: '8px 28px 8px 12px', textAlign: 'left',
        }}
      />
      <div style={{
        position: 'absolute', right: 4, top: 4, bottom: 4,
        width: 18, display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SD.text3, fontSize: 8 }}>▲</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SD.text3, fontSize: 8 }}>▼</div>
      </div>
    </div>
  );
}

function Dropdown({ value, width = 'auto', placeholder = 'Select…' }) {
  return (
    <div style={{ position: 'relative', width, display: 'inline-block' }}>
      <div style={{
        background: SD.surface2, border: `1px solid ${SD.line}`,
        borderRadius: 8, color: value ? SD.text : SD.text3,
        fontFamily: sdSans, fontSize: 13,
        padding: '10px 32px 10px 12px',
        cursor: 'pointer', userSelect: 'none',
      }}>
        {value || placeholder}
      </div>
      <div style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        color: SD.text3, fontSize: 10, pointerEvents: 'none',
      }}>▾</div>
    </div>
  );
}

function TradeChip({ side }) {
  const buy = side === 'BUY';
  return (
    <span style={{
      fontFamily: sdSans, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
      color: buy ? SD.accent : SD.danger,
      background: buy ? SD.accentSoft : SD.dangerSoft,
      padding: '2px 8px', borderRadius: 4,
    }}>{side}</span>
  );
}

function StatusChip({ kind }) {
  const cfg = {
    OPEN:    { c: SD.accent, bg: SD.accentSoft, dot: true },
    CLOSED:  { c: SD.text3, bg: 'rgba(255,255,255,0.06)' },
    IGNORED: { c: SD.text3, bg: 'rgba(255,255,255,0.06)', italic: true },
    FAILED:  { c: SD.danger, bg: SD.dangerSoft },
  }[kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: sdSans, fontSize: 10, fontWeight: 600,
      color: cfg.c, background: cfg.bg, padding: '2px 8px', borderRadius: 4,
      fontStyle: cfg.italic ? 'italic' : 'normal',
    }}>
      {cfg.dot && <Dot variant="pulse" color={SD.accent} size={6} />}
      {kind}
    </span>
  );
}

function Card({ children, accent, style = {} }) {
  const accentStyles = accent === 'violet'
    ? { borderColor: SD.violet, boxShadow: `0 0 0 1px ${SD.violetSoft} inset` }
    : {};
  return (
    <div className="sd-card" style={{
      background: SD.surface, border: `1px solid ${SD.line}`,
      borderRadius: 10, ...accentStyles, ...style,
    }}>{children}</div>
  );
}

function Btn({ kind = 'primary', children, full = false, danger = false, disabled = false, style = {}, leftIcon, rightIcon, height = 36 }) {
  const base = {
    fontFamily: sdSans, fontWeight: 600, fontSize: 13,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: 8, padding: '0 16px', height,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: full ? '100%' : 'auto',
    transition: 'all 120ms ease',
    letterSpacing: '-0.005em',
    opacity: disabled ? 0.5 : 1,
  };
  let kindStyles = {};
  if (kind === 'primary') kindStyles = { background: SD.accent, color: '#02110b' };
  if (kind === 'ghost')   kindStyles = { background: 'transparent', color: SD.text, border: `1px solid ${SD.line2}` };
  if (kind === 'stop')    kindStyles = { background: SD.dangerSoft, color: SD.danger, border: `1px solid ${SD.danger}` };

  const cls = kind === 'primary' ? 'sd-btn-primary' : kind === 'ghost' ? 'sd-btn-ghost' : '';
  return (
    <button className={cls} disabled={disabled} style={{ ...base, ...kindStyles, ...style }}>
      {leftIcon}{children}{rightIcon}
    </button>
  );
}

/* ───────────────────── Sidebar nav (56px) ───────────────────── */

const NavIcon = {
  copy: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 l1-8z"/>
    </svg>
  ),
  symbols: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7 H4 m0 0 l3-3 m-3 3 l3 3"/>
      <path d="M15 17 H20 m0 0 l-3-3 m3 3 l-3 3"/>
      <path d="M4 17 H20"/>
      <path d="M4 7 H20" opacity="0"/>
    </svg>
  ),
  risk: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L4 6 v6 c0 4.5 3.5 8.5 8 9 c4.5-0.5 8-4.5 8-9 V6 z"/>
    </svg>
  ),
  trades: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6 H20 M4 12 H20 M4 18 H14"/>
    </svg>
  ),
  help: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9.5 9 c0-1.5 1-2.5 2.5-2.5 s2.5 1 2.5 2.5 c0 1.5-2.5 2-2.5 4 M12 17 v0.5"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 H5 v16 h4"/>
      <path d="M14 8 l4 4 -4 4 M9 12 H18"/>
    </svg>
  ),
};

function Sidebar({ active = 'copy', items }) {
  const defaultItems = [
    { id: 'copy', label: 'COPY', icon: NavIcon.copy },
    { id: 'symbols', label: 'SYMBOLS', icon: NavIcon.symbols },
    { id: 'risk', label: 'RISK', icon: NavIcon.risk },
    { id: 'trades', label: 'TRADES', icon: NavIcon.trades },
  ];
  const list = items || defaultItems;
  return (
    <div style={{
      width: 56, background: SD.surface, borderRight: `1px solid ${SD.line}`,
      display: 'flex', flexDirection: 'column', flex: '0 0 56px',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {list.map(it => {
          const isActive = it.id === active;
          return (
            <div key={it.id} className="sd-nav-item" style={{
              position: 'relative', height: 56,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, cursor: 'pointer',
              background: isActive ? SD.accentSoft : 'transparent',
            }}>
              {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: SD.accent }} />}
              <div className="sd-nav-icon" style={{ color: isActive ? SD.accent : SD.text3 }}>{it.icon}</div>
              <div style={{
                fontFamily: sdSans, fontSize: 9, fontWeight: 600, letterSpacing: '0.6px',
                color: isActive ? SD.accent : SD.text3,
              }}>{it.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0 16px' }}>
        <div className="sd-nav-item" style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: SD.text3, cursor: 'pointer',
        }}>{NavIcon.help}</div>
        <div className="sd-nav-item" style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: SD.text3, cursor: 'pointer',
        }}>{NavIcon.logout}</div>
      </div>
    </div>
  );
}

/* ───────────────────── Title bar (40px) ───────────────────── */
function TitleBar({ role = 'Slave Node' }) {
  return (
    <div style={{
      height: 40, display: 'flex', alignItems: 'center',
      background: SD.surface, borderBottom: `1px solid ${SD.line}`,
      padding: '0 12px',
      flex: '0 0 40px',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          width: 18, height: 18, borderRadius: 5, background: SD.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#02110b', fontSize: 12, fontWeight: 700,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z"/></svg>
        </div>
        <div style={{ fontFamily: sdSans, fontSize: 12, fontWeight: 600, color: SD.text, letterSpacing: '-0.005em' }}>
          TradeSync<span style={{ color: SD.text3, fontWeight: 400 }}>.Pro</span>
          <span style={{ color: SD.text3, margin: '0 8px' }}>·</span>
          <span style={{ color: SD.text2, fontWeight: 400 }}>{role}</span>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 6, color: SD.text3 }}>
        {['—', '▢', '×'].map((g, i) => (
          <div key={i} style={{
            width: 28, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, cursor: 'pointer', borderRadius: 4,
          }}>{g}</div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────── Footer (24px) ───────────────────── */
function Footer({ connected = true, beat = '2s ago' }) {
  return (
    <div style={{
      height: 24, display: 'flex', alignItems: 'center', gap: 10,
      background: SD.surface, borderTop: `1px solid ${SD.line}`,
      padding: '0 14px', fontFamily: sdMono, fontSize: 11, color: SD.text3,
      flex: '0 0 24px',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Connected <Dot variant="solid" color={connected ? SD.accent : SD.danger} size={6} />
      </span>
      <span>·</span>
      <span>TSP-XNQX</span>
      <span>·</span>
      <span>v2.4.1</span>
      <span>·</span>
      <span>last beat {beat}</span>
      <div style={{ flex: 1 }} />
      <span style={{ cursor: 'pointer' }}>collapse log ⛶</span>
    </div>
  );
}

/* ───────────────────── Header strip (64px) ───────────────────── */

function HeaderStrip({ empty = false }) {
  if (empty) {
    return (
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', borderBottom: `1px solid ${SD.line}`, flex: '0 0 64px',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `1.5px dashed ${SD.text3}`, color: SD.text3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: sdSans, fontSize: 14,
        }}>?</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sdSans, fontSize: 13, fontWeight: 600, color: SD.text2 }}>
            No master subscribed yet
          </div>
          <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, marginTop: 2 }}>
            Pick a provider in your browser to start mirroring{' '}
            <span style={{ color: SD.accent, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(0,195,137,0.4)' }}>open marketplace ↗</span>
          </div>
        </div>
        <StatusPill variant="notSub" label="Status: Not Subscribed" />
      </div>
    );
  }
  return (
    <div style={{
      height: 64, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 20px', borderBottom: `1px solid ${SD.line}`, flex: '0 0 64px',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#7ee5ad', color: '#0a3a25',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: sdSans, fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
      }}>SN</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: sdSans, fontSize: 13, fontWeight: 600, color: SD.text }}>Sasha Ng</span>
          <span style={{ color: SD.accent, fontSize: 12 }}>✓</span>
          <span style={{
            fontFamily: sdSans, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
            color: SD.violet, background: SD.violetSoft,
            padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase',
          }}>Subscribed</span>
        </div>
        <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: sdMono, color: SD.text2 }}>@sasha_fx</span>
          <span>·</span>
          <span>Forex / Gold</span>
          <span>·</span>
          <span style={{ color: SD.warn }}>Med risk</span>
          <span>·</span>
          <span>30d ROI <span style={{ fontFamily: sdMono, color: SD.accent }}>+42.8%</span></span>
        </div>
      </div>
      <StatusPill variant="listening" label="● Listening" />
    </div>
  );
}

/* ───────────────────── KPI strip ───────────────────── */

function KpiStrip({ empty = false }) {
  const tiles = empty
    ? [
        { label: 'Status', value: 'IDLE',  mono: true, c: SD.text3 },
        { label: 'Session', value: '—', mono: true, c: SD.text3 },
        { label: 'Session P&L', value: '—', mono: true, c: SD.text3 },
        { label: 'Open', value: '—', mono: true, c: SD.text3 },
        { label: 'Closed', value: '—', mono: true, c: SD.text3 },
      ]
    : [
        { label: 'Status', value: '● LIVE', mono: true, c: SD.accent, pulse: true },
        { label: 'Session', value: '00:14:32', mono: true, c: SD.text },
        { label: 'Session P&L', value: '+$184.20', mono: true, c: SD.accent },
        { label: 'Open', value: '1', mono: true, c: SD.text },
        { label: 'Closed', value: '5', mono: true, c: SD.text },
      ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
      padding: '14px 20px', borderBottom: `1px solid ${SD.line}`,
    }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <MicroLabel>{t.label}</MicroLabel>
          <div style={{
            fontFamily: t.mono ? sdMono : sdSans, fontSize: 22, fontWeight: 600,
            color: t.c, letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {t.pulse && <Dot variant="pulse" color={SD.accent} size={8} />}
            <span>{t.pulse ? t.value.replace('● ', '') : t.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────── Event log (320px right column) ───────────────────── */

const sampleLog = [
  { t: '01:05:28', m: 'Verifying account with cloud server…', c: 'text2' },
  { t: '01:05:28', m: 'Account verified for Carlos Lehder', c: 'text2' },
  { t: '01:05:47', m: 'Attempting MT5 login to Exness-MT5Trial16…', c: 'text2' },
  { t: '01:05:48', m: 'Auth Failed: invalid credentials', c: 'danger' },
  { t: '01:05:51', m: 'Retrying with cached server fingerprint…', c: 'text2' },
  { t: '01:05:53', m: 'Connected: Exness Slave (Exness-MT5Trial16)', c: 'text2' },
  { t: '01:06:00', m: '[SESSION] Session started at 01:06:00', c: 'accent' },
  { t: '01:06:00', m: 'Listening STARTED (Risk: 1.0x)', c: 'accent' },
  { t: '01:08:12', m: '[RISK] Equity floor armed @ $5,000', c: 'warn' },
  { t: '01:09:49', m: '[COPY] BUY BTCUSDm 0.27 @ 109,820', c: 'text2' },
  { t: '01:09:49', m: 'OPEN SUCCESS · ticket 1167440853', c: 'accent' },
  { t: '01:10:30', m: '[COPY] BUY EURUSDm 0.27 @ 1.0843', c: 'text2' },
  { t: '01:10:30', m: 'OPEN SUCCESS · ticket 1167442481', c: 'accent' },
  { t: '01:10:48', m: '[COPY] CLOSE BTCUSDm 1167440853 · P&L +$4.26', c: 'text3' },
  { t: '01:11:02', m: 'Symbol XAUUSD not in map · ignored', c: 'warn' },
  { t: '01:14:09', m: 'Heartbeat OK · 12 ms', c: 'text3' },
];

function EventLog({ empty = false, log, filters }) {
  const colorMap = {
    text2: SD.text2, text3: SD.text3, accent: SD.accent, danger: SD.danger, warn: SD.warn,
  };
  const entries = log || sampleLog;
  const filterPills = (filters || ['All', 'Risk', 'Errors', 'Sessions']).map((l, i) => ({ l, active: i === 0 }));
  return (
    <div style={{
      width: 320, flex: '0 0 320px',
      background: SD.surface, borderLeft: `1px solid ${SD.line}`,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px', borderBottom: `1px solid ${SD.line}`, flex: '0 0 44px',
      }}>
        <div style={{ fontFamily: sdSans, fontSize: 13, fontWeight: 600, color: SD.text }}>Event Log</div>
        <div style={{ flex: 1 }} />
        <div style={{
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: SD.text3, cursor: 'pointer', borderRadius: 4, fontSize: 12,
        }}>⌫</div>
        <div style={{
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: SD.text3, cursor: 'pointer', borderRadius: 4, fontSize: 12,
        }}>→|</div>
      </div>
      {/* filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${SD.line}` }}>
        {filterPills.map(p => (
          <span key={p.l} style={{
            fontFamily: sdSans, fontSize: 11, fontWeight: 500,
            color: p.active ? SD.accent : SD.text2,
            background: p.active ? SD.accentSoft : 'transparent',
            border: `1px solid ${p.active ? 'transparent' : SD.line}`,
            padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
          }}>{p.l}</span>
        ))}
      </div>
      {/* body */}
      <div style={{
        flex: 1, overflow: 'hidden', padding: '8px 0',
        fontFamily: sdMono, fontSize: 12, lineHeight: 1.55,
      }}>
        {empty ? (
          <div style={{ padding: '14px 16px', color: SD.text3, fontStyle: 'italic', fontFamily: sdSans, fontSize: 12 }}>
            No events yet. Connect to a master to start streaming activity here.
          </div>
        ) : entries.map((e, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, padding: '3px 14px',
            color: colorMap[e.c],
          }}>
            <span style={{ color: SD.text3, flex: '0 0 auto' }}>[{e.t}]</span>
            <span style={{ wordBreak: 'break-word' }}>{e.m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────── COPY view ───────────────────── */

function SegmentedToggle({ options, active }) {
  return (
    <div style={{
      display: 'inline-flex', background: SD.surface2,
      border: `1px solid ${SD.line}`, borderRadius: 999, padding: 3,
      gap: 0,
    }}>
      {options.map(o => (
        <span key={o} style={{
          fontFamily: sdSans, fontSize: 12, fontWeight: 600,
          color: o === active ? '#02110b' : SD.text2,
          background: o === active ? SD.accent : 'transparent',
          padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
          letterSpacing: '-0.005em',
        }}>{o}</span>
      ))}
    </div>
  );
}

function Checkbox({ label, checked = false, tooltip }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        border: `1px solid ${checked ? SD.accent : SD.line2}`,
        background: checked ? SD.accent : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#02110b', fontSize: 11, fontWeight: 700,
      }}>{checked && '✓'}</span>
      <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text }}>{label}</span>
      {tooltip && <span style={{ color: SD.text3, fontSize: 11, marginLeft: 2, cursor: 'help' }}>ⓘ</span>}
    </label>
  );
}

function CopyView({ active = true, mode = 'multiplier' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Panel A — Copy Mode */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <MicroLabel color={SD.accent}>Copy Mode</MicroLabel>
          <div style={{ flex: 1 }} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: sdMono, fontSize: 11, color: SD.text3,
            border: `1px solid ${SD.line}`, padding: '3px 10px', borderRadius: 999,
          }}>
            <Dot variant="pulse" color={SD.accent} size={6} />
            Latency: {active ? '<20ms' : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <FieldLabel>Mode</FieldLabel>
            <SegmentedToggle options={['Multiplier', 'Fixed Lot']} active={mode === 'multiplier' ? 'Multiplier' : 'Fixed Lot'} />
          </div>
          <div>
            <FieldLabel>{mode === 'multiplier' ? 'Lot Multiplier' : 'Fixed Lot'}</FieldLabel>
            <Spinbox value={mode === 'multiplier' ? '1.00' : '0.10'} width={110} />
          </div>
          <div style={{ marginBottom: 9 }}>
            <Checkbox label="Reverse Copy" tooltip="Flip BUY ↔ SELL when mirroring." />
          </div>
          <div>
            <FieldLabel>Slippage (pts)</FieldLabel>
            <Spinbox value="10" width={90} />
          </div>
        </div>
      </Card>

      {/* Panel B — Action */}
      <Card style={{ padding: 12 }}>
        {active ? (
          <div style={{ position: 'relative' }}>
            <Btn kind="stop" full height={48} style={{ fontSize: 14 }}>
              ■  STOP COPYING
            </Btn>
            <div className="sd-stop-btn-band" style={{
              position: 'absolute', left: 8, right: 8, bottom: 4, height: 2, opacity: 0.9,
              borderRadius: 2,
            }} />
          </div>
        ) : (
          <Btn kind="primary" full height={48} style={{ fontSize: 14 }}>
            ▶  START COPYING
          </Btn>
        )}
      </Card>

      <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, padding: '0 4px' }}>
        All open positions you opened manually are untouched — the slave only mirrors signals from your subscribed master.
      </div>
      <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, padding: '0 4px' }}>
        Switch tabs in the sidebar to configure symbols, risk and view session trades.
      </div>
    </div>
  );
}

/* ───────────────────── Shared atoms for the new sub-views ───────────────────── */

function CountChip({ value, kind = 'mint' }) {
  const cfg = kind === 'mint'
    ? { c: SD.accent, bg: SD.accentSoft, bd: 'transparent' }
    : { c: SD.text3, bg: 'transparent', bd: SD.line };
  return (
    <span style={{
      fontFamily: sdMono, fontSize: 11, fontWeight: 600,
      color: cfg.c, background: cfg.bg, border: `1px solid ${cfg.bd}`,
      padding: '2px 8px', borderRadius: 999, letterSpacing: '-0.01em',
    }}>{value}</span>
  );
}

function MiniChip({ label, kind = 'disabled' }) {
  // small status chip used inside guard cards
  const cfg = {
    active:   { c: SD.accent, bg: SD.accentSoft },
    armed:    { c: SD.accent, bg: SD.accentSoft },
    disabled: { c: SD.text3,  bg: 'rgba(255,255,255,0.06)' },
  }[kind];
  return (
    <span style={{
      fontFamily: sdSans, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.4px', textTransform: 'uppercase',
      color: cfg.c, background: cfg.bg,
      padding: '2px 8px', borderRadius: 4,
    }}>{label}</span>
  );
}

function GhostIconBtn({ children, hoverDanger = false, size = 28 }) {
  return (
    <button className={hoverDanger ? 'sd-icon-btn' : 'sd-btn-ghost'} style={{
      width: size, height: size, borderRadius: 6, border: 'none',
      background: 'transparent', color: SD.text3, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, transition: 'all 120ms ease',
    }}>{children}</button>
  );
}

function RemovableChip({ label, hoverState = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: sdMono, fontSize: 11, color: SD.text2,
      border: `1px solid ${SD.line}`, borderRadius: 999,
      padding: '4px 10px', cursor: 'default',
    }}>
      {label}
      <span className="sd-chip-x" style={{
        color: hoverState ? SD.danger : SD.text3, fontSize: 11, cursor: 'pointer',
      }}>×</span>
    </span>
  );
}

/* ───────────────────── SYMBOLS view ───────────────────── */

const sampleMappings = [
  { m: 'XAUUSD', y: 'XAUUSDm' },
  { m: 'XAGUSD', y: 'XAGUSDm' },
  { m: 'EURUSD', y: 'EURUSDm' }, // hover-state row
  { m: 'GBPUSD', y: 'GBPUSDm' },
  { m: 'USDJPY', y: 'USDJPYm' },
  { m: 'US30',   y: 'US30m' },
  { m: 'NAS100', y: 'NAS100' },
  { m: 'BTCUSD', y: 'BTCUSDm' },
];

function SymbolsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Panel 1 — Broker Preset */}
      <Card style={{ padding: 16 }}>
        <MicroLabel color={SD.accent} style={{ marginBottom: 12 }}>Broker Preset</MicroLabel>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <FieldLabel>Master broker</FieldLabel>
            <Dropdown value="Vantage" width={160} />
          </div>
          <div style={{ paddingBottom: 12, color: SD.text3, fontSize: 16 }}>→</div>
          <div>
            <FieldLabel>Your broker</FieldLabel>
            <Dropdown value="Exness" width={160} />
          </div>
          <div style={{ flex: 1 }} />
          <Btn kind="ghost" height={36}>Load preset mappings</Btn>
        </div>
        <div style={{ marginTop: 10, fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>
          Maps master symbol names to your broker's names. Skip if your broker uses identical names.
        </div>
      </Card>

      {/* Panel 2 — Add Mapping */}
      <Card style={{ padding: 16 }}>
        <MicroLabel color={SD.accent} style={{ marginBottom: 12 }}>Add Mapping</MicroLabel>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Master symbol</FieldLabel>
            <Input value="" placeholder="e.g. XAUUSD" mono />
          </div>
          <div style={{ paddingBottom: 12, color: SD.text3, fontSize: 16 }}>→</div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Your symbol</FieldLabel>
            <Input value="" placeholder="e.g. GOLD" mono />
          </div>
          <Btn kind="primary" height={36} style={{ width: 80 }}>Add</Btn>
        </div>
      </Card>

      {/* Panel 3 — Active Mappings table (grows) */}
      <Card style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px',
          borderBottom: `1px solid ${SD.line}`,
        }}>
          <MicroLabel color={SD.accent}>Active Mappings</MicroLabel>
          <CountChip value="8" kind="line" />
          <div style={{ flex: 1 }} />
          <Btn kind="ghost" height={28} style={{ fontSize: 12, padding: '0 12px' }}>Clear all</Btn>
        </div>
        {/* table headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          padding: '8px 14px', borderBottom: `1px solid ${SD.line}`,
          fontFamily: sdSans, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase', color: SD.text3,
        }}>
          <div>Master Symbol</div>
          <div>Your Symbol</div>
          <div />
        </div>
        {/* rows */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sampleMappings.map((row, i) => {
            const isHover = row.m === 'EURUSD';
            const isLast = i === sampleMappings.length - 1;
            return (
              <div key={row.m} className="sd-row" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                alignItems: 'center', height: 32, padding: '0 14px',
                borderBottom: isLast ? 'none' : `1px solid ${SD.line}`,
                background: isHover ? 'rgba(255,255,255,0.025)' : 'transparent',
                fontFamily: sdMono, fontSize: 13, color: SD.text,
              }}>
                <div>{row.m}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: SD.text3 }}>→</span>
                  <span>{row.y}</span>
                </div>
                <div className="sd-row-action" style={{
                  display: 'flex', justifyContent: 'flex-end',
                  opacity: isHover ? 1 : 0, transition: 'opacity 120ms ease',
                }}>
                  <GhostIconBtn hoverDanger>×</GhostIconBtn>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Panel 4 — Unmapped Behaviour */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text }}>
            When the master sends a symbol not in your map:
          </span>
          <SegmentedToggle options={['Skip trade', 'Copy as-is']} active="Skip trade" />
        </div>
        <div style={{ marginTop: 8, fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>
          Default is Skip — safer for cross-broker setups.
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────── RISK view ───────────────────── */

function GuardCard({ title, chip, chipKind, extra, description, inputs, caption }) {
  return (
    <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: sdSans, fontSize: 13, fontWeight: 600, color: SD.text }}>{title}</span>
        <div style={{ flex: 1 }} />
        {extra}
        <MiniChip label={chip} kind={chipKind} />
      </div>
      <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text2 }}>{description}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        {inputs}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>{caption}</div>
    </Card>
  );
}

function RiskView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: 'auto', gap: 12 }}>
        <GuardCard
          title="Equity Floor"
          chip="Active" chipKind="active"
          description="Stop copying if account equity drops below…"
          inputs={<>
            <Spinbox value="5,000" width={120} />
            <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text3 }}>$</span>
          </>}
          caption="Checked before each OPEN. Set to 0 to disable."
        />
        <GuardCard
          title="Max Lot Size"
          chip="Disabled" chipKind="disabled"
          description="Cap each copied trade at…"
          inputs={<>
            <div style={{ position: 'relative', width: 160 }}>
              <input
                defaultValue="Disabled (0.00)"
                style={{
                  width: '100%', background: SD.surface2, border: `1px solid ${SD.line}`,
                  borderRadius: 8, color: SD.text3, fontFamily: sdMono, fontSize: 13,
                  padding: '8px 28px 8px 12px',
                }}
              />
              <div style={{
                position: 'absolute', right: 4, top: 4, bottom: 4, width: 18,
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SD.text3, fontSize: 8 }}>▲</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SD.text3, fontSize: 8 }}>▼</div>
              </div>
            </div>
            <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text3 }}>lots</span>
          </>}
          caption="Applied after multiplier and fixed-lot logic."
        />
        <GuardCard
          title="Max Concurrent Trades"
          chip="Active" chipKind="active"
          extra={<span style={{ fontFamily: sdMono, fontSize: 11, color: SD.text3, marginRight: 6 }}>1 / 5</span>}
          description="Allow at most…"
          inputs={<>
            <Spinbox value="5" width={80} />
            <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text3 }}>open trades</span>
          </>}
          caption="Counted across all symbols."
        />
        <GuardCard
          title="Daily Loss Protection"
          chip="Armed" chipKind="armed"
          description={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: SD.text3 }}>Today's P&L</span>
                <span style={{ fontFamily: sdMono, fontSize: 13, color: SD.accent }}>+$184.20</span>
              </span>
              <span style={{ color: SD.text3 }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: SD.text3 }}>Status</span>
                <span style={{ fontSize: 13, color: SD.text }}>Active</span>
              </span>
            </span>
          }
          inputs={<>
            <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text2 }}>Pause copying if loss exceeds</span>
            <Spinbox value="500" width={110} />
            <span style={{ fontFamily: sdSans, fontSize: 13, color: SD.text3 }}>$ loss limit</span>
          </>}
          caption="Auto-resets at 00:00 server time."
        />
      </div>

      {/* Whitelist panel */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <MicroLabel color={SD.accent}>Symbol Copy Filter (Whitelist)</MicroLabel>
          <MiniChip label="Active · 3 symbols" kind="active" />
        </div>
        <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text2, marginBottom: 12 }}>
          When non-empty, only listed symbols (your broker's names) are copied.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <Input value="" placeholder="Your symbol  e.g. XAUUSDm" mono />
          </div>
          <Btn kind="primary" height={36}>Add to whitelist</Btn>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <RemovableChip label="XAUUSDm" />
          <RemovableChip label="EURUSDm" hoverState />
          <RemovableChip label="BTCUSDm" />
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────── TRADES view ───────────────────── */

const sampleHistory = [
  { t: '1167440853', s: 'BTCUSDm', a: 'BUY',  v: '0.27', pl: '+$4.26',  plPos: true,  o: '01:09:49', c: '01:10:48' },
  { t: '1167438129', s: 'XAUUSDm', a: 'BUY',  v: '0.50', pl: '+$42.10', plPos: true,  o: '14:21:31', c: '14:22:08' },
  { t: '1167434782', s: 'GBPUSDm', a: 'SELL', v: '0.50', pl: '−$22.10', plPos: false, o: '13:48:21', c: '14:00:15' },
  { t: '1167432014', s: 'EURUSDm', a: 'SELL', v: '1.00', pl: '+$18.40', plPos: true,  o: '13:28:11', c: '13:48:21' },
  { t: '1167425001', s: 'NAS100',  a: 'BUY',  v: '2.00', pl: '+$86.20', plPos: true,  o: '12:30:00', c: '13:11:02' },
];

function TradesView() {
  // NOTE: under 1400px content width, this should stack vertically. The artboard
  // shows the wide side-by-side layout.
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: '100%', minHeight: 0 }}>
      {/* Open Positions */}
      <Card style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px',
          borderBottom: `1px solid ${SD.line}`,
        }}>
          <MicroLabel color={SD.accent}>Open Positions</MicroLabel>
          <CountChip value="1" kind="mint" />
          <div style={{ flex: 1 }} />
          <GhostIconBtn size={24}>↻</GhostIconBtn>
        </div>
        {/* headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 0.8fr 0.8fr 1fr',
          padding: '8px 14px', borderBottom: `1px solid ${SD.line}`,
          fontFamily: sdSans, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase', color: SD.text3,
        }}>
          <div>Ticket</div>
          <div>Symbol</div>
          <div>Action</div>
          <div style={{ textAlign: 'right' }}>Volume</div>
          <div style={{ textAlign: 'right' }}>Opened</div>
        </div>
        {/* row */}
        <div className="sd-row" style={{
          display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 0.8fr 0.8fr 1fr',
          alignItems: 'center', height: 32, padding: '0 14px',
          borderBottom: `1px solid ${SD.line}`,
          fontFamily: sdMono, fontSize: 13, color: SD.text,
        }}>
          <div>1167442481</div>
          <div>EURUSDm</div>
          <div><TradeChip side="BUY" /></div>
          <div style={{ textAlign: 'right' }}>0.27</div>
          <div style={{ textAlign: 'right' }}>01:10:30</div>
        </div>
        <div style={{ flex: 1 }} />
      </Card>

      {/* Session History */}
      <Card style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px',
          borderBottom: `1px solid ${SD.line}`, flexWrap: 'wrap',
        }}>
          <MicroLabel color={SD.accent}>Session History</MicroLabel>
          <CountChip value="5" kind="line" />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { l: 'All', active: true },
              { l: 'Wins' },
              { l: 'Losses' },
            ].map(p => (
              <span key={p.l} style={{
                fontFamily: sdSans, fontSize: 11, fontWeight: 500,
                color: p.active ? SD.accent : SD.text2,
                background: p.active ? SD.accentSoft : 'transparent',
                border: `1px solid ${p.active ? 'transparent' : SD.line}`,
                padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
              }}>{p.l}</span>
            ))}
          </div>
        </div>
        {/* headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 0.8fr 0.7fr 0.9fr 0.9fr 0.9fr',
          padding: '8px 14px', borderBottom: `1px solid ${SD.line}`,
          fontFamily: sdSans, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase', color: SD.text3,
          gap: 6,
        }}>
          <div>Ticket</div>
          <div>Symbol</div>
          <div>Action</div>
          <div style={{ textAlign: 'right' }}>Vol</div>
          <div style={{ textAlign: 'right' }}>P&L</div>
          <div style={{ textAlign: 'right' }}>Opened</div>
          <div style={{ textAlign: 'right' }}>Closed</div>
        </div>
        {/* rows */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sampleHistory.map((r, i) => (
            <div key={r.t} className="sd-row" style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 0.8fr 0.7fr 0.9fr 0.9fr 0.9fr',
              alignItems: 'center', height: 32, padding: '0 14px',
              borderBottom: i === sampleHistory.length - 1 ? 'none' : `1px solid ${SD.line}`,
              fontFamily: sdMono, fontSize: 13, color: SD.text, gap: 6,
            }}>
              <div>{r.t}</div>
              <div>{r.s}</div>
              <div><TradeChip side={r.a} /></div>
              <div style={{ textAlign: 'right' }}>{r.v}</div>
              <div style={{ textAlign: 'right', color: r.plPos ? SD.accent : SD.danger }}>{r.pl}</div>
              <div style={{ textAlign: 'right', color: SD.text2 }}>{r.o}</div>
              <div style={{ textAlign: 'right', color: SD.text2 }}>{r.c}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CopyViewEmpty() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
        {/* bridge illustration */}
        <svg width="240" height="80" viewBox="0 0 240 80" fill="none">
          <rect x="10" y="22" width="56" height="36" rx="4" stroke={SD.text3} strokeWidth="1" />
          <rect x="174" y="22" width="56" height="36" rx="4" stroke={SD.text3} strokeWidth="1" />
          <text x="38" y="44" fill={SD.text3} fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle">MASTER</text>
          <text x="202" y="44" fill={SD.text3} fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle">SLAVE</text>
          <line x1="66" y1="40" x2="174" y2="40" stroke={SD.accent} strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="120" cy="40" r="4" fill={SD.accent} />
          <circle cx="120" cy="40" r="9" stroke={SD.accent} strokeOpacity="0.3" strokeWidth="1" fill="none" />
        </svg>
        <div>
          <div style={{ fontFamily: sdSans, fontSize: 16, fontWeight: 600, color: SD.text, marginBottom: 6 }}>
            Pick a master in the web marketplace to start mirroring.
          </div>
          <div style={{ fontFamily: sdSans, fontSize: 13, color: SD.text2, maxWidth: 480, lineHeight: 1.5 }}>
            Subscriptions happen on the website. Once you've picked a provider there, this app will detect it within a few seconds and begin listening.
          </div>
        </div>
        <Btn kind="primary" rightIcon={<span style={{ fontSize: 12 }}>↗</span>}>Open marketplace</Btn>
      </Card>

      {/* Pre-config tip card */}
      <div style={{
        background: SD.accentSoft, border: `1px solid rgba(0,195,137,0.25)`,
        borderRadius: 8, padding: '10px 14px',
        fontFamily: sdSans, fontSize: 12, color: SD.accent,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontWeight: 600 }}>Tip</span>
        <span style={{ color: 'rgba(0,195,137,0.9)' }}>
          You can configure SYMBOLS, RISK and TRADES preferences right now — they'll apply automatically when you subscribe.
        </span>
      </div>

      {/* disabled action panel */}
      <Card style={{ padding: 12 }}>
        <Btn kind="primary" full height={48} disabled style={{ fontSize: 14 }}>
          ▶  START COPYING  <span style={{ fontFamily: sdMono, fontSize: 11, marginLeft: 8, color: '#02110b', opacity: 0.7 }}>· no master subscribed</span>
        </Btn>
      </Card>
    </div>
  );
}

/* ───────────────────── Window shell wrapper ───────────────────── */

function WindowShell({ children, footerProps = {}, navActive = 'copy', items, role = 'Slave Node' }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: SD.bg, color: SD.text,
      fontFamily: sdSans, overflow: 'hidden',
    }}>
      <TitleBar role={role} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar active={navActive} items={items} />
        {children}
      </div>
      <Footer {...footerProps} />
    </div>
  );
}

/* ───────────────────── ARTBOARD 1 — Login ───────────────────── */

function SlaveLogin() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SD.bg, color: SD.text, fontFamily: sdSans,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
    }}>
      <SdStyles />
      <TitleBar />
      {/* Logo lockup top-left of content area */}
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: SD.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#02110b',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z"/></svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: SD.text, letterSpacing: '-0.01em' }}>
            TradeSync<span style={{ color: SD.text3, fontWeight: 400 }}>.Pro</span>
          </div>
        </div>

        {/* mint glow */}
        <div style={{
          position: 'absolute', width: 520, height: 200,
          borderRadius: '50%', background: 'rgba(0,195,137,0.07)',
          filter: 'blur(80px)', pointerEvents: 'none',
          left: '50%', top: '50%', transform: 'translate(-50%, -30%)',
        }} />

        {/* Card */}
        <div style={{
          position: 'relative', width: 440,
          background: SD.surface, border: `1px solid ${SD.line}`,
          borderRadius: 10, padding: 32,
          boxShadow: '0 0 80px rgba(0,195,137,0.04)',
        }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: SD.text }}>
            Connect Slave Node
          </div>
          <div style={{ fontSize: 13, color: SD.text2, marginTop: 6, marginBottom: 24, lineHeight: 1.5 }}>
            MT5 credentials + your registered TradeSync email.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <FieldLabel>Broker</FieldLabel>
              <Dropdown value="Auto-detect" />
            </div>
            <div>
              <FieldLabel>MT5 Login ID</FieldLabel>
              <Input value="80294612" mono />
            </div>
            <div>
              <FieldLabel>MT5 Password</FieldLabel>
              <Input value="••••••••••••" type="password" mono suffix="👁" />
            </div>
            <div>
              <FieldLabel>Server String</FieldLabel>
              <Input value="" placeholder="e.g. Exness-MT5Trial16" mono />
            </div>
            <div>
              <FieldLabel>TSP Registered Email</FieldLabel>
              <Input value="" placeholder="you@firm.com" />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <Btn kind="primary" full height={42} rightIcon={<span style={{ fontSize: 13 }}>→</span>}>
              Verify & connect
            </Btn>
          </div>

          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: SD.text3 }}>
            Encrypted locally. Credentials never leave your machine.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        height: 24, display: 'flex', alignItems: 'center', gap: 10,
        background: SD.surface, borderTop: `1px solid ${SD.line}`,
        padding: '0 14px', fontFamily: sdMono, fontSize: 11, color: SD.text3,
        flex: '0 0 24px',
      }}>
        <span>v2.4.1</span>
        <span>·</span>
        <span>Press Esc to quit</span>
        <div style={{ flex: 1 }} />
        <span>Need a key? <span style={{ color: SD.accent }}>trade.sync.pro/account</span></span>
      </div>
    </div>
  );
}

/* ───────────────────── ARTBOARD 2 — Dashboard · Empty ───────────────────── */

function SlaveDashboardEmpty() {
  return (
    <>
      <SdStyles />
      <WindowShell navActive="copy">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStrip empty />
          <KpiStrip empty />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <CopyViewEmpty />
          </div>
        </div>
        <EventLog empty />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 3 — Dashboard · Active ───────────────────── */

function SlaveDashboardActive() {
  return (
    <>
      <SdStyles />
      <WindowShell navActive="copy">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStrip />
          <KpiStrip />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <CopyView active />
          </div>
        </div>
        <EventLog />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 4 — Dashboard · Symbols ───────────────────── */

function SlaveDashboardSymbols() {
  return (
    <>
      <SdStyles />
      <WindowShell navActive="symbols">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStrip />
          <KpiStrip />
          <div style={{ flex: 1, padding: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SymbolsView />
          </div>
        </div>
        <EventLog />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 5 — Dashboard · Risk ───────────────────── */

function SlaveDashboardRisk() {
  return (
    <>
      <SdStyles />
      <WindowShell navActive="risk">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStrip />
          <KpiStrip />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <RiskView />
          </div>
        </div>
        <EventLog />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 6 — Dashboard · Trades ───────────────────── */

function SlaveDashboardTrades() {
  return (
    <>
      <SdStyles />
      <WindowShell navActive="trades">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStrip />
          <KpiStrip />
          <div style={{ flex: 1, padding: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TradesView />
          </div>
        </div>
        <EventLog />
      </WindowShell>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   MASTER DESKTOP — five artboards (Login, Empty, Active, Subscribers,
   Performance). Reuses every shell part, primitive and atom defined above.
   No new colors, no new fonts, no new radii. Mint stays primary; violet
   does NOT appear in any master artboard.
   ═════════════════════════════════════════════════════════════════════════ */

/* ───────────────────── Master nav icons (3) ───────────────────── */

const MasterNavIcon = {
  broadcast: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 14 L5 20 L19 20 L19 14"/>
      <path d="M12 14 L12 7"/>
      <path d="M9.5 9.5 a3.5 3.5 0 0 1 5 0"/>
      <path d="M7 7 a7 7 0 0 1 10 0"/>
    </svg>
  ),
  subscribers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3"/>
      <path d="M3 19 c0-3.3 2.7-6 6-6 s6 2.7 6 6"/>
      <circle cx="16" cy="6" r="2.4"/>
      <path d="M14 13.5 c1.5-0.7 3-1 4-1 c1.7 0 3 1.3 3 3"/>
    </svg>
  ),
  performance: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 19 V13"/>
      <path d="M12 19 V9"/>
      <path d="M18 19 V5"/>
      <path d="M3 21 H21"/>
    </svg>
  ),
};

const masterNav = [
  { id: 'broadcast',   label: 'BROADCAST',   icon: MasterNavIcon.broadcast },
  { id: 'subscribers', label: 'SUBSCRIBERS', icon: MasterNavIcon.subscribers },
  { id: 'performance', label: 'PERFORMANCE', icon: MasterNavIcon.performance },
];

/* ───────────────────── Master sample data ───────────────────── */

const masterSampleLog = [
  { t: '00:58:11', m: 'Verifying license TSP-XNQX-WNDD with cloud server…', c: 'text2' },
  { t: '00:58:12', m: 'License OK · tier: Master · seats: 5', c: 'accent' },
  { t: '00:58:14', m: 'Attempting MT5 login to ICMarkets-MT5-04…', c: 'text2' },
  { t: '00:58:18', m: 'Connected: IC Markets Master (ICMarkets-MT5-04)', c: 'text2' },
  { t: '00:58:18', m: 'Heartbeat OK · 8 ms', c: 'text3' },
  { t: '00:58:20', m: '[SESSION] Session opened at 00:58:20', c: 'accent' },
  { t: '00:58:20', m: 'Ready to broadcast — press START', c: 'text2' },
  { t: '01:06:00', m: 'Broadcasting STARTED', c: 'accent' },
  { t: '01:06:04', m: '[MASTER] Carlos Lehder subscribed', c: 'accent' },
  { t: '01:06:09', m: '[MASTER] Awais Slave subscribed', c: 'accent' },
  { t: '01:09:49', m: '[SIGNAL] BUY BTCUSDm 1.00 @ 109,820', c: 'text2' },
  { t: '01:09:49', m: 'Broadcast OK · 2 / 2 subscribers acked', c: 'accent' },
  { t: '01:10:30', m: '[SIGNAL] BUY EURUSDm 1.00 @ 1.0843', c: 'text2' },
  { t: '01:10:30', m: 'Broadcast OK · 2 / 2 subscribers acked', c: 'accent' },
  { t: '01:10:48', m: '[SIGNAL] CLOSE BTCUSDm · P&L +$4.26', c: 'text3' },
  { t: '01:11:02', m: '[MASTER] Awais Slave went OFFLINE', c: 'warn' },
  { t: '01:14:09', m: 'Heartbeat OK · 11 ms', c: 'text3' },
];

const masterFilters = ['All', 'Signals', 'Subscribers', 'Errors'];

const subscribersData = [
  { name: 'Carlos Lehder',  email: 'carlos@slave.com',     online: true,  copied: 4, pnl: 11.55  },
  { name: 'Awais Slave',    email: 'awaisslave@test.com',  online: false, copied: 0, pnl: 0      },
];

const recentBroadcasts = [
  { t: '01:10:48', sym: 'BTCUSDm', a: 'BUY',  v: '1.00', kind: 'CLOSED', pl: '+$4.26',  plPos: true,  acked: '2 / 2' },
  { t: '01:10:30', sym: 'EURUSDm', a: 'BUY',  v: '1.00', kind: 'OPEN',   pl: '—',       plPos: null,  acked: '2 / 2' },
  { t: '01:09:49', sym: 'BTCUSDm', a: 'BUY',  v: '1.00', kind: 'OPEN',   pl: '—',       plPos: null,  acked: '2 / 2' },
  { t: '00:54:18', sym: 'XAUUSDm', a: 'SELL', v: '0.50', kind: 'CLOSED', pl: '−$18.20', plPos: false, acked: '2 / 2' },
  { t: '00:48:02', sym: 'ETHUSDm', a: 'BUY',  v: '0.80', kind: 'CLOSED', pl: '+$22.40', plPos: true,  acked: '2 / 2' },
  { t: '00:31:45', sym: 'XAUUSDm', a: 'BUY',  v: '0.50', kind: 'CLOSED', pl: '−$22.04', plPos: false, acked: '1 / 2' },
];

/* ───────────────────── Master shell parts ───────────────────── */

function HeaderStripMaster({ idle = false }) {
  return (
    <div style={{
      height: 64, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 20px', borderBottom: `1px solid ${SD.line}`, flex: '0 0 64px',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#7ee5ad', color: '#0a3a25',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: sdSans, fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
      }}>SN</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: sdSans, fontSize: 13, fontWeight: 600, color: SD.text }}>Sasha Ng</span>
          <span style={{ color: SD.accent, fontSize: 12 }}>✓</span>
          <span style={{
            fontFamily: sdSans, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
            color: SD.accent, background: SD.accentSoft,
            padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase',
          }}>Master</span>
        </div>
        <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: sdMono, color: SD.text2 }}>@sasha_fx</span>
          <span>·</span>
          <span>Forex / Gold</span>
          <span>·</span>
          <span style={{ color: SD.warn }}>Med risk</span>
          <span>·</span>
          <span>30d ROI <span style={{ fontFamily: sdMono, color: SD.accent }}>+42.8%</span></span>
        </div>
      </div>
      {idle
        ? <StatusPill variant="idle" label="● Idle" />
        : <StatusPill variant="broadcasting" label="● Broadcasting" />}
    </div>
  );
}

function KpiStripMaster({ idle = false }) {
  const tiles = idle
    ? [
        { label: 'Status',      value: 'IDLE', mono: true, c: SD.text3 },
        { label: 'Session',     value: '—',    mono: true, c: SD.text3 },
        { label: 'Signals',     value: '—',    mono: true, c: SD.text3 },
        { label: 'Subscribers', value: '0 / 2', mono: true, c: SD.text3, sub: 'online / total' },
        { label: 'Balance',     value: '—',    mono: true, c: SD.text3 },
      ]
    : [
        { label: 'Status',      value: '● BROADCASTING', mono: true, c: SD.accent, pulse: true },
        { label: 'Session',     value: '00:14:32', mono: true, c: SD.text },
        { label: 'Signals',     value: '6',        mono: true, c: SD.text, sub: '5 acked' },
        { label: 'Subscribers', value: '1 / 2',    mono: true, c: SD.text, sub: 'online / total' },
        { label: 'Balance',     value: '$24,860',  mono: true, c: SD.text, sub: '+$184.20 today' },
      ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
      padding: '14px 20px', borderBottom: `1px solid ${SD.line}`,
    }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <MicroLabel>{t.label}</MicroLabel>
          <div style={{
            fontFamily: t.mono ? sdMono : sdSans, fontSize: 22, fontWeight: 600,
            color: t.c, letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {t.pulse && <Dot variant="pulse" color={SD.accent} size={8} />}
            <span>{t.pulse ? t.value.replace('● ', '') : t.value}</span>
          </div>
          {t.sub && (
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>{t.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ───────────────────── Master login card ───────────────────── */

function MasterLoginCard() {
  return (
    <div style={{
      position: 'relative', width: 440,
      background: SD.surface, border: `1px solid ${SD.line}`,
      borderRadius: 10, padding: 32,
      boxShadow: '0 0 80px rgba(0,195,137,0.04)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: SD.text }}>
        Connect Master Node
      </div>
      <div style={{ fontSize: 13, color: SD.text2, marginTop: 6, marginBottom: 24, lineHeight: 1.5 }}>
        MT5 credentials + your TradeSync master license key.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <FieldLabel>Broker</FieldLabel>
          <Dropdown value="IC Markets" />
        </div>
        <div>
          <FieldLabel>MT5 Login ID</FieldLabel>
          <Input value="51428091" mono />
        </div>
        <div>
          <FieldLabel>MT5 Password</FieldLabel>
          <Input value="••••••••••••" type="password" mono suffix="👁" />
        </div>
        <div>
          <FieldLabel>Server String</FieldLabel>
          <Input value="ICMarkets-MT5-04" mono />
        </div>
        <div>
          <FieldLabel>License Key</FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              className="sd-input"
              defaultValue="TSP-XNQX-WNDD"
              style={{
                width: '100%', background: SD.surface2,
                border: `1px solid ${SD.line}`, borderRadius: 8,
                color: SD.accent, fontFamily: sdMono, fontSize: 13,
                padding: '10px 12px', letterSpacing: '0.04em',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <Btn kind="primary" full height={42} rightIcon={<span style={{ fontSize: 13 }}>→</span>}>
          Verify license & connect
        </Btn>
      </div>

      <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: SD.text3 }}>
        Encrypted locally. Credentials never leave your machine.
      </div>
    </div>
  );
}

/* ───────────────────── BROADCAST view (parallels CopyView) ───────────────────── */

function BroadcastView({ active = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Panel 1 — Action */}
      <Card style={{ padding: 12 }}>
        {active ? (
          <div style={{ position: 'relative' }}>
            <Btn kind="stop" full height={48} style={{ fontSize: 14 }}>
              ■  STOP BROADCASTING
            </Btn>
            <div className="sd-stop-btn-band" style={{
              position: 'absolute', left: 8, right: 8, bottom: 4, height: 2, opacity: 0.9,
              borderRadius: 2,
            }} />
          </div>
        ) : (
          <Btn kind="primary" full height={48} style={{ fontSize: 14 }}>
            ▶  START BROADCASTING
          </Btn>
        )}
        <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, padding: '10px 4px 0' }}>
          Every position you open, modify or close on this MT5 account is fanned out
          to subscribed slaves in &lt;20 ms. Manual hedges are broadcast like any other trade.
        </div>
      </Card>

      {/* Panel 2 — License Key */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <MicroLabel color={SD.accent}>License Key</MicroLabel>
          <div style={{ flex: 1 }} />
          <MiniChip label={active ? 'Active · 5 seats' : 'Active · 5 seats'} kind="active" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: sdMono, fontSize: 14, fontWeight: 600, letterSpacing: '0.06em',
            color: SD.accent, background: SD.accentSoft,
            border: `1px solid ${SD.line}`, borderRadius: 8,
            padding: '8px 14px',
          }}>TSP-XNQX-WNDD</span>
          <Btn kind="ghost" height={32} style={{ fontSize: 12 }}>Copy</Btn>
          <Btn kind="ghost" height={32} style={{ fontSize: 12 }}>Rotate</Btn>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>
            Subscribers paste this key in their slave clients to receive your signals.
          </span>
        </div>
      </Card>

      {/* Panel 3 — Account */}
      <Card style={{ padding: 16 }}>
        <MicroLabel color={SD.accent} style={{ marginBottom: 12 }}>Account</MicroLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div>
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginBottom: 4 }}>Account</div>
            <div style={{ fontFamily: sdMono, fontSize: 14, color: SD.text }}>51428091</div>
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginTop: 2 }}>IC Markets · Live</div>
          </div>
          <div>
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginBottom: 4 }}>Server</div>
            <div style={{ fontFamily: sdMono, fontSize: 14, color: SD.text }}>ICMarkets-MT5-04</div>
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginTop: 2 }}>
              <span style={{ color: SD.accent }}>● Connected</span>
              <span> · ping {active ? '8 ms' : '—'}</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginBottom: 4 }}>Balance</div>
            <div style={{ fontFamily: sdMono, fontSize: 14, color: SD.text }}>{active ? '$24,860.47' : '$24,676.27'}</div>
            <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginTop: 2 }}>
              {active
                ? <>Equity <span style={{ fontFamily: sdMono, color: SD.accent }}>+$184.20</span> today</>
                : <>Equity <span style={{ fontFamily: sdMono, color: SD.text3 }}>—</span></>
              }
            </div>
          </div>
        </div>
      </Card>

      <div style={{ fontFamily: sdSans, fontSize: 12, color: SD.text3, padding: '0 4px' }}>
        {active
          ? 'Broadcasting is live. Switch tabs to manage subscribers or review performance.'
          : 'You are connected but not broadcasting. Subscribers will not receive new signals until you press START.'}
      </div>
    </div>
  );
}

/* ───────────────────── SUBSCRIBERS view ───────────────────── */

function SubscriberAvatar({ name, online }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('');
  // colour from name hash, tone-matched to the muted mint family of the existing palette
  const palette = ['#7ee5ad', '#a8c0e6', '#d8c39a', '#c0a3d8'];
  const c = palette[name.charCodeAt(0) % palette.length];
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: c, color: '#0a3a25',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: sdSans, fontSize: 11, fontWeight: 700,
      flex: '0 0 auto', position: 'relative',
    }}>
      {initials}
      <span style={{
        position: 'absolute', bottom: -1, right: -1,
        width: 9, height: 9, borderRadius: '50%',
        background: online ? SD.accent : SD.text3,
        border: `2px solid ${SD.surface}`,
      }} />
    </div>
  );
}

function SubscribersView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Top summary strip */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div>
            <MicroLabel>Total</MicroLabel>
            <div style={{ fontFamily: sdMono, fontSize: 22, fontWeight: 600, color: SD.text, marginTop: 2 }}>2</div>
          </div>
          <div style={{ width: 1, height: 40, background: SD.line }} />
          <div>
            <MicroLabel>Online</MicroLabel>
            <div style={{ fontFamily: sdMono, fontSize: 22, fontWeight: 600, color: SD.accent, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Dot variant="pulse" color={SD.accent} size={7} />
              <span>1</span>
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: SD.line }} />
          <div>
            <MicroLabel>Signals broadcast (session)</MicroLabel>
            <div style={{ fontFamily: sdMono, fontSize: 22, fontWeight: 600, color: SD.text, marginTop: 2 }}>6</div>
          </div>
          <div style={{ flex: 1 }} />
          <Btn kind="ghost" height={32} style={{ fontSize: 12 }}>↻ Refresh</Btn>
          <Btn kind="ghost" height={32} style={{ fontSize: 12 }}>Export CSV</Btn>
        </div>
      </Card>

      {/* Connected Subscribers table */}
      <Card style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px',
          borderBottom: `1px solid ${SD.line}`,
        }}>
          <MicroLabel color={SD.accent}>Connected Subscribers</MicroLabel>
          <CountChip value="2" kind="line" />
        </div>
        {/* headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.8fr 0.9fr 0.6fr',
          padding: '8px 14px', borderBottom: `1px solid ${SD.line}`,
          fontFamily: sdSans, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase', color: SD.text3,
        }}>
          <div>Subscriber</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Copied (session)</div>
          <div style={{ textAlign: 'right' }}>Realised P&amp;L</div>
          <div />
        </div>
        {/* rows */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {subscribersData.map((s, i) => {
            const isHover = i === 0; // Carlos shows hover state with revoke button visible
            const pnlStr = s.pnl > 0 ? `+$${s.pnl.toFixed(2)}` : s.pnl < 0 ? `−$${Math.abs(s.pnl).toFixed(2)}` : '—';
            const pnlColor = s.pnl > 0 ? SD.accent : s.pnl < 0 ? SD.danger : SD.text3;
            return (
              <div key={s.email} className="sd-row" style={{
                display: 'grid', gridTemplateColumns: '2.2fr 1fr 0.8fr 0.9fr 0.6fr',
                alignItems: 'center', height: 44, padding: '0 14px',
                borderBottom: i === subscribersData.length - 1 ? 'none' : `1px solid ${SD.line}`,
                background: isHover ? 'rgba(255,255,255,0.025)' : 'transparent',
                position: 'relative',
              }}>
                {isHover && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: 3, background: SD.accent,
                  }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SubscriberAvatar name={s.name} online={s.online} />
                  <div>
                    <div style={{ fontFamily: sdSans, fontSize: 13, fontWeight: 500, color: SD.text }}>{s.name}</div>
                    <div style={{ fontFamily: sdMono, fontSize: 11, color: SD.text3 }}>{s.email}</div>
                  </div>
                </div>
                <div>
                  {s.online
                    ? <StatusPill variant="live" label="● Live" />
                    : <StatusPill variant="idle" label="○ Offline" />}
                </div>
                <div style={{ textAlign: 'right', fontFamily: sdMono, fontSize: 13, color: s.copied ? SD.text : SD.text3 }}>{s.copied}</div>
                <div style={{ textAlign: 'right', fontFamily: sdMono, fontSize: 13, color: pnlColor }}>{pnlStr}</div>
                <div className="sd-row-action" style={{
                  display: 'flex', justifyContent: 'flex-end',
                  opacity: isHover ? 1 : 0, transition: 'opacity 120ms ease',
                }}>
                  <GhostIconBtn hoverDanger>×</GhostIconBtn>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Subscriber Activity log card */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <MicroLabel color={SD.accent}>Subscriber Activity</MicroLabel>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>last 24 h</span>
        </div>
        <div style={{ fontFamily: sdMono, fontSize: 12, lineHeight: 1.7 }}>
          <div style={{ display: 'flex', gap: 10, color: SD.accent }}>
            <span style={{ color: SD.text3 }}>[01:11:02]</span>
            <span>Awais Slave went OFFLINE</span>
          </div>
          <div style={{ display: 'flex', gap: 10, color: SD.text2 }}>
            <span style={{ color: SD.text3 }}>[01:06:09]</span>
            <span>Awais Slave subscribed · seat 2 / 5</span>
          </div>
          <div style={{ display: 'flex', gap: 10, color: SD.text2 }}>
            <span style={{ color: SD.text3 }}>[01:06:04]</span>
            <span>Carlos Lehder subscribed · seat 1 / 5</span>
          </div>
          <div style={{ display: 'flex', gap: 10, color: SD.text3 }}>
            <span>[00:43:22]</span>
            <span>Carlos Lehder reconnected after 92 s offline</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ───────────────────── PERFORMANCE view ───────────────────── */

function PerfKpi({ label, value, sub, mono = true, color }) {
  return (
    <Card style={{ padding: 16 }}>
      <MicroLabel>{label}</MicroLabel>
      <div style={{
        fontFamily: mono ? sdMono : sdSans, fontSize: 22, fontWeight: 600,
        color: color || SD.text, letterSpacing: '-0.01em', marginTop: 6,
      }}>{value}</div>
      {sub && <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

/* Sparkline rendered with raw SVG — 14 sample points, mint stroke + soft fill. */
function EquitySparkline() {
  const pts = [40, 42, 39, 44, 48, 47, 52, 56, 54, 58, 61, 64, 62, 67];
  const w = 380, h = 90, pad = 6;
  const min = Math.min(...pts), max = Math.max(...pts);
  const dx = (w - pad * 2) / (pts.length - 1);
  const norm = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const path = pts.map((v, i) => `${i ? 'L' : 'M'} ${pad + i * dx} ${norm(v).toFixed(1)}`).join(' ');
  const area = path + ` L ${pad + (pts.length - 1) * dx} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={SD.accent} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={SD.accent} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <path d={path} fill="none" stroke={SD.accent} strokeWidth="1.5" />
    </svg>
  );
}

function PerformanceView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 3×2 KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <PerfKpi label="Total Trades"   value="20"      sub="lifetime" />
        <PerfKpi label="Closed Trades"  value="19"      sub="1 still open" />
        <PerfKpi label="Win Rate"       value="52.63%"  color={SD.accent} sub="10 wins · 9 losses" />
        <PerfKpi label="Total P&L"      value="−$3.36"  color={SD.danger} sub="net realised" />
        <PerfKpi label="Avg Volume"     value="0.23"    sub="lots per trade" />
        <PerfKpi label="Subscribers"    value="2"       sub="1 online · 5 seats" />
      </div>

      {/* Conditional analytics row — these three cards are populated only when
          the master's account history is at least 30 days deep AND the API has
          delivered tick-level equity points. Otherwise the panel shows a
          single muted "Not enough data yet" line. The render below assumes
          the API responded. */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <MicroLabel color={SD.accent}>Equity (30d)</MicroLabel>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: sdMono, fontSize: 12, color: SD.accent }}>+42.8%</span>
            <span style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3 }}>vs $17,408 start</span>
          </div>
          <EquitySparkline />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: sdMono, fontSize: 10, color: SD.text3 }}>
            <span>Mar 28</span>
            <span>Apr 11</span>
            <span>Apr 28</span>
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <MicroLabel color={SD.accent} style={{ marginBottom: 10 }}>Risk Metrics</MicroLabel>
          {[
            { l: 'Max drawdown',  v: '−6.2%',  c: SD.danger },
            { l: 'Sharpe (30d)',  v: '1.42',   c: SD.text },
            { l: 'Profit factor', v: '1.18',   c: SD.text },
            { l: 'Avg hold',      v: '38m',    c: SD.text },
          ].map(r => (
            <div key={r.l} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', borderBottom: `1px solid ${SD.line}`,
              fontFamily: sdSans, fontSize: 12,
            }}>
              <span style={{ color: SD.text2 }}>{r.l}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: sdMono, color: r.c }}>{r.v}</span>
            </div>
          ))}
        </Card>

        <Card style={{ padding: 16 }}>
          <MicroLabel color={SD.accent} style={{ marginBottom: 10 }}>Active Hours (UTC)</MicroLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
            {[1,2,3,2,5,7,9,11,13,15,12,9,8,6,5,4,3,2,1,1,2,2,3,2].map((v, i) => (
              <div key={i} style={{
                flex: 1, height: `${(v / 15) * 100}%`,
                background: v >= 9 ? SD.accent : v >= 5 ? 'rgba(0,195,137,0.45)' : SD.surface2,
                borderRadius: 2, minHeight: 2,
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: sdMono, fontSize: 10, color: SD.text3 }}>
            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
          </div>
          <div style={{ fontFamily: sdSans, fontSize: 11, color: SD.text3, marginTop: 6 }}>
            Most signals fire 07–11 UTC (London open).
          </div>
        </Card>
      </div>

      {/* Recent broadcasts table */}
      <Card style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px',
          borderBottom: `1px solid ${SD.line}`,
        }}>
          <MicroLabel color={SD.accent}>Recent Broadcasts</MicroLabel>
          <CountChip value="6" kind="line" />
          <div style={{ flex: 1 }} />
          <Btn kind="ghost" height={28} style={{ fontSize: 12, padding: '0 12px' }}>View all</Btn>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '0.9fr 1.1fr 0.7fr 0.7fr 0.9fr 1fr 0.9fr',
          padding: '8px 14px', borderBottom: `1px solid ${SD.line}`,
          fontFamily: sdSans, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.6px', textTransform: 'uppercase', color: SD.text3,
        }}>
          <div>Time</div>
          <div>Symbol</div>
          <div>Action</div>
          <div style={{ textAlign: 'right' }}>Volume</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>P&amp;L</div>
          <div style={{ textAlign: 'right' }}>Acked</div>
        </div>
        {recentBroadcasts.map((r, i) => (
          <div key={i} className="sd-row" style={{
            display: 'grid', gridTemplateColumns: '0.9fr 1.1fr 0.7fr 0.7fr 0.9fr 1fr 0.9fr',
            alignItems: 'center', height: 36, padding: '0 14px',
            borderBottom: i === recentBroadcasts.length - 1 ? 'none' : `1px solid ${SD.line}`,
            fontFamily: sdMono, fontSize: 13, color: SD.text,
          }}>
            <div style={{ color: SD.text3 }}>{r.t}</div>
            <div>{r.sym}</div>
            <div><TradeChip side={r.a} /></div>
            <div style={{ textAlign: 'right' }}>{r.v}</div>
            <div><StatusChip kind={r.kind} /></div>
            <div style={{
              textAlign: 'right',
              color: r.plPos === true ? SD.accent : r.plPos === false ? SD.danger : SD.text3,
            }}>{r.pl}</div>
            <div style={{ textAlign: 'right', color: r.acked === '2 / 2' ? SD.accent : SD.warn }}>{r.acked}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ───────────────────── ARTBOARD 7 — Master · Login ───────────────────── */

function MasterLogin() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: SD.bg, color: SD.text, fontFamily: sdSans,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
    }}>
      <SdStyles />
      <TitleBar role="Master Node" />
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: SD.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#02110b',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 L4 14 h7 l-1 8 9-12 h-7 z"/></svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: SD.text, letterSpacing: '-0.01em' }}>
            TradeSync<span style={{ color: SD.text3, fontWeight: 400 }}>.Pro</span>
            <span style={{ color: SD.text3, fontWeight: 400, marginLeft: 8 }}>· Master</span>
          </div>
        </div>

        {/* mint glow */}
        <div style={{
          position: 'absolute', width: 520, height: 200,
          borderRadius: '50%', background: 'rgba(0,195,137,0.07)',
          filter: 'blur(80px)', pointerEvents: 'none',
          left: '50%', top: '50%', transform: 'translate(-50%, -30%)',
        }} />

        <MasterLoginCard />
      </div>

      {/* Footer */}
      <div style={{
        height: 24, display: 'flex', alignItems: 'center', gap: 10,
        background: SD.surface, borderTop: `1px solid ${SD.line}`,
        padding: '0 14px', fontFamily: sdMono, fontSize: 11, color: SD.text3,
        flex: '0 0 24px',
      }}>
        <span>v2.4.1</span>
        <span>·</span>
        <span>Press Esc to quit</span>
        <div style={{ flex: 1 }} />
        <span>Need a key? <span style={{ color: SD.accent }}>trade.sync.pro/account</span></span>
      </div>
    </div>
  );
}

/* ───────────────────── ARTBOARD 8 — Master · Dashboard · Empty ───────────────────── */

function MasterDashboardEmpty() {
  return (
    <>
      <SdStyles />
      <WindowShell role="Master Node" items={masterNav} navActive="broadcast">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStripMaster idle />
          <KpiStripMaster idle />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <BroadcastView active={false} />
          </div>
        </div>
        <EventLog log={masterSampleLog.slice(0, 7)} filters={masterFilters} />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 9 — Master · Dashboard · Active ───────────────────── */

function MasterDashboardActive() {
  return (
    <>
      <SdStyles />
      <WindowShell role="Master Node" items={masterNav} navActive="broadcast">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStripMaster />
          <KpiStripMaster />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <BroadcastView active />
          </div>
        </div>
        <EventLog log={masterSampleLog} filters={masterFilters} />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 10 — Master · Dashboard · Subscribers ───────────────────── */

function MasterDashboardSubscribers() {
  return (
    <>
      <SdStyles />
      <WindowShell role="Master Node" items={masterNav} navActive="subscribers">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStripMaster />
          <KpiStripMaster />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <SubscribersView />
          </div>
        </div>
        <EventLog log={masterSampleLog} filters={masterFilters} />
      </WindowShell>
    </>
  );
}

/* ───────────────────── ARTBOARD 11 — Master · Dashboard · Performance ───────────────────── */

function MasterDashboardPerformance() {
  return (
    <>
      <SdStyles />
      <WindowShell role="Master Node" items={masterNav} navActive="performance">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <HeaderStripMaster />
          <KpiStripMaster />
          <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
            <PerformanceView />
          </div>
        </div>
        <EventLog log={masterSampleLog} filters={masterFilters} />
      </WindowShell>
    </>
  );
}

/* ───────────────────── Export ───────────────────── */
Object.assign(window, {
  SlaveLogin,
  SlaveDashboardEmpty,
  SlaveDashboardActive,
  SlaveDashboardSymbols,
  SlaveDashboardRisk,
  SlaveDashboardTrades,
  MasterLogin,
  MasterDashboardEmpty,
  MasterDashboardActive,
  MasterDashboardSubscribers,
  MasterDashboardPerformance,
});
