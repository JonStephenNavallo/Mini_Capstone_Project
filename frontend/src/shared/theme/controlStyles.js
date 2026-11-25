// Keep selected view controls paired with their palette foreground, including hover.
// Strictly avoids outer glow effects (boxShadow: 'none').
export const primarySelectedControlSx = (theme) => ({
  bgcolor: `${theme.palette.primary.main} !important`,
  color: `${theme.palette.primary.contrastText} !important`,
  boxShadow: 'none',
  '&:hover': {
    bgcolor: `${theme.palette.primary.main} !important`,
    color: `${theme.palette.primary.contrastText} !important`,
  },
});
