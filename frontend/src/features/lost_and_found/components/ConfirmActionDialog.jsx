import React from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';

export default function ConfirmActionDialog({
  open,
  title = 'Confirm Delete',
  reference = '',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  confirmLabel = 'Confirm Delete',
  loading = false,
  onClose,
  onConfirm,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(15,23,42,0.45)',
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: '28px',
            bgcolor: isDark ? '#1e1f23' : '#ffffff',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          px: 2.5,
          py: 2.25,
          bgcolor: '#042a3f',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            bgcolor: 'rgba(244, 67, 54, 0.22)',
            color: '#ff8a80',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DeleteIcon sx={{ fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.05rem', lineHeight: 1.2, color: '#ffffff' }}>
            {title}
          </Typography>
          {reference && (
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.76)', display: 'block', mt: 0.2 }}>
              {reference}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pt: '20px !important', pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions
        disableSpacing
        sx={{
          px: 2.5,
          pb: 2,
          pt: 1,
          gap: 1.25,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'flex-end',
        }}
      >
        <M3PillButton variant="text" color="neutral" fullWidth={isMobile} onClick={onClose}>
          Cancel
        </M3PillButton>
        <M3PillButton
          variant="filled"
          color="error"
          fullWidth={isMobile}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
