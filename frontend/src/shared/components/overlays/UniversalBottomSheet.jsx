import React from 'react';
import { createPortal } from 'react-dom';
import { Backdrop, Box, Typography, useTheme } from '@mui/material';
import { M3eBottomSheet } from '@m3e/react/bottom-sheet';
import './UniversalBottomSheet.css';

const TOPBAR_HEIGHT_PX = 64;
const DEFAULT_DETENTS = ['100%'];
const EXIT_CLEANUP_DELAY_MS = 260;

/**
 * Universal Mobile Bottom Sheet powered by @m3e/react/bottom-sheet.
 * Sized by default to rise flush up to the bottom edge of the 64px mobile Topbar.
 */
export default function UniversalBottomSheet({
  open,
  onClosed,
  onClose,
  children,
  detents = DEFAULT_DETENTS,
  ariaLabel = 'Details panel',
  title = null,
  subtitle = null,
  headerBadge = null,
  headerTrailing = null,
  footer = null,
}) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const handleClosed = onClosed || onClose;
  const sheetHeight = detents[0] || '100%';
  const rawHeight =
    typeof sheetHeight === 'string' && sheetHeight.endsWith('%')
      ? `${sheetHeight.slice(0, -1)}dvh`
      : sheetHeight;
  const maxHeightBelowTopbar = `calc(100dvh - ${TOPBAR_HEIGHT_PX}px)`;
  const resolvedHeight =
    sheetHeight === '100%'
      ? maxHeightBelowTopbar
      : `min(${rawHeight}, ${maxHeightBelowTopbar})`;

  const openRef = React.useRef(Boolean(open));
  React.useLayoutEffect(() => {
    openRef.current = Boolean(open);
  }, [open]);

  const requestClose = React.useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    handleClosed?.();
  }, [handleClosed]);

  const [isContentReady, setIsContentReady] = React.useState(false);
  const [cachedChildren, setCachedChildren] = React.useState(null);

  if (open && children && children !== cachedChildren) {
    setCachedChildren(children);
  }

  React.useEffect(() => {
    if (open) {
      const rafId = requestAnimationFrame(() => {
        React.startTransition(() => {
          setIsContentReady(true);
        });
      });
      return () => cancelAnimationFrame(rafId);
    }

    const timerId = setTimeout(() => {
      setIsContentReady(false);
      setCachedChildren(null);
    }, EXIT_CLEANUP_DELAY_MS);
    return () => clearTimeout(timerId);
  }, [open]);

  const sheetStyle = React.useMemo(
    () => ({
      '--_bottom-sheet-height': resolvedHeight,
      '--m3e-bottom-sheet-z-index': 1250,
      zIndex: 1250,
      pointerEvents: open ? 'auto' : 'none',
      '--m3e-bottom-sheet-compact-top-space': `${TOPBAR_HEIGHT_PX}px`,
      '--m3e-bottom-sheet-top-space': `${TOPBAR_HEIGHT_PX}px`,
      '--m3e-bottom-sheet-width': '100%',
      '--m3e-bottom-sheet-max-width': '100%',
      '--m3e-bottom-sheet-container-shape': '28px 28px 0 0',
      '--m3e-bottom-sheet-full-container-shape': '28px 28px 0 0',
      '--m3e-bottom-sheet-minimized-container-shape': '28px 28px 0 0',
      '--m3e-bottom-sheet-container-color': theme.palette.background.paper,
      '--m3e-bottom-sheet-color': theme.palette.text.primary,
      '--m3e-bottom-sheet-padding-inline': '0px',
      '--m3e-bottom-sheet-padding-block': '0px',
      '--m3e-bottom-sheet-handle-width': '44px',
      '--m3e-bottom-sheet-handle-height': '5px',
      '--m3e-bottom-sheet-handle-container-height': '48px',
      '--m3e-bottom-sheet-handle-color': dark
        ? 'rgba(255,255,255,0.3)'
        : 'rgba(0,0,0,0.22)',
      fontFamily: theme.typography.fontFamily,
    }),
    [
      resolvedHeight,
      open,
      theme.palette.background.paper,
      theme.palette.text.primary,
      theme.typography.fontFamily,
      dark,
    ]
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      <Backdrop
        open={Boolean(open)}
        onClick={requestClose}
        sx={{
          zIndex: 1240,
          backgroundColor: dark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)',
          transition: 'opacity 240ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      />

      <M3eBottomSheet
        className="universal-bottom-sheet"
        detents={detents}
        detent={0}
        open={Boolean(open)}
        hideable
        aria-label={ariaLabel}
        onClosed={requestClose}
        style={sheetStyle}
      >
        <Box
          slot="header"
          sx={{
            height: 48,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            userSelect: 'none',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              width: 44,
              height: 5,
              borderRadius: '9999px',
              pointerEvents: 'none',
              bgcolor: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.22)',
            }}
          />
        </Box>

        <Box
          sx={{
            height: `calc(${resolvedHeight} - 48px)`,
            maxHeight: `calc(${resolvedHeight} - 48px)`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            flex: 1,
            overflow: title || footer ? 'hidden' : 'visible',
            overflowY: title || footer ? 'hidden' : 'auto',
            WebkitOverflowScrolling: 'touch',
            pb: footer ? 0 : 'calc(env(safe-area-inset-bottom, 16px) + 8px)',
          }}
        >
          {(title || headerTrailing) && (
            <Box
              sx={{
                px: 2.5,
                pb: 1.5,
                pt: 0.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {title && (
                    <Typography
                      variant="subtitle1"
                      noWrap
                      sx={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        letterSpacing: '-0.015em',
                        color: 'text.primary',
                      }}
                    >
                      {title}
                    </Typography>
                  )}
                  {headerBadge}
                </Box>
                {subtitle && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.2, fontSize: '0.75rem', fontWeight: 500 }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {headerTrailing && <Box sx={{ flexShrink: 0 }}>{headerTrailing}</Box>}
            </Box>
          )}

          {title || footer ? (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {isContentReady ? (children ?? cachedChildren) : null}
            </Box>
          ) : isContentReady ? (
            (children ?? cachedChildren)
          ) : null}

          {footer && (
            <Box
              sx={{
                px: 2.5,
                pt: 1.5,
                pb: 'calc(env(safe-area-inset-bottom, 12px) + 12px)',
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: dark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafd',
                flexShrink: 0,
              }}
            >
              {footer}
            </Box>
          )}
        </Box>
      </M3eBottomSheet>
    </>,
    document.body
  );
}
