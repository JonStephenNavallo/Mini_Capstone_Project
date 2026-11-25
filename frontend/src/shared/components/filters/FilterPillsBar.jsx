import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { M3eFilterChip, M3eFilterChipSet } from '@m3e/react/chips';

/**
 * FilterPillsBar - Official Material 3 Expressive Filter Chips (@m3e/react/chips)
 * matching Capstone_Project_Stg2 FilterChips.jsx.
 */
const FilterPillsBar = ({
  items = [],
  selected,
  onSelect,
  colorRole = 'primary',
  shape = '10px',
  hideSelectionIndicator = false,
  sx = {},
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isSecondary = colorRole === 'secondary';
  const scrollRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 6;
    const canScrollRight = el.scrollWidth - el.clientWidth - el.scrollLeft > 6;
    setScrollState((prev) =>
      prev.canScrollLeft === canScrollLeft && prev.canScrollRight === canScrollRight
        ? prev
        : { canScrollLeft, canScrollRight }
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const raf = requestAnimationFrame(checkScroll);
    const t1 = setTimeout(checkScroll, 80);
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [items, selected, checkScroll]);

  const handleScrollBy = (amount) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const bgDefault = theme.palette.background.default || (isDark ? '#131416' : '#ffffff');
  const selectedBgColor = isSecondary ? theme.palette.secondary.main : theme.palette.primary.main;
  const selectedTextColor = isSecondary
    ? theme.palette.secondary.contrastText
    : theme.palette.primary.contrastText;
  const unselectedBorderColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.14)';
  const unselectedTextColor = theme.palette.text.secondary;

  return (
    <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden', ...sx }}>
      {scrollState.canScrollLeft && (
        <Box
          onClick={() => handleScrollBy(-140)}
          sx={{
            display: 'flex',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 36,
            zIndex: 2,
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'flex-start',
            background: `linear-gradient(to right, ${bgDefault} 65%, transparent)`,
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        </Box>
      )}

      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          py: 0.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <M3eFilterChipSet
          hideSelectionIndicator={hideSelectionIndicator}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'nowrap',
            '--m3e-chip-set-spacing': '8px',
          }}
        >
          {items.map((filter) => {
            const isSelected = String(selected) === String(filter.key);
            return (
              <M3eFilterChip
                key={filter.key}
                selected={isSelected}
                onClick={(e) => {
                  // Prevent M3eFilterChip from visually deselecting the active single-select chip
                  if (e.currentTarget) {
                    e.currentTarget.selected = true;
                  }
                  onSelect?.(filter.key);
                }}
                style={{
                  cursor: 'pointer',
                  flexShrink: 0,
                  '--m3e-chip-container-shape': shape,
                  '--m3e-chip-container-height': '34px',
                  '--m3e-chip-label-text-font-size': '0.82rem',
                  '--m3e-chip-label-text-font-weight': '700',
                  '--m3e-outlined-chip-outline-thickness': isSelected ? '0px' : '1.5px',
                  '--m3e-outlined-chip-outline-color': isSelected ? 'transparent' : unselectedBorderColor,
                  '--m3e-chip-selected-outline-thickness': '0px',
                  '--m3e-chip-selected-container-color': selectedBgColor,
                  '--m3e-chip-selected-label-text-color': selectedTextColor,
                  '--m3e-chip-selected-leading-icon-color': selectedTextColor,
                  '--m3e-chip-unselected-label-text-color': unselectedTextColor,
                  '--m3e-chip-unselected-leading-icon-color': unselectedTextColor,
                  '--m3e-chip-icon-size': '18px',
                  backgroundColor: isSelected ? selectedBgColor : 'transparent',
                  borderRadius: shape,
                }}
              >
                {filter.icon && (
                  <span slot="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {filter.icon}
                  </span>
                )}
                {filter.label}
              </M3eFilterChip>
            );
          })}
        </M3eFilterChipSet>
      </Box>

      {scrollState.canScrollRight && (
        <Box
          onClick={() => handleScrollBy(140)}
          sx={{
            display: 'flex',
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 36,
            zIndex: 2,
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: `linear-gradient(to right, transparent, ${bgDefault} 65%)`,
          }}
        >
          <ChevronRightIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        </Box>
      )}
    </Box>
  );
};

export default FilterPillsBar;
