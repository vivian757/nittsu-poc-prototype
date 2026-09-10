import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#123D88',
      dark: '#092A68',
      light: '#E8F0FF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#76A900',
      dark: '#527D00',
      light: '#EEF7D7',
      contrastText: '#172500',
    },
    success: { main: '#1F8A5B', light: '#E7F5EE' },
    warning: { main: '#D97917', light: '#FFF4E5' },
    error: { main: '#C43D4B', light: '#FDECEF' },
    info: { main: '#2F73C8', light: '#EAF3FF' },
    background: { default: '#F4F7FA', paper: '#FFFFFF' },
    text: { primary: '#192434', secondary: '#667386' },
    divider: '#DDE4EC',
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
    h5: { fontWeight: 750, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 650 },
    button: { fontWeight: 650, textTransform: 'none' },
    body2: { lineHeight: 1.55 },
  },
  shape: { borderRadius: 10 },
  shadows: [
    'none',
    '0 1px 2px rgba(22, 34, 52, 0.05)',
    '0 4px 12px rgba(22, 34, 52, 0.08)',
    '0 8px 24px rgba(22, 34, 52, 0.10)',
    ...Array(21).fill('0 12px 30px rgba(22, 34, 52, 0.12)'),
  ],
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 36, borderRadius: 8 } },
    },
    MuiChip: {
      styleOverrides: { root: { height: 26, borderRadius: 6, fontWeight: 650 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
    },
  },
});
