import React, { useMemo, useRef } from 'react';
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import '@m3e/web/core';
import { M3eDatepicker } from '@m3e/react/datepicker';

function parseIsoLocalDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const dt = new Date(year, month, day);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toIsoLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * M3DateRangeFilter — Reusable Material 3 Expressive date-range selector
 * powered by Matraic's official @m3e/react/datepicker (<m3e-datepicker range>).
 * Uses MUI SVG icons (<CalendarMonthIcon />) to avoid font ligature FOUT.
 */
export default function M3DateRangeFilter({
  dateFrom = '',
  dateTo = '',
  onChange,
  label = 'Date Found',
  disableFuture = true,
  maxDate = null,
  variant = 'auto',
  fullWidth = false,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const resolvedVariant = variant === 'auto' ? (isMobile ? 'modal' : 'docked') : variant;
  const triggerRef = useRef(null);
  const pickerRef = useRef(null);

  const startDate = useMemo(() => parseIsoLocalDate(dateFrom), [dateFrom]);
  const endDate = useMemo(() => parseIsoLocalDate(dateTo), [dateTo]);
  const resolvedMaxDate = useMemo(() => {
    if (maxDate instanceof Date) return maxDate;
    if (typeof maxDate === 'string') return parseIsoLocalDate(maxDate);
    if (!disableFuture) return null;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }, [disableFuture, maxDate]);
  const hasSelection = Boolean(startDate || endDate);

  const displayLabel = useMemo(() => {
    if (startDate && endDate) {
      const startIso = toIsoLocalDate(startDate);
      const endIso = toIsoLocalDate(endDate);
      if (startIso === endIso) return formatShortDate(startDate);
      return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
    }
    if (startDate) return `From ${formatShortDate(startDate)}`;
    if (endDate) return `Until ${formatShortDate(endDate)}`;
    return label;
  }, [startDate, endDate, label]);

  const handleOpenPicker = () => {
    const picker = pickerRef.current;
    const trigger = triggerRef.current;
    if (!picker || !trigger) return;
    if (typeof picker.toggle === 'function') {
      picker.toggle(trigger);
    } else if (typeof picker.show === 'function') {
      picker.show(trigger);
    }
  };

  const handlePickerChange = (event) => {
    const picker = event?.target || pickerRef.current;
    if (!picker) return;
    const rawStart = picker.rangeStart || picker.date || null;
    const rawEnd = picker.rangeEnd || rawStart || null;
    const nextFrom = toIsoLocalDate(rawStart);
    const nextTo = toIsoLocalDate(rawEnd);
    onChange?.({ dateFrom: nextFrom, dateTo: nextTo });
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.({ dateFrom: '', dateTo: '' });
  };

  const pickerStyle = useMemo(
    () => ({
      // Override global `* { padding: 0 }` (which beats shadow :host rules) and
      // native UA `[popover] { overflow: auto }` that causes a spurious scrollbar
      // and bottom-corner clipping artifacts in Chromium.
      overflow: 'hidden',
      margin: resolvedVariant === 'modal' ? 'auto' : 0,
      paddingBlock: '12px',
      paddingInline: '8px',
      border: 'none',
      outline: 'none',
      borderRadius: resolvedVariant === 'modal' ? '28px' : '20px',
      backgroundClip: 'padding-box',
      '--m3e-datepicker-docked-container-shape': '20px',
      '--m3e-datepicker-modal-container-shape': '28px',
      '--m3e-datepicker-container-color': isDark ? '#1e1f23' : '#ffffff',
      '--m3e-datepicker-docked-container-color': isDark ? '#1e1f23' : '#ffffff',
      '--m3e-datepicker-modal-container-color': isDark ? '#1e1f23' : '#ffffff',
      '--m3e-calendar-container-color': isDark ? '#1e1f23' : '#ffffff',
      '--m3e-calendar-item-selected-container-color': theme.palette.primary.main,
      '--m3e-calendar-item-selected-color': theme.palette.primary.contrastText,
      '--m3e-calendar-range-container-color': isDark
        ? 'rgba(36, 120, 168, 0.28)'
        : 'rgba(13, 75, 110, 0.14)',
      '--m3e-calendar-range-color': theme.palette.text.primary,
      '--m3e-calendar-item-current-outline-color': theme.palette.primary.main,
      fontFamily: theme.typography.fontFamily,
    }),
    [
      isDark,
      resolvedVariant,
      theme.palette.primary.main,
      theme.palette.primary.contrastText,
      theme.palette.text.primary,
      theme.typography.fontFamily,
    ]
  );

  return (
    <Box
      sx={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        ...sx,
      }}
    >
      <Box
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={handleOpenPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenPicker();
          }
        }}
        aria-label={label}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.75,
          width: fullWidth ? '100%' : 'auto',
          height: fullWidth ? 40 : 32,
          px: 1.25,
          borderRadius: fullWidth ? '10px' : '8px',
          border: '1px solid',
          borderColor: hasSelection
            ? 'primary.main'
            : isDark
              ? 'rgba(255, 255, 255, 0.23)'
              : 'rgba(0, 0, 0, 0.23)',
          bgcolor: hasSelection
            ? isDark
              ? 'rgba(36, 120, 168, 0.16)'
              : 'rgba(13, 75, 110, 0.08)'
            : 'background.default',
          color: hasSelection ? 'primary.main' : 'text.primary',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: 'none',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
          '&:hover': {
            borderColor: hasSelection ? 'primary.main' : 'text.primary',
          },
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <CalendarMonthIcon sx={{ fontSize: 16, flexShrink: 0 }} />
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontSize: '0.8rem',
              fontWeight: hasSelection ? 700 : 500,
              lineHeight: 1,
            }}
          >
            {displayLabel}
          </Typography>
        </Box>

        {hasSelection && (
          <IconButton
            size="small"
            onClick={handleClear}
            aria-label="Clear date range"
            sx={{
              p: 0.2,
              ml: 0.25,
              color: 'inherit',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>

      <M3eDatepicker
        ref={pickerRef}
        variant={resolvedVariant}
        range
        clearable
        label={label}
        confirmLabel="Apply"
        dismissLabel="Cancel"
        clearLabel="Clear"
        rangeStart={startDate}
        rangeEnd={endDate}
        maxDate={resolvedMaxDate}
        startAt={startDate || new Date()}
        onChange={handlePickerChange}
        style={pickerStyle}
      />
    </Box>
  );
}
