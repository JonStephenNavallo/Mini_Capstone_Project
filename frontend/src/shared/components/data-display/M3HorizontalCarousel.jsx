import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

/**
 * M3HorizontalCarousel - Material 3 Expressive horizontal snap-scroll carousel.
 * Supports touch swipe with right-edge card peek on mobile and prev/next
 * circular tonal controls on desktop (zero outer glow).
 */
export default function M3HorizontalCarousel({
  children,
  itemMinWidth = { xs: '80%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)', lg: 'calc(25% - 12px)' },
  gap = 2,
  fullBleed = false,
  ariaLabel = 'Items carousel',
  headerRight,
  headerLeft,
}) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const items = React.Children.toArray(children);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollState);
      observer.observe(el);
    }

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer?.disconnect();
    };
  }, [updateScrollState, items.length]);

  const scrollByDirection = useCallback((direction) => {
    const el = trackRef.current;
    if (!el) return;
    const distance = Math.max(280, Math.round(el.clientWidth * 0.78));
    el.scrollBy({ left: direction * distance, behavior: 'smooth' });
  }, []);

  return (
    <Box sx={{ minWidth: 0 }}>
      {/* Header Row with Optional Desktop Prev/Next Controls */}
      {(headerLeft || headerRight) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 0 }}>{headerLeft}</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {items.length > 1 && (
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.75 }}>
                <IconButton
                  size="small"
                  aria-label="Scroll carousel left"
                  disabled={!canScrollLeft}
                  onClick={() => scrollByDirection(-1)}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '9999px',
                    bgcolor: 'rgba(13, 75, 110, 0.10)',
                    color: '#0d4b6e',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: 'rgba(13, 75, 110, 0.18)' },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      color: 'text.disabled',
                    },
                  }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Scroll carousel right"
                  disabled={!canScrollRight}
                  onClick={() => scrollByDirection(1)}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '9999px',
                    bgcolor: 'rgba(13, 75, 110, 0.10)',
                    color: '#0d4b6e',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: 'rgba(13, 75, 110, 0.18)' },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      color: 'text.disabled',
                    },
                  }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            {headerRight}
          </Box>
        </Box>
      )}

      {/* Horizontal Snap-Scroll Track */}
      <Box
        ref={trackRef}
        role="region"
        aria-label={ariaLabel}
        sx={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          pb: 1,
          ...(fullBleed
            ? {
                mx: { xs: -2, sm: -3 },
                px: { xs: 2, sm: 3 },
                scrollPaddingInline: { xs: '16px', sm: '24px' },
              }
            : {}),
          // Hide bulky scrollbar on touch devices while preserving trackpad/wheel scroll
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {items.map((child, idx) => (
          <Box
            key={child?.key || idx}
            sx={{
              flex: '0 0 auto',
              width: itemMinWidth,
              scrollSnapAlign: 'start',
              minWidth: 0,
              display: 'flex',
              '& > *': {
                width: '100%',
              },
            }}
          >
            {child}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
