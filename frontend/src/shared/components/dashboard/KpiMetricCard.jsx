import React from 'react';
import { Box, LinearProgress, Paper, Typography, alpha, useTheme } from '@mui/material';
import { SECTION_RADIUS } from './dashboardTokens.js';

export function SectionSurface({ children, sx = {}, ...rest }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: SECTION_RADIUS,
        border: 'none',
        bgcolor: isDark ? '#1e1f23' : '#f0f4f9',
        p: { xs: 2, sm: 2.75 },
        minWidth: 0,
        boxShadow: 'none',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Paper>
  );
}

/**
 * KpiMetricCard - Fixed 3-row anatomy (`auto 1fr auto`), `minWidth: 0`,
 * reserved progress bar track, and zero wireframe outlines.
 */
export function KpiMetricCard({
  label,
  value,
  caption,
  icon,
  tone = 'primary',
  progress,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const paletteMap = {
    primary: {
      bg: isDark ? alpha('#90caf9', 0.1) : '#edf4f8',
      iconBg: isDark ? alpha('#90caf9', 0.18) : alpha('#0d4b6e', 0.12),
      iconColor: isDark ? '#90caf9' : '#0d4b6e',
    },
    success: {
      bg: isDark ? alpha('#81c784', 0.1) : '#edf8f1',
      iconBg: isDark ? alpha('#81c784', 0.18) : alpha('#2e7d32', 0.12),
      iconColor: isDark ? '#81c784' : '#2e7d32',
    },
    warning: {
      bg: isDark ? alpha('#ffb74d', 0.1) : '#fff7eb',
      iconBg: isDark ? alpha('#ffb74d', 0.18) : alpha('#ed6c02', 0.12),
      iconColor: isDark ? '#ffb74d' : '#e65100',
    },
    info: {
      bg: isDark ? alpha('#ce93d8', 0.1) : '#fbf3fd',
      iconBg: isDark ? alpha('#ce93d8', 0.18) : alpha('#7b1fa2', 0.12),
      iconColor: isDark ? '#ce93d8' : '#7b1fa2',
    },
  };
  const colors = paletteMap[tone] || paletteMap.primary;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: 1.25,
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: SECTION_RADIUS,
        bgcolor: colors.bg,
        minWidth: 0,
        boxShadow: 'none',
      }}
    >
      {/* Row 1: Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          noWrap
          title={label}
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '0.72rem',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            bgcolor: colors.iconBg,
            color: colors.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Box>

      {/* Row 2: Value pinned to bottom */}
      <Typography
        variant="h4"
        noWrap
        title={String(value)}
        sx={{
          fontWeight: 800,
          fontSize: { xs: '1.5rem', sm: '1.9rem' },
          lineHeight: 1.15,
          alignSelf: 'end',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </Typography>

      {/* Row 3: Reserved progress track + caption */}
      <Box sx={{ minWidth: 0 }}>
        <LinearProgress
          variant="determinate"
          value={progress ?? 0}
          sx={{
            height: 4,
            borderRadius: 2,
            mb: 0.75,
            visibility: progress === undefined ? 'hidden' : 'visible',
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              bgcolor: colors.iconColor,
              borderRadius: 2,
            },
          }}
        />
        <Typography
          variant="caption"
          noWrap
          title={caption}
          color="text.secondary"
          sx={{ display: 'block', fontSize: '0.75rem' }}
        >
          {caption}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Semantic HTML legend paired with `hideLegend` on MUI X Charts v9.
 */
export function ChartLegend({ items = [], total = 0 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: 1,
        mt: 1.5,
      }}
    >
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <Box
            key={item.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              minWidth: 0,
              px: 1.25,
              py: 0.75,
              borderRadius: '10px',
              bgcolor: 'background.default',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" noWrap title={item.label} fontWeight={600}>
                {item.label}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {item.value} ({pct}%)
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
