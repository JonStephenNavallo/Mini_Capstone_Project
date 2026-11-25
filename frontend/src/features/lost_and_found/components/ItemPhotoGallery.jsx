import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ZoomInIcon from '@mui/icons-material/ZoomIn';

/**
 * ItemPhotoGallery — Interactive multi-photo browser (up to 4 angles) shared by
 * ItemDetailDialog (Explore Items) and AdminItemDetailPanel (Items Directory).
 * Supports Prev/Next buttons, photo counter badge, clickable thumbnails,
 * mobile swipe gestures, and full-size lightbox zoom.
 */
export default function ItemPhotoGallery({
  primaryPhoto = null,
  photos = [],
  alt = 'Found item',
  maxHeight = 240,
  showPlaceholder = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const urls = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (Array.isArray(photos) && photos.length > 0) {
      photos.forEach((p) => {
        const src = typeof p === 'string' ? p : p?.image;
        if (src && !seen.has(src)) {
          seen.add(src);
          list.push(src);
        }
      });
    }
    if (primaryPhoto && !seen.has(primaryPhoto)) {
      list.unshift(primaryPhoto);
    }
    return list;
  }, [primaryPhoto, photos]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartXRef = useRef(null);

  const count = urls.length;
  const safeIdx = count > 0 ? Math.min(selectedIdx, count - 1) : 0;
  const activeUrl = urls[safeIdx] || null;

  const handlePrev = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (count <= 1) return;
      setSelectedIdx((prev) => (prev - 1 + count) % count);
    },
    [count]
  );

  const handleNext = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (count <= 1) return;
      setSelectedIdx((prev) => (prev + 1) % count);
    },
    [count]
  );

  const handleTouchStart = (e) => {
    if (count <= 1) return;
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    if (count <= 1 || touchStartXRef.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 36) return;
    if (delta < 0) handleNext();
    else handlePrev();
  };

  if (!activeUrl) {
    if (!showPlaceholder) return null;
    return (
      <Box
        sx={{
          width: '100%',
          height: 120,
          borderRadius: '16px',
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.disabled',
        }}
      >
        <Inventory2Icon sx={{ fontSize: 40 }} />
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1}>
        <Box
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
          }}
        >
          <Box
            component="img"
            src={activeUrl}
            alt={`${alt}${count > 1 ? ` (${safeIdx + 1} of ${count})` : ''}`}
            onClick={() => setLightboxOpen(true)}
            sx={{
              width: '100%',
              maxHeight,
              objectFit: 'cover',
              display: 'block',
              cursor: 'zoom-in',
            }}
          />

          {/* Photo Counter Badge */}
          {count > 1 && (
            <Chip
              size="small"
              label={`${safeIdx + 1} / ${count}`}
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                borderRadius: '9999px',
              }}
            />
          )}

          {/* Zoom Button */}
          <Tooltip title="Inspect full image">
            <IconButton
              size="small"
              aria-label="Inspect full image"
              onClick={() => setLightboxOpen(true)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0, 0, 0, 0.58)',
                color: '#ffffff',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.78)' },
              }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Prev / Next Navigation Overlay Buttons */}
          {count > 1 && (
            <>
              <IconButton
                size="small"
                aria-label="Previous photo"
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0, 0, 0, 0.55)',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.78)' },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="Next photo"
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(0, 0, 0, 0.55)',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.78)' },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Box>

        {/* Clickable Thumbnail Strip */}
        {count > 1 && (
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.25 }}>
            {urls.map((src, idx) => {
              const isActive = idx === safeIdx;
              return (
                <Box
                  key={src}
                  component="button"
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  aria-label={`View photo ${idx + 1}`}
                  sx={{
                    p: 0,
                    width: 60,
                    height: 46,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: isActive ? 'primary.main' : 'transparent',
                    opacity: isActive ? 1 : 0.7,
                    bgcolor: 'transparent',
                    transition: 'opacity 0.15s ease, border-color 0.15s ease',
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <Box
                    component="img"
                    src={src}
                    alt={`${alt} thumbnail ${idx + 1}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
              );
            })}
          </Box>
        )}
      </Stack>

      {/* Fullscreen Lightbox Inspection Dialog */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.82)',
            },
          },
          paper: {
            elevation: 0,
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'visible',
              position: 'relative',
            },
          },
        }}
      >
        <Box
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconButton
            aria-label="Close image preview"
            onClick={() => setLightboxOpen(false)}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 2,
              bgcolor: 'rgba(0, 0, 0, 0.65)',
              color: '#ffffff',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' },
            }}
          >
            <CloseIcon />
          </IconButton>

          {count > 1 && (
            <>
              <Chip
                size="small"
                label={`${safeIdx + 1} / ${count}`}
                sx={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  zIndex: 2,
                  fontWeight: 700,
                  bgcolor: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  borderRadius: '9999px',
                }}
              />
              <IconButton
                aria-label="Previous photo"
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: 12,
                  zIndex: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                aria-label="Next photo"
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 12,
                  zIndex: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.65)',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}

          <Box
            component="img"
            src={activeUrl}
            alt={alt}
            sx={{
              maxWidth: '100%',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: '18px',
              display: 'block',
            }}
          />
        </Box>
      </Dialog>
    </>
  );
}
