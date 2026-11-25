import { createContext } from 'react';

// Institutional OSAS / DLL shell chrome colors (Light-only single theme)
export const CHROME_COLORS = {
  bg: '#083344',
  text: '#ffffff',
  mutedText: 'rgba(255, 255, 255, 0.72)',
  hoverBg: 'rgba(255, 255, 255, 0.10)',
  divider: 'rgba(255, 255, 255, 0.16)',
  // Dark-surface M3 orange tonal indicator for the active nav pill on #083344
  sidebarSelectedBg: 'rgba(245, 127, 59, 0.22)',
  sidebarSelectedHoverBg: 'rgba(245, 127, 59, 0.30)',
  sidebarSelectedText: '#ffb380',
  // High-emphasis vibrant orange reserved for the Desktop Sidebar FAB
  fabBg: '#f57f3b',
  fabHoverBg: '#e56f2c',
  fabText: '#ffffff',
};

// Reusable dark-teal media card surface tokens paired with #f57f3b accent CTA
export const CARD_COLORS = {
  bg: '#011f2f',
  hoverBg: '#042a3f',
  mediaBg: '#083344',
  text: '#ffffff',
  secondaryText: 'rgba(255, 255, 255, 0.78)',
  mutedText: 'rgba(255, 255, 255, 0.68)',
  overline: '#f57f3b',
  accent: '#f57f3b',
  accentHover: '#e56f2c',
};

// Primary pill button gradient (deep midnight teal #011f2f -> ocean blue #2478a8)
export const PRIMARY_BUTTON_GRADIENT = 'linear-gradient(90deg, #011f2f 0%, #0d4b6e 52%, #2478a8 100%)';
export const PRIMARY_BUTTON_HOVER_GRADIENT = 'linear-gradient(90deg, #042a3f 0%, #115880 52%, #2b86ba 100%)';

export const ThemeContext = createContext({
  mode: 'light',
  chromeColors: CHROME_COLORS,
});
