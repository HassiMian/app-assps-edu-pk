export const C = {
 card: 'var(--apex-bg-surface)',
 navy: 'var(--apex-bg-surface-solid)',
 blue: 'var(--apex-action-primary)',
 gold: 'var(--apex-action-highlight)',
 goldL: 'color-mix(in srgb, var(--apex-action-highlight) 78%, white)',
 silver: 'var(--apex-text-primary)',
 muted: 'var(--apex-text-tertiary)',
 green: 'var(--apex-action-success)',
 red: 'var(--apex-action-danger)',
 border: 'var(--apex-border-default)',
};

export const card = {
 background: 'var(--apex-bg-surface)',
 backdropFilter: 'blur(18px)',
 WebkitBackdropFilter: 'blur(18px)',
 border: '1px solid var(--apex-border-default)',
 borderRadius: 'var(--apex-radius-lg)',
 padding: 20,
 boxSizing: 'border-box',
 boxShadow: 'var(--apex-shadow-sm)',
 position: 'relative',
 overflow: 'hidden',
 color: 'var(--apex-text-primary)',
 transition: 'transform var(--apex-motion-normal) ease, box-shadow var(--apex-motion-normal) ease, border-color var(--apex-motion-fast) ease, background var(--apex-motion-normal) ease',
};

export const metricCard = (color = C.blue) => ({
 ...card,
 minHeight: 118,
 display: 'flex',
 alignItems: 'center',
 gap: 16,
 background: `linear-gradient(145deg, color-mix(in srgb, ${color} 9%, var(--apex-bg-surface-solid)), var(--apex-bg-surface) 58%)`,
 border: `1px solid color-mix(in srgb, ${color} 22%, var(--apex-border-default))`,
 boxShadow: `var(--apex-shadow-sm), 0 0 28px color-mix(in srgb, ${color} 6%, transparent)`,
});

export const metricIcon = (color = C.blue) => ({
 width: 52,
 height: 52,
 borderRadius: 16,
 display: 'grid',
 placeItems: 'center',
 flexShrink: 0,
 background: `color-mix(in srgb, ${color} 10%, var(--apex-bg-surface-solid))`,
 border: `1px solid color-mix(in srgb, ${color} 24%, var(--apex-border-default))`,
 color,
 boxShadow: 'var(--apex-shadow-sm)',
});

export const btnPrimary = {
 minHeight: 40,
 display: 'inline-flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 8,
 background: 'var(--apex-action-primary)',
 color: '#fff',
 border: '1px solid transparent',
 borderRadius: 'var(--apex-radius-sm)',
 padding: '8px 15px',
 fontWeight: 750,
 fontSize: 13,
 cursor: 'pointer',
 boxShadow: '0 8px 20px color-mix(in srgb, var(--apex-action-primary) 20%, transparent)',
 transition: 'transform var(--apex-motion-fast) ease, background var(--apex-motion-fast) ease, box-shadow var(--apex-motion-fast) ease, opacity var(--apex-motion-fast) ease',
};

export const btnSecondary = {
 minHeight: 40,
 display: 'inline-flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: 8,
 background: 'var(--apex-bg-surface-solid)',
 color: 'var(--apex-text-secondary)',
 border: '1px solid var(--apex-border-default)',
 borderRadius: 'var(--apex-radius-sm)',
 padding: '8px 15px',
 fontWeight: 700,
 fontSize: 13,
 cursor: 'pointer',
 boxShadow: 'var(--apex-shadow-sm)',
 transition: 'transform var(--apex-motion-fast) ease, background var(--apex-motion-fast) ease, color var(--apex-motion-fast) ease, border-color var(--apex-motion-fast) ease',
};

export const input = {
 width: '100%',
 minHeight: 42,
 padding: '9px 12px',
 borderRadius: 'var(--apex-radius-sm)',
 background: 'var(--apex-bg-surface-solid)',
 border: '1px solid var(--apex-border-default)',
 color: 'var(--apex-text-primary)',
 fontSize: 13,
 outline: 'none',
 boxSizing: 'border-box',
};

export const select = {
 ...input,
 cursor: 'pointer',
 WebkitAppearance: 'none',
 MozAppearance: 'none',
 appearance: 'none',
};

export const labelStyle = {
 color: 'var(--apex-text-tertiary)',
 fontSize: 11,
 fontWeight: 750,
 marginBottom: 6,
 display: 'block',
 textTransform: 'uppercase',
 letterSpacing: '0.055em',
};

export const sectionHeader = {
 color: 'var(--apex-text-primary)',
 fontSize: 17,
 fontWeight: 780,
 letterSpacing: '-0.015em',
 margin: 0,
};

export const smallBadge = (color = C.blue) => ({
 display: 'inline-flex',
 alignItems: 'center',
 justifyContent: 'center',
 minHeight: 24,
 padding: '4px 9px',
 borderRadius: 999,
 color,
 background: `color-mix(in srgb, ${color} 9%, var(--apex-bg-surface-solid))`,
 border: `1px solid color-mix(in srgb, ${color} 22%, var(--apex-border-default))`,
 fontSize: 11,
 fontWeight: 750,
});
