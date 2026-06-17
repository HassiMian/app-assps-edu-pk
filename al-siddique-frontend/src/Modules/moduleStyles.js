export const C = {
 card: 'rgba(11,44,77,0.97)',
 navy: '#0B2C4D',
 gold: '#C8991A',
 goldL: '#e8b420',
 silver: '#C0C8D8',
 muted: '#8892A4',
 green: '#30D158',
 red: '#FF375F',
 border: 'rgba(148,163,184,0.18)',
};

export const card = {
 background: 'linear-gradient(145deg, rgba(12,49,84,0.96), rgba(7,30,52,0.98))',
 backdropFilter: 'blur(18px)',
 WebkitBackdropFilter: 'blur(18px)',
 border: '1px solid rgba(148,163,184,0.18)',
 borderRadius: 22,
 padding: 20,
 boxSizing: 'border-box',
 boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045), 0 18px 42px rgba(0,0,0,0.22)',
 position: 'relative',
 overflow: 'hidden',
 transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.2s ease',
};

export const metricCard = (color = C.gold) => ({
 ...card,
 minHeight: 118,
 display: 'flex',
 alignItems: 'center',
 gap: 16,
 background: `linear-gradient(145deg, ${color}18, rgba(11,44,77,0.96) 48%, rgba(7,30,52,0.98))`,
 border: `1px solid ${color}33`,
 borderRadius: 22,
 boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 42px rgba(0,0,0,0.22), 0 0 28px ${color}12`,
});

export const metricIcon = (color = C.gold) => ({
 width: 52,
 height: 52,
 borderRadius: 18,
 display: 'grid',
 placeItems: 'center',
 flexShrink: 0,
 background: `linear-gradient(135deg, ${color}2e, rgba(255,255,255,0.045))`,
 border: `1px solid ${color}55`,
 color,
 boxShadow: `0 12px 24px ${color}18`,
});

export const btnPrimary = {
 background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
 color: '#071e34',
 border: 'none',
 borderRadius: 8,
 padding: '8px 16px',
 fontWeight: 500,
 fontSize: 13,
 cursor: 'pointer',
 boxShadow: '0 2px 6px rgba(200,153,26,0.15)',
 transition: 'all 0.2s ease',
};

export const btnSecondary = {
 background: 'rgba(7,22,40,0.96)',
 color: C.silver,
 border: `1px solid ${C.border}`,
 borderRadius: 8,
 padding: '8px 16px',
 fontWeight: 600,
 fontSize: 13,
 cursor: 'pointer',
 boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
 transition: 'all 0.2s ease',
};

export const input = {
 width: '100%',
 padding: '9px 12px',
 borderRadius: 9,
 background: 'rgba(7,22,40,0.97)',
 border: `1px solid ${C.border}`,
 color: C.silver,
 fontSize: 13,
 outline: 'none',
 boxSizing: 'border-box',
};

export const select = {
 width: '100%',
 padding: '9px 12px',
 borderRadius: 9,
 background: 'rgba(7,22,40,0.97)',
 border: `1px solid ${C.border}`,
 color: C.silver,
 fontSize: 13,
 outline: 'none',
 cursor: 'pointer',
 boxSizing: 'border-box',
 WebkitAppearance: 'none',
 MozAppearance: 'none',
 appearance: 'none',
};

export const labelStyle = {
 color: C.muted,
 fontSize: 11,
 fontWeight: 700,
 marginBottom: 6,
 display: 'block',
 textTransform: 'uppercase',
 letterSpacing: '0.06em',
};

export const sectionHeader = {
 color: C.gold,
 fontSize: 16,
 fontWeight: 650,
 margin: 0,
};

export const smallBadge = (color) => ({
 display: 'inline-flex',
 alignItems: 'center',
 justifyContent: 'center',
 padding: '4px 9px',
 borderRadius: 999,
 color: '#fff',
 background: color,
 fontSize: 11,
 fontWeight: 700,
});
