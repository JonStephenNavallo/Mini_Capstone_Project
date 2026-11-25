import React from 'react';
import { Box, Chip } from '@mui/material';

/**
 * StatusBadge (M3 Expressive) — Adapted from the reference StudentDirectory StatusBadge.
 * Uses tonal container colors, pill contour (9999px), and an optional status dot.
 */
const M3_STATUS_PALETTE = {
  success: {
    light: { bg: '#dcf5e7', color: '#0d532b', border: '#a3e4be', dot: '#1b874b' },
    dark: {
      bg: 'rgba(34, 197, 94, 0.16)',
      color: '#86efac',
      border: 'rgba(74, 222, 128, 0.32)',
      dot: '#4ade80',
    },
  },
  warning: {
    light: { bg: '#fef3c7', color: '#78350f', border: '#fde68a', dot: '#d97706' },
    dark: {
      bg: 'rgba(245, 158, 11, 0.16)',
      color: '#fcd34d',
      border: 'rgba(251, 191, 36, 0.32)',
      dot: '#fbbf24',
    },
  },
  info: {
    light: { bg: '#e0f2fe', color: '#034a75', border: '#bae6fd', dot: '#0284c7' },
    dark: {
      bg: 'rgba(14, 165, 233, 0.16)',
      color: '#7dd3fc',
      border: 'rgba(56, 189, 248, 0.32)',
      dot: '#38bdf8',
    },
  },
  error: {
    light: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', dot: '#dc2626' },
    dark: {
      bg: 'rgba(239, 68, 68, 0.16)',
      color: '#fca5a5',
      border: 'rgba(248, 113, 113, 0.32)',
      dot: '#f87171',
    },
  },
  neutral: {
    light: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', dot: '#64748b' },
    dark: {
      bg: 'rgba(148, 163, 184, 0.14)',
      color: '#cbd5e1',
      border: 'rgba(148, 163, 184, 0.25)',
      dot: '#94a3b8',
    },
  },
};

const getStatusTone = (status) => {
  if (!status) return 'neutral';
  const norm = String(status).trim().toUpperCase();

  if (
    norm === 'CLAIMED' ||
    norm === 'ACTIVE' ||
    norm === 'COMPLETED' ||
    norm === 'APPROVED' ||
    norm === 'RETURNED'
  ) {
    return 'success';
  }

  if (norm.includes('PENDING') || norm === 'UNDER_REVIEW') {
    return 'warning';
  }

  if (norm === 'IN_CUSTODY' || norm === 'PROCESSING' || norm === 'IN_PROGRESS') {
    return 'info';
  }

  if (
    norm === 'DISPOSED' ||
    norm.includes('CANCEL') ||
    norm.includes('REJECT') ||
    norm === 'FAILED'
  ) {
    return 'error';
  }

  return 'neutral';
};

const StatusBadge = ({
  status,
  label,
  tone,
  showDot = true,
  size = 'small',
  sx = {},
  ...props
}) => {
  const displayLabel = label || status || 'Unknown';
  const activeTone = tone || getStatusTone(status || label);
  const palette = M3_STATUS_PALETTE[activeTone] || M3_STATUS_PALETTE.neutral;

  return (
    <Chip
      label={
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: showDot ? 0.75 : 0 }}>
          {showDot && (
            <Box
              component="span"
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? palette.dark.dot : palette.light.dot,
              }}
            />
          )}
          <span>{displayLabel}</span>
        </Box>
      }
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        letterSpacing: '0.015em',
        borderRadius: '9999px',
        height: size === 'small' ? 24 : 28,
        transition: 'all 0.15s ease-in-out',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? palette.dark.bg : palette.light.bg,
        color: (theme) =>
          theme.palette.mode === 'dark' ? palette.dark.color : palette.light.color,
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? palette.dark.border : palette.light.border,
        '&:hover': {
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? palette.dark.bg : palette.light.bg,
          filter: 'brightness(0.97)',
        },
        '& .MuiChip-label': {
          px: 1,
          py: 0,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

export default StatusBadge;
