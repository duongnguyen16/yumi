'use client';

import { createTheme } from '@mui/material/styles';
import { tokens } from './admin-tokens';

const t = tokens;

/**
 * Warm soft SaaS admin theme. The web app is admin-only, so this is applied
 * globally. All custom hex values live in `admin-tokens.ts`.
 */
export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: t.color.orange,
      dark: t.color.orangeDark,
      contrastText: '#FFFFFF',
    },
    success: {
      main: t.color.green,
      dark: t.color.greenDark,
      contrastText: '#FFFFFF',
    },
    error: {
      main: t.color.red,
      contrastText: '#FFFFFF',
    },
    background: {
      default: t.color.bg,
      paper: t.color.card,
    },
    text: {
      primary: t.color.textPrimary,
      secondary: t.color.textSecondary,
    },
    divider: t.color.border,
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: t.font.sans,
    h4: { fontWeight: 700, color: t.color.textPrimary },
    h5: { fontWeight: 700, color: t.color.textPrimary },
    h6: { fontWeight: 700, color: t.color.textPrimary },
    subtitle1: { fontWeight: 600, color: t.color.textPrimary },
    subtitle2: { fontWeight: 700, color: t.color.textPrimary },
    body1: { color: t.color.textPrimary },
    body2: { color: t.color.textSecondary },
    button: { textTransform: 'none', fontWeight: 600 },
    // Metadata / uppercase labels use the mono face.
    overline: {
      fontFamily: t.font.mono,
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: t.color.textSecondary,
      lineHeight: 1.4,
    },
    caption: {
      fontFamily: t.font.mono,
      fontSize: 12,
      color: t.color.textMuted,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#D9D3C8',
          borderRadius: 0,
          border: '2px solid transparent',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: '#C9C1B3',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.001ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.001ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 16px',
        },
        sizeSmall: { padding: '6px 12px' },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: t.color.card,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.color.border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D2C9BB' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: t.color.orange,
            borderWidth: 1,
          },
          '&.Mui-focused': { boxShadow: t.shadow.focusRing },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: t.color.textSecondary },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontWeight: 600,
          fontFamily: t.font.sans,
        },
        sizeSmall: { height: 24, fontSize: 12 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: t.color.rowBorder,
          fontSize: 14,
          color: t.color.textPrimary,
        },
        head: {
          fontWeight: 700,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderLeft: `1px solid ${t.color.border}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: t.color.sidebar,
          fontSize: 12,
          borderRadius: 0,
          padding: '6px 10px',
        },
        arrow: { color: t.color.sidebar },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
  },
});
