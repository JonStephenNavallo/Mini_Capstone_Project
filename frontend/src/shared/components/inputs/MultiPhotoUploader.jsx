import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { compressImageFile, formatFileSize } from '../../utils/imageCompression.js';

/**
 * MultiPhotoUploader — Reusable M3E photo picker supporting 1..N (default max 4)
 * images with automatic client-side Canvas compression, cover badge, and previews.
 */
export default function MultiPhotoUploader({
  files = [],
  onChange,
  maxFiles = 4,
  label = 'Item Photos',
  helperText = 'Up to 4 photos. Images are automatically compressed before upload.',
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const inputRef = useRef(null);
  const [compressing, setCompressing] = useState(false);

  const previews = useMemo(
    () =>
      files.map((file, idx) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${idx}`,
        file,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const handleSelectFiles = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (picked.length === 0) return;

    const remainingSlots = Math.max(0, maxFiles - files.length);
    const toProcess = maxFiles === 1 ? picked.slice(0, 1) : picked.slice(0, remainingSlots);
    if (toProcess.length === 0) return;

    setCompressing(true);
    try {
      const compressed = await Promise.all(
        toProcess.map((f) => compressImageFile(f))
      );
      const nextFiles = maxFiles === 1 ? compressed : [...files, ...compressed].slice(0, maxFiles);
      onChange?.(nextFiles);
    } finally {
      setCompressing(false);
    }
  };

  const handleRemove = (index) => {
    const next = files.filter((_, i) => i !== index);
    onChange?.(next);
  };

  const canAddMore = maxFiles === 1 ? files.length === 0 : files.length < maxFiles;
  const isEmpty = files.length === 0;

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: '16px',
        bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f0f4f9',
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.25,
          mb: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontSize: '0.72rem',
            lineHeight: 1.3,
          }}
        >
          {label}
        </Typography>
        <Chip
          size="small"
          label={`${files.length} / ${maxFiles}`}
          sx={{
            height: 22,
            fontSize: '0.68rem',
            fontWeight: 700,
            borderRadius: '9999px',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(13, 75, 110, 0.10)',
            color: isDark ? '#ffffff' : '#0d4b6e',
            flexShrink: 0,
          }}
        />
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxFiles > 1}
        onChange={handleSelectFiles}
        style={{ display: 'none' }}
      />

      {isEmpty ? (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => !compressing && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (!compressing && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          sx={{
            width: '100%',
            minHeight: { xs: 104, sm: 108 },
            px: 2,
            py: 2,
            borderRadius: '14px',
            border: '1.5px dashed',
            borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(13,75,110,0.32)',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: { xs: 'center', sm: 'left' },
            gap: { xs: 1, sm: 1.5 },
            cursor: compressing ? 'wait' : 'pointer',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(13,75,110,0.04)',
              borderColor: 'primary.main',
            },
          }}
        >
          {compressing ? (
            <CircularProgress size={24} />
          ) : (
            <>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  bgcolor: 'rgba(13, 75, 110, 0.10)',
                  color: '#0d4b6e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ lineHeight: 1.25 }}>
                  {maxFiles > 1 ? 'Tap or click to add photos' : 'Tap or click to add a photo'}
                </Typography>
                {helperText && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                    {helperText}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns:
                maxFiles === 1
                  ? { xs: '1fr', sm: 'minmax(0, 240px)' }
                  : { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
              gap: 1.25,
            }}
          >
            {previews.map((item, idx) => (
              <Box
                key={item.key}
                sx={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  border: '1px solid',
                  borderColor: 'divider',
                  minWidth: 0,
                }}
              >
                <Box
                  component="img"
                  src={item.url}
                  alt={item.file.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {maxFiles > 1 && idx === 0 && (
                  <Chip
                    size="small"
                    label="Cover"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    }}
                  />
                )}
                <Chip
                  size="small"
                  label={formatFileSize(item.file.size)}
                  sx={{
                    position: 'absolute',
                    bottom: 6,
                    left: 6,
                    height: 20,
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                  }}
                />
                <IconButton
                  size="small"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => handleRemove(idx)}
                  sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    p: 0.35,
                    bgcolor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.85)' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Box>
            ))}

            {canAddMore && (
              <Box
                role="button"
                tabIndex={0}
                onClick={() => !compressing && inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (!compressing && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                sx={{
                  aspectRatio: '4 / 3',
                  borderRadius: '14px',
                  border: '1.5px dashed',
                  borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(13,75,110,0.32)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  cursor: compressing ? 'wait' : 'pointer',
                  color: 'primary.main',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(13,75,110,0.04)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                {compressing ? (
                  <CircularProgress size={22} />
                ) : (
                  <>
                    <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 22 }} />
                    <Typography variant="caption" fontWeight={700}>
                      Add More
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </Box>

          {helperText && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.9 }}>
              {helperText}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
