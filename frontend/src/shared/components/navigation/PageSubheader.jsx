import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * PageSubheader — Adapted from the reference StudentDirectory mobile/page subheader.
 * Renders responsive title, subtitle count, and right-aligned action controls.
 */
const PageSubheader = ({
  title,
  subtitle,
  actions,
  sticky = true,
  sx = {},
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        flexShrink: 0,
        ...(sticky && {
          position: { xs: 'sticky', sm: 'static' },
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
        }),
        ...sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {typeof title === 'string' ? (
            <Typography
              variant="h5"
              noWrap
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                letterSpacing: '-0.3px',
                fontSize: { xs: '1.15rem', sm: '1.4rem', md: '1.5rem' },
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Typography>
          ) : (
            title
          )}

          {subtitle &&
            (typeof subtitle === 'string' ? (
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                sx={{
                  mt: 0.25,
                  fontWeight: 600,
                  fontSize: { xs: '0.78rem', sm: '0.85rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {subtitle}
              </Typography>
            ) : (
              subtitle
            ))}
        </Box>

        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageSubheader;
