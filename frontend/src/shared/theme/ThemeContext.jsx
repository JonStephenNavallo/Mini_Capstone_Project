import React, { useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { getCustomTheme } from './themeConfig';
import { CHROME_COLORS, ThemeContext } from './themeContextValue.js';

/**
 * Single-theme institutional Light Mode provider.
 * Locks document tokens to light mode so #083344 chrome and #f57f3b accents
 * maintain high WCAG contrast across all cards, buttons, and modals.
 */
export const ThemeContextProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('app-theme-mode');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const theme = useMemo(() => getCustomTheme(), []);
  const value = useMemo(
    () => ({ mode: 'light', chromeColors: CHROME_COLORS }),
    []
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
