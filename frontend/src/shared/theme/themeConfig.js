import { createTheme } from '@mui/material/styles';
import { CHROME_COLORS } from './themeContextValue.js';

export const getCustomTheme = () =>
  createTheme({
    palette: {
      mode: 'light',
      chrome: CHROME_COLORS,
      primary: { main: '#0d4b6e', light: '#2478a8', dark: '#011f2f', contrastText: '#ffffff' },
      secondary: { main: '#6c757d', contrastText: '#ffffff' },
      background: { default: '#ffffff', paper: '#f6f6f6ff' },
      text: { primary: '#212529', secondary: '#6c757d' },
      divider: 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: "'Google Sans Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      // Responsive mobile-first heading scale so Student & Admin section/page headers stay compact on mobile
      h4: {
        fontSize: '1.25rem',
        fontWeight: 800,
        lineHeight: 1.25,
        letterSpacing: '-0.02em',
        '@media (min-width:600px)': {
          fontSize: '1.65rem',
        },
        '@media (min-width:900px)': {
          fontSize: '1.9rem',
        },
      },
      h5: {
        fontSize: '1.1rem',
        fontWeight: 800,
        lineHeight: 1.28,
        letterSpacing: '-0.015em',
        '@media (min-width:600px)': {
          fontSize: '1.35rem',
        },
        '@media (min-width:900px)': {
          fontSize: '1.5rem',
        },
      },
      h6: {
        fontSize: '0.98rem',
        fontWeight: 700,
        lineHeight: 1.3,
        '@media (min-width:600px)': {
          fontSize: '1.125rem',
        },
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 10,
    },
    zIndex: {
      mobileStepper: 1000,
      fab: 1050,
      speedDial: 1050,
      appBar: 1100,
      drawer: 1200,
      modal: 1300,
      snackbar: 1700,
      tooltip: 1800,
    },
    components: {
      MuiPopover: { styleOverrides: { root: { zIndex: '1500 !important' } } },
      MuiMenu: { styleOverrides: { root: { zIndex: '1500 !important' } } },
      MuiPopper: { styleOverrides: { root: { zIndex: '1500 !important' } } },
      MuiTooltip: { styleOverrides: { popper: { zIndex: '1600 !important' } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
          },
        },
      },
      MuiButton: { styleOverrides: { root: { borderRadius: '8px' } } },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: CHROME_COLORS.bg,
            color: CHROME_COLORS.text,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#ffffff',
            color: '#212529',
            borderRight: 'none',
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: '24px',
            border: '1px solid #e0e0e0',
            padding: '3px',
            backgroundColor: '#ffffff',
            gap: '3px',
            '& .MuiToggleButtonGroup-grouped': {
              border: '0 !important',
              borderRadius: '20px !important',
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            padding: '6px 16px',
            fontSize: '0.8rem',
            color: '#6c757d',
            transition: 'all 0.2s ease',
            minHeight: '32px',
            '&.Mui-selected': {
              backgroundColor: '#e0eeff !important',
              color: '#0d6efd !important',
              boxShadow: 'none',
            },
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
            },
          },
        },
      },
    },
  });
