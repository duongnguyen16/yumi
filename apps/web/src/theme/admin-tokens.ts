/**
 * Admin design tokens — single source of truth for the warm SaaS admin theme.
 * Consumed by the MUI theme (admin-theme.ts) and by components via the `sx` prop.
 */
export const tokens = {
  color: {
    // Workspace
    bg: '#F5F1E9',
    card: '#FFFDF8',
    border: '#E7E1D8',
    rowHover: '#FAF5EE',
    rowSelected: '#FBECE2',
    rowSubTint: '#FAFAF7',
    rowBorder: '#EFEAE2',
    preview: '#F7D8C8',
    // Sidebar
    sidebar: '#191C21',
    sidebarDeep: '#050505',
    sidebarActive: '#303236',
    sidebarHover: '#2A2C31',
    sidebarText: '#FFFFFF',
    sidebarMuted: '#A1A1AA',
    sidebarInactive: '#FFFFFF',
    sidebarIcon: '#FFFFFF',
    // Text
    textPrimary: '#252320',
    textSecondary: '#77736C',
    textMuted: '#8A867E',
    textDescription: '#55504A',
    // Brand / accent
    orange: '#E9552E',
    orangeDark: '#D9471F',
    orangeSoft: '#FBECE2',
    // Actions
    green: '#2E7D32',
    greenDark: '#256428',
    red: '#A3261D',
    redSoftBg: '#FFF8F7',
    redSoftBorder: '#E9C8C3',
    // Status accents
    sage: '#D0DFC2',
    sageText: '#3D5736',
    pendingBg: '#FFF3D8',
    pendingText: '#8A641F',
    // Misc
    checkboxBorder: '#A6A19A',
    inputBg: '#F8F4EC',
    // Pastel icon tiles (cycled by row index)
    tile: {
      peach: '#F7D8C8',
      lavender: '#E4DCF5',
      mint: '#D6EBD9',
      beige: '#EFE6D6',
      cyan: '#D5E9EC',
      pink: '#F5D9E4',
    },
  },
  radius: {
    card: 16,
    control: 10,
    sidebarItem: 12,
    tile: 10,
    pill: 9999,
  },
  shadow: {
    card: '0 8px 24px rgba(25, 28, 33, 0.06)',
    cardHover: '0 12px 32px rgba(25, 28, 33, 0.10)',
    focusRing: '0 0 0 3px rgba(233, 85, 46, 0.15)',
  },
  font: {
    sans: 'var(--font-inter), Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: 'var(--font-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },
  motion: {
    hover: '180ms',
    drawer: '320ms',
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
} as const;

/** Pastel tile colors as an ordered array for cycling by row index. */
export const tilePalette: readonly string[] = [
  tokens.color.tile.peach,
  tokens.color.tile.lavender,
  tokens.color.tile.mint,
  tokens.color.tile.beige,
  tokens.color.tile.cyan,
  tokens.color.tile.pink,
];
