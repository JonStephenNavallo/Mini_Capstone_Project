import React, { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';

/**
 * CategoryFormDialog — M3 Expressive Create/Edit dialog for Lost & Found ItemCategory.
 * Adheres to modal_architecture_rules.md (28px desktop / fullScreen mobile, tonal header & footer).
 */
export default function CategoryFormDialog({
  open,
  category = null,
  loading = false,
  errorMessage = '',
  onClose,
  onSubmit,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isEdit = Boolean(category);

  const [name, setName] = useState(category?.name || '');
  const [retentionDays, setRetentionDays] = useState(
    category?.retention_days ?? 90
  );
  const [requiresSecret, setRequiresSecret] = useState(
    category?.requires_secret_verification ?? true
  );
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit?.({
      name: trimmed,
      icon_key: category?.icon_key || 'category',
      retention_days: Math.max(1, Number(retentionDays) || 90),
      requires_secret_verification: Boolean(requiresSecret),
      is_active: Boolean(isActive),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark
              ? 'rgba(0, 0, 0, 0.7)'
              : 'rgba(15, 23, 42, 0.45)',
          },
        },
        paper: {
          component: 'form',
          onSubmit: handleFormSubmit,
          elevation: 0,
          sx: {
            borderRadius: isMobile ? 0 : '28px',
            bgcolor: '#ffffff',
            background: 'linear-gradient(180deg, #042a3f 0px, #042a3f 96px, #ffffff 96px, #ffffff 100%)',
            border: 'none',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.16)',
            overflow: 'hidden',
            maxHeight: isMobile ? '100dvh' : '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          p: { xs: 2.25, sm: 2.5 },
          pt: { xs: 'calc(env(safe-area-inset-top, 0px) + 16px)', sm: 2.5 },
          bgcolor: '#042a3f',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: { xs: 40, sm: 44 },
              height: { xs: 40, sm: 44 },
              borderRadius: '12px',
              bgcolor: 'rgba(245, 127, 59, 0.22)',
              color: '#ffb380',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CategoryOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                color: '#ffffff',
              }}
            >
              {isEdit ? 'Edit Item Category' : 'New Item Category'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.2, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.76)' }}
            >
              {isEdit
                ? 'Update retention policy, verification rules, or visibility'
                : 'Configure a category for Lost & Found reports'}
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close category dialog"
          sx={{
            borderRadius: '9999px',
            color: 'rgba(255, 255, 255, 0.85)',
            bgcolor: 'rgba(255, 255, 255, 0.10)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 2.25, sm: 3 },
          pt: { xs: '24px !important', sm: '28px !important' },
          pb: { xs: '24px !important', sm: '28px !important' },
          flexGrow: 1,
        }}
      >
        <Stack spacing={2.25}>
          {errorMessage && (
            <Alert severity="error" sx={{ borderRadius: '14px' }}>
              {errorMessage}
            </Alert>
          )}

          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                mb: 1.25,
                fontSize: '0.72rem',
              }}
            >
              Category Details
            </Typography>
            <Stack spacing={1.75}>
              <TextField
                required
                fullWidth
                size="small"
                label="Category Name"
                placeholder="e.g., Electronics, IDs & Cards, Bags"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
              <TextField
                required
                fullWidth
                size="small"
                type="number"
                label="Custody Retention Period (Days)"
                slotProps={{ htmlInput: { min: 1, max: 3650 } }}
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
            </Stack>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                mb: 0.75,
                fontSize: '0.72rem',
              }}
            >
              Verification &amp; Visibility
            </Typography>
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={requiresSecret}
                    onChange={(e) => setRequiresSecret(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Require secret verification markers
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Active in public &amp; student forms
                  </Typography>
                }
              />
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.25, sm: 3 },
          py: { xs: 2, sm: 2.2 },
          bgcolor: isDark ? '#1a1b1e' : '#f8fafd',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1.25,
          '& > *': {
            width: { xs: '100%', sm: 'auto' },
            m: '0 !important',
          },
        }}
      >
        <M3PillButton
          variant="text"
          color="neutral"
          fullWidth={isMobile}
          onClick={onClose}
        >
          Cancel
        </M3PillButton>
        <M3PillButton
          type="submit"
          variant="filled"
          color="primary"
          fullWidth={isMobile}
          loading={loading}
          disabled={!name.trim()}
          startIcon={<SaveIcon sx={{ fontSize: '18px !important' }} />}
        >
          {isEdit ? 'Save Changes' : 'Create Category'}
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
