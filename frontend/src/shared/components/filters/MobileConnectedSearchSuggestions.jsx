import React from 'react';
import { Box, CircularProgress, Divider, Typography, useTheme } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import NorthWestIcon from '@mui/icons-material/NorthWest';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { M3SegmentedList, M3SegmentedListItem } from '../data-display/M3SegmentedList.jsx';

/**
 * MobileConnectedSearchSuggestions
 * ---------------------------------
 * Adapted from the reference project's connected search dropdown for Material 3 Expressive.
 * Fuses directly with the bottom edge of SearchBar (0px gap, top radius 0, bottom radius 24px)
 * and renders matching Lost & Found items using @m3e/react/list segmented items.
 */
export const MobileConnectedSearchSuggestions = ({
  suggestions = [],
  query = '',
  isLoading = false,
  onSelect,
  maxHeight = 'calc(100vh - 280px)',
  sx = {},
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Highlight matching query substrings without stateful global RegExp.test() bugs
  const renderHighlightedText = (text, highlight) => {
    if (!text) return '';
    const trimmed = (highlight || '').trim();
    if (!trimmed) return text;

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
    const lowerTarget = trimmed.toLowerCase();

    return parts.map((part, index) =>
      part.toLowerCase() === lowerTarget ? (
        <span
          key={index}
          style={{
            fontWeight: 800,
            color: isDark ? theme.palette.primary.light : theme.palette.primary.main,
          }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <Box
      onMouseDown={(e) => e.preventDefault()}
      sx={{
        width: '100%',
        bgcolor: isDark ? '#1e1f23' : '#ffffff',
        borderRadius: '0 0 24px 24px',
        border: '1px solid',
        borderTop: 'none',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
        boxShadow: isDark
          ? '0 10px 25px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)'
          : '0 10px 25px -3px rgba(1, 31, 47, 0.2), 0 4px 6px -2px rgba(1, 31, 47, 0.1)',
        maxHeight,
        overflowY: 'auto',
        p: 1,
        boxSizing: 'border-box',
        ...sx,
      }}
    >
      <Divider sx={{ mb: 0.75, borderColor: 'divider' }} />

      {isLoading ? (
        <Box sx={{ py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
            Searching found items…
          </Typography>
        </Box>
      ) : suggestions && suggestions.length > 0 ? (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1,
              py: 0.5,
              mb: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              Suggestions
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'primary.main',
                bgcolor: isDark ? 'rgba(144, 202, 249, 0.12)' : 'rgba(1, 31, 47, 0.07)',
                px: 1,
                py: 0.2,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: isDark ? 'rgba(144, 202, 249, 0.25)' : 'rgba(1, 31, 47, 0.14)',
              }}
            >
              {suggestions.length} {suggestions.length === 1 ? 'result' : 'results'}
            </Typography>
          </Box>

          <M3SegmentedList
            orientation="vertical"
            gap="2px"
            containerShape="16px"
            itemShape="10px"
            itemContainerColor={isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafd'}
          >
            {suggestions.map((item) => (
              <M3SegmentedListItem
                key={item.id || item.title}
                onClick={() => onSelect?.(item)}
                leading={<Inventory2OutlinedIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
                trailing={
                  <NorthWestIcon
                    sx={{
                      fontSize: 16,
                      color: 'text.disabled',
                      transform: 'rotate(90deg)',
                    }}
                  />
                }
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, py: 0.25 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      lineHeight: 1.25,
                      color: 'text.primary',
                    }}
                    noWrap
                  >
                    {renderHighlightedText(item.title, query)}
                  </Typography>
                  {item.subtitle && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'text.secondary',
                        lineHeight: 1.2,
                        mt: 0.25,
                        letterSpacing: '0.2px',
                      }}
                      noWrap
                    >
                      {renderHighlightedText(item.subtitle, query)}
                    </Typography>
                  )}
                </Box>
              </M3SegmentedListItem>
            ))}
          </M3SegmentedList>
        </>
      ) : (
        <Box sx={{ py: 2.5, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SearchOffIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.84rem' }}>
            No matching items found
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.25 }}>
            Try another keyword, building, or tracking code
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MobileConnectedSearchSuggestions;
