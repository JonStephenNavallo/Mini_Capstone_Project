import React, { useId, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, useMediaQuery, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import '@m3e/web/core';
import { M3eFab } from '@m3e/react/fab';
import {
  M3eFabMenu as M3eFabMenuComponent,
  M3eFabMenuItem,
  M3eFabMenuTrigger,
} from '@m3e/react/fab-menu';

/**
 * M3FabMenu - Material 3 Expressive Floating Action Button & Speed-Dial Menu.
 * Adapted from the reference Teacher Instructional Hub M3FabMenu pattern using
 * @m3e/react/fab + @m3e/react/fab-menu with MUI SVG icons (zero font FOUT)
 * and the OSAS institutional #f57f3b accent palette.
 */
export default function M3FabMenu({
  items = [],
  triggerIcon,
  variant = 'primary',
  size = 'large',
  menuVariant = 'primary',
  ariaLabel = 'Quick Actions',
  visible = true,
  mobileOnly = true,
  style = {},
}) {
  const generatedId = useId().replace(/:/g, '');
  const menuId = `m3e-fab-menu-${generatedId}`;
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const shouldRender = visible && (!mobileOnly || isMobile);
  const effectiveOpen = shouldRender && isOpen;

  // Institutional Light-Mode M3E FAB tokens (ocean-blue #0d4b6e via native shadow-DOM vars for 60fps morph)
  const m3Colors = {
    fabContainer: '#0d4b6e',
    fabIcon: '#ffffff',
    fabHoverState: '#083344',
    scrimBg: 'rgba(1, 31, 47, 0.52)',
    pillContainer: '#ffffff',
    pillColor: '#0d4b6e',
    pillText: '#011f2f',
    pillHover: '#f0f4f9',
    pillRipple: 'rgba(13, 75, 110, 0.16)',
  };

  // Sync open state with native Popover toggle event to drive the backdrop scrim
  useEffect(() => {
    const el = menuRef.current;
    if (!el || !shouldRender) return undefined;

    const handleToggle = (e) => {
      setIsOpen(e.newState === 'open');
    };

    el.addEventListener('toggle', handleToggle);
    return () => {
      el.removeEventListener('toggle', handleToggle);
    };
  }, [shouldRender]);

  const handleClose = () => {
    if (menuRef.current && typeof menuRef.current.hidePopover === 'function') {
      try {
        menuRef.current.hidePopover();
      } catch {
        // Ignore popover close errors when already closed
      }
    }
    setIsOpen(false);
  };

  if (!shouldRender || typeof document === 'undefined') return null;

  return createPortal(
    <Box sx={{ display: mobileOnly ? { xs: 'block', sm: 'none' } : 'block' }}>
      {/* Full-Viewport Backdrop Scrim synced with Popover lifecycle (GPU-only opacity fade) */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: m3Colors.scrimBg,
          zIndex: 1350,
          opacity: effectiveOpen ? 1 : 0,
          pointerEvents: effectiveOpen ? 'auto' : 'none',
          willChange: 'opacity',
          transition: 'opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Primary Trigger FAB (+) — uses native shadow-DOM container color so X -> + spring morph runs at 60fps */}
      <M3eFab
        variant={variant}
        size={size}
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          right: 20,
          zIndex: effectiveOpen ? 1360 : 1050,
          background: 'transparent',
          willChange: 'transform',
          '--m3e-fab-container-height': '85px',   // exact height & width (1:1 square)
          '--m3e-fab-icon-size': '26px',          // icon size inside the FAB
          '--m3e-fab-shape': '20px',              // optional corner radius
          '--m3e-primary-fab-container-color': m3Colors.fabContainer,
          '--m3e-primary-fab-icon-color': m3Colors.fabIcon,
          '--m3e-primary-fab-label-text-color': m3Colors.fabIcon,
          '--m3e-primary-fab-hover-state-layer-color': m3Colors.fabHoverState,
          '--m3e-fab-container-color': m3Colors.fabContainer,
          '--m3e-fab-icon-color': m3Colors.fabIcon,
          ...style,
        }}
      >
        <M3eFabMenuTrigger for={menuId}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: m3Colors.fabIcon,
            }}
          >
            {React.isValidElement(triggerIcon) ? (
              triggerIcon
            ) : (
              <AddIcon sx={{ fontSize: 28, color: m3Colors.fabIcon }} />
            )}
          </span>
        </M3eFabMenuTrigger>
      </M3eFab>

      {/* Spring-Animated M3E Speed-Dial Menu */}
      <M3eFabMenuComponent
        ref={menuRef}
        id={menuId}
        variant={menuVariant}
        style={{
          zIndex: 1365,
          '--m3e-fab-menu-spacing': '12px',
          '--m3e-primary-fab-container-color': m3Colors.pillContainer,
          '--m3e-primary-fab-color': m3Colors.pillColor,
          '--m3e-primary-fab-hover-color': m3Colors.pillHover,
          '--m3e-primary-fab-ripple-color': m3Colors.pillRipple,
          '--m3e-fab-menu-item-shape': '28px',
          '--m3e-fab-menu-item-font-size': '0.92rem',
          '--m3e-fab-menu-item-font-weight': '600',
          fontFamily: "'Google Sans Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {items.map((item) => (
          <M3eFabMenuItem
            key={item.key || item.label}
            onClick={() => {
              handleClose();
              item.onClick?.();
            }}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              fontWeight: 600,
              color: m3Colors.pillText,
              borderRadius: '28px',
              background: 'transparent',
            }}
          >
            {item.icon && (
              <span
                slot="icon"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: m3Colors.pillColor,
                  fontSize: '1.35rem',
                }}
              >
                {item.icon}
              </span>
            )}
            {item.label}
          </M3eFabMenuItem>
        ))}
      </M3eFabMenuComponent>
    </Box>,
    document.body
  );
}
