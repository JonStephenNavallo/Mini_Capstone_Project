import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import M3PillButton from '../actions/M3PillButton.jsx';
import { CARD_COLORS } from '../../theme/themeContextValue.js';

/**
 * M3MediaCard - Reusable institutional media card container.
 * Uses the deep midnight-teal surface (#011f2f) with an M3 Expressive
 * #f57f3b filled pill CTA and strict 3-row equal-height grid rhythm.
 */
export default function M3MediaCard({
  mediaSrc,
  mediaAlt = '',
  mediaFallbackIcon,
  mediaHeight = 170,
  topLeftBadge,
  bottomRightBadge,
  overline,
  title,
  description,
  metaItems = [],
  actionLabel,
  actionIcon,
  onActionClick,
  onClick,
  footer,
  sx = {},
}) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        display: 'grid',
        gridTemplateRows: `${mediaHeight}px 1fr auto`,
        borderRadius: '20px',
        overflow: 'hidden',
        bgcolor: CARD_COLORS.bg,
        color: CARD_COLORS.text,
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 0,
        boxShadow: 'none',
        transition: 'background-color 0.15s ease',
        '&:hover': onClick
          ? {
              bgcolor: CARD_COLORS.hoverBg,
            }
          : undefined,
        ...sx,
      }}
    >
      {/* Media / Placeholder Header */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: CARD_COLORS.mediaBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {mediaSrc ? (
          <Box
            component="img"
            src={mediaSrc}
            alt={mediaAlt || title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          mediaFallbackIcon || (
            <Inventory2Icon sx={{ fontSize: 44, color: 'rgba(255, 255, 255, 0.36)' }} />
          )
        )}

        {topLeftBadge && (
          <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
            {topLeftBadge}
          </Box>
        )}

        {bottomRightBadge && (
          <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
            {bottomRightBadge}
          </Box>
        )}
      </Box>

      {/* Card Body */}
      <Box sx={{ p: 2, minWidth: 0 }}>
        {overline && (
          <Typography
            variant="caption"
            fontWeight={700}
            noWrap
            sx={{ display: 'block', color: CARD_COLORS.overline }}
          >
            {overline}
          </Typography>
        )}

        {title && (
          <Typography
            variant="subtitle1"
            fontWeight={800}
            noWrap
            title={title}
            sx={{ mt: 0.25, color: CARD_COLORS.text }}
          >
            {title}
          </Typography>
        )}

        {description && (
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              color: CARD_COLORS.secondaryText,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em',
            }}
          >
            {description}
          </Typography>
        )}

        {metaItems.length > 0 && (
          <Stack spacing={0.5} sx={{ mt: 1.25 }}>
            {metaItems.map((meta, idx) => (
              <Box
                key={meta.key || idx}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}
              >
                {meta.icon && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      color: CARD_COLORS.mutedText,
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ color: CARD_COLORS.mutedText }}
                >
                  {meta.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Footer CTA */}
      {(footer || actionLabel) && (
        <Box sx={{ px: 2, pb: 2 }}>
          {footer || (
            <M3PillButton
              variant="filled"
              color="accent"
              size="small"
              fullWidth
              icon={actionIcon}
              onClick={(e) => {
                e.stopPropagation();
                onActionClick?.(e);
              }}
            >
              {actionLabel}
            </M3PillButton>
          )}
        </Box>
      )}
    </Paper>
  );
}
