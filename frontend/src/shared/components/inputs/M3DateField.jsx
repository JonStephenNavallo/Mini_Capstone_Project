import React, { useMemo, useRef } from 'react';
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import '@m3e/web/core';
import { M3eDatepicker } from '@m3e/react/datepicker';

function parseIsoLocalDate(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toIsoLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * M3DateField — Reusable single-date form field powered by Matraic's official
 * @m3e/react/datepicker (<m3e-datepicker>). Renders a TextField-compatible
 * outlined control with an MUI SVG calendar trigger (zero font FOUT).
 */
export default function M3DateField({
  label = 'Date',
  value = '',
  onChange,
  required = false,
  fullWidth = true,
  size = 'medium',
  helperText,
  disabled = false,
  disableFuture = true,
  maxDate = null,
  variant = 'auto',
  sx = {},
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const resolvedVariant = variant === 'auto' ? (isMobile ? 'modal' : 'docked') : variant;
  const anchorRef = useRef(null);
  const pickerRef = useRef(null);

  const selectedDate = useMemo(() => parseIsoLocalDate(value), [value]);
  const displayValue = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);
  const resolvedMaxDate = useMemo(() => {
    if (maxDate instanceof Date) return maxDate;
    if (typeof maxDate === 'string') return parseIsoLocalDate(maxDate);
    if (!disableFuture) return null;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }, [disableFuture, maxDate]);

  const handleOpenPicker = () => {
    if (disabled) return;
    const picker = pickerRef.current;
    const anchor = anchorRef.current;
    if (!picker || !anchor) return;
    if (typeof picker.toggle === 'function') {
      picker.toggle(anchor);
    } else if (typeof picker.show === 'function') {
      picker.show(anchor);
    }
  };

  const handlePickerChange = (event) => {
    const picker = event?.target || pickerRef.current;
    if (!picker) return;
    const picked = picker.date || null;
    onChange?.(toIsoLocalDate(picked));
  };

  const pickerStyle = useMemo(
    () => ({
      // Prevent global `* { padding: 0 }` and native UA `[popover] { overflow: auto }` clipping
      overflow: 'hidden',
      margin: resolvedVariant === 'modal' ? 'auto' : 0,
      paddingBlock: '12px',
      paddingInline: '8px',
      border: 'none',
      outline: 'none',
      borderRadius: resolvedVariant === 'modal' ? '28px' : '20px',
      backgroundClip: 'padding-box',
      zIndex: 1700,
      '--m3e-datepicker-docked-container-shape': '20px',
      '--m3e-datepicker-modal-container-shape': '28px',
      '--m3e-datepicker-container-color': '#ffffff',
      '--m3e-datepicker-docked-container-color': '#ffffff',
      '--m3e-datepicker-modal-container-color': '#ffffff',
      '--m3e-calendar-container-color': '#ffffff',
      '--m3e-calendar-item-selected-container-color': theme.palette.primary.main,
      '--m3e-calendar-item-selected-color': theme.palette.primary.contrastText,
      '--m3e-calendar-item-current-outline-color': theme.palette.primary.main,
      fontFamily: theme.typography.fontFamily,
    }),
    [
      resolvedVariant,
      theme.palette.primary.main,
      theme.palette.primary.contrastText,
      theme.typography.fontFamily,
    ]
  );

  return (
    <Box
      ref={anchorRef}
      sx={{
        position: 'relative',
        width: fullWidth ? '100%' : 'auto',
        ...sx,
      }}
    >
      <TextField
        label={label}
        required={required}
        fullWidth={fullWidth}
        size={size}
        disabled={disabled}
        helperText={helperText}
        value={displayValue}
        placeholder="Select date"
        onClick={handleOpenPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenPicker();
          }
        }}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            readOnly: true,
            sx: { cursor: disabled ? 'default' : 'pointer' },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  disabled={disabled}
                  aria-label={`Select ${label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPicker();
                  }}
                >
                  <CalendarMonthIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <M3eDatepicker
        ref={pickerRef}
        variant={resolvedVariant}
        label={label}
        confirmLabel="Apply"
        dismissLabel="Cancel"
        date={selectedDate}
        maxDate={resolvedMaxDate}
        startAt={selectedDate || new Date()}
        onChange={handlePickerChange}
        style={pickerStyle}
      />
    </Box>
  );
}
