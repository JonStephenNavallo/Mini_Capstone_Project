import React from 'react';
import { Box, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import '@m3e/web/core';
import { M3eButton } from '@m3e/react/button';
import {
  PRIMARY_BUTTON_GRADIENT,
  PRIMARY_BUTTON_HOVER_GRADIENT,
} from '../../theme/themeContextValue.js';

/**
 * M3PillButton - Material 3 Expressive Pill Button powered by @m3e/react/button.
 * Strictly avoids outer glow effects and uses MUI SVG icons in slot="icon".
 */
const M3PillButton = React.forwardRef(({
  children,
  label,
  icon,
  startIcon,
  endIcon,
  trailingIcon,
  variant = 'filled',
  color = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  loadingLabel,
  fullWidth = false,
  onClick,
  type = 'button',
  component,
  to,
  sx = {},
  style = {},
  ariaLabel,
  ...rest
}, ref) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const resolvedVariant = React.useMemo(() => {
    if (variant === 'contained') return 'filled';
    if (['filled', 'tonal', 'outlined', 'text', 'elevated', 'minimal'].includes(variant)) {
      return variant;
    }
    return 'filled';
  }, [variant]);

  const colors = React.useMemo(() => {
    switch (color) {
      case 'error':
        return {
          container: isDark ? '#b71c1c' : '#d32f2f',
          hoverContainer: '#c62828',
          text: '#ffffff',
          outline: isDark ? '#f28b82' : '#d32f2f',
          outlineText: isDark ? '#f28b82' : '#d32f2f',
          tonalBg: isDark ? 'rgba(211, 47, 47, 0.22)' : 'rgba(211, 47, 47, 0.12)',
          tonalText: isDark ? '#ff8a80' : '#c62828',
        };
      case 'success':
        return {
          container: isDark ? '#1b5e20' : '#2e7d32',
          hoverContainer: isDark ? '#2e7d32' : '#1b5e20',
          text: '#ffffff',
          outline: isDark ? '#81c784' : '#2e7d32',
          outlineText: isDark ? '#81c784' : '#2e7d32',
          tonalBg: isDark ? 'rgba(46, 125, 50, 0.22)' : 'rgba(46, 125, 50, 0.12)',
          tonalText: isDark ? '#a5d6a7' : '#1b5e20',
        };
      case 'accent':
        return {
          container: '#f57f3b',
          hoverContainer: '#e56f2c',
          text: '#ffffff',
          outline: '#f57f3b',
          outlineText: '#f57f3b',
          tonalBg: 'rgba(245, 127, 59, 0.18)',
          tonalText: '#f57f3b',
        };
      case 'warning':
        return {
          container: isDark ? '#ff9800' : '#e65100',
          hoverContainer: isDark ? '#ffa726' : '#ef6c00',
          text: isDark ? '#211000' : '#ffffff',
          outline: isDark ? '#ffb74d' : '#e65100',
          outlineText: isDark ? '#ffb74d' : '#e65100',
          tonalBg: isDark ? 'rgba(230, 81, 0, 0.22)' : 'rgba(230, 81, 0, 0.12)',
          tonalText: isDark ? '#ffb74d' : '#e65100',
        };
      case 'secondary':
      case 'neutral':
        return {
          container: isDark ? '#37474f' : '#f1f3f4',
          hoverContainer: isDark ? '#455a64' : '#e8eaed',
          text: isDark ? '#eceff1' : '#3c4043',
          outline: isDark ? '#5f6368' : '#dadce0',
          outlineText: isDark ? '#eceff1' : '#3c4043',
          tonalBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          tonalText: isDark ? '#e8eaed' : '#3c4043',
        };
      case 'primary':
      default: {
        const primaryMain = theme.palette.primary?.main || '#0d4b6e';
        const primaryDark = theme.palette.primary?.dark || '#011f2f';
        return {
          container: primaryMain,
          hoverContainer: primaryDark,
          gradient: PRIMARY_BUTTON_GRADIENT,
          hoverGradient: PRIMARY_BUTTON_HOVER_GRADIENT,
          text: '#ffffff',
          outline: primaryMain,
          outlineText: primaryMain,
          tonalBg: 'rgba(13, 75, 110, 0.12)',
          tonalText: primaryMain,
        };
      }
    }
  }, [color, isDark, theme.palette.primary]);

  const cssVars = React.useMemo(() => {
    const resolvedHeight = isMobile
      ? '40px'
      : size === 'small'
        ? '34px'
        : size === 'large'
          ? '46px'
          : '40px';

    const baseVars = {
      '--m3e-button-container-height': resolvedHeight,
      '--m3e-button-shape-round': '9999px',
      '--m3e-button-shape-pressed-morph': '12px',
      '--m3e-button-label-text-font-weight': '600',
      '--m3e-button-label-text-font-size': isMobile ? '0.84rem' : size === 'small' ? '0.8rem' : '0.875rem',
      '--m3e-button-leading-space': size === 'small' ? '14px' : isMobile ? '16px' : '20px',
      '--m3e-button-trailing-space': size === 'small' ? '14px' : isMobile ? '16px' : '20px',
      '--m3e-button-icon-label-space': '8px',
      '--m3e-button-icon-size': size === 'small' ? '17px' : '19px',
    };

    if (resolvedVariant === 'filled') {
      const containerColor = colors.gradient ? 'transparent' : colors.container;
      const hoverContainerColor = colors.gradient ? 'transparent' : colors.hoverContainer;
      return {
        ...baseVars,
        '--m3e-button-container-color': containerColor,
        '--m3e-button-label-text-color': colors.text,
        '--m3e-button-icon-color': colors.text,
        '--m3e-button-hover-container-color': hoverContainerColor,
        '--m3e-button-hover-label-text-color': colors.text,
        '--m3e-button-hover-icon-color': colors.text,
        '--m3e-filled-button-container-color': containerColor,
        '--m3e-filled-button-label-text-color': colors.text,
        '--m3e-filled-button-icon-color': colors.text,
      };
    }

    if (resolvedVariant === 'tonal') {
      return {
        ...baseVars,
        '--m3e-button-container-color': colors.tonalBg,
        '--m3e-button-label-text-color': colors.tonalText,
        '--m3e-button-icon-color': colors.tonalText,
        '--m3e-tonal-button-container-color': colors.tonalBg,
        '--m3e-tonal-button-label-text-color': colors.tonalText,
        '--m3e-tonal-button-icon-color': colors.tonalText,
      };
    }

    if (resolvedVariant === 'outlined') {
      return {
        ...baseVars,
        '--m3e-button-outline-color': colors.outline,
        '--m3e-button-outline-thickness': '1px',
        '--m3e-button-label-text-color': colors.outlineText,
        '--m3e-button-icon-color': colors.outlineText,
        '--m3e-outlined-button-outline-color': colors.outline,
        '--m3e-outlined-button-label-text-color': colors.outlineText,
        '--m3e-outlined-button-icon-color': colors.outlineText,
      };
    }

    return {
      ...baseVars,
      '--m3e-button-label-text-color': colors.outlineText,
      '--m3e-button-icon-color': colors.outlineText,
      '--m3e-text-button-label-text-color': colors.outlineText,
      '--m3e-text-button-icon-color': colors.outlineText,
    };
  }, [resolvedVariant, colors, isMobile, size]);

  const activeIcon = icon || startIcon;
  const activeTrailingIcon = trailingIcon || endIcon;
  const content = loading && loadingLabel ? loadingLabel : children !== undefined ? children : label;

  const usesGradient = resolvedVariant === 'filled' && Boolean(colors.gradient);

  return (
    <Box
      ref={ref}
      component={component}
      to={to}
      sx={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        flex: fullWidth ? '1 1 100%' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'none',
        textDecoration: 'none',
        ...(usesGradient
          ? {
              borderRadius: '9999px',
              backgroundImage: colors.gradient,
              opacity: disabled || loading ? 0.55 : 1,
              transition: 'background-image 0.15s ease, opacity 0.15s ease',
              '&:hover': disabled || loading
                ? undefined
                : {
                    backgroundImage: colors.hoverGradient || colors.gradient,
                  },
            }
          : {}),
        ...cssVars,
        ...sx,
      }}
      style={style}
      {...rest}
    >
      <M3eButton
        variant={resolvedVariant === 'minimal' ? 'text' : resolvedVariant}
        shape="rounded"
        size={size === 'large' ? 'large' : size === 'small' ? 'small' : 'medium'}
        disabled={disabled || loading}
        type={type}
        onClick={onClick}
        aria-label={ariaLabel || (typeof content === 'string' ? content : undefined)}
        style={{
          width: fullWidth ? '100%' : 'auto',
          display: fullWidth ? 'block' : 'inline-block',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Google Sans Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          boxShadow: 'none',
        }}
      >
        {loading ? (
          <span slot="icon" style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
            <CircularProgress size={16} color="inherit" />
          </span>
        ) : activeIcon ? (
          <span slot="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {activeIcon}
          </span>
        ) : null}
        {content}
        {activeTrailingIcon && (
          <span slot="trailing-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {activeTrailingIcon}
          </span>
        )}
      </M3eButton>
      {/* Native light-DOM submit proxy so pressing Enter inside any <form> triggers native implicit submission */}
      {type === 'submit' && (
        <button
          type="submit"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled || loading}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        />
      )}
    </Box>
  );
});

M3PillButton.displayName = 'M3PillButton';

export default M3PillButton;
