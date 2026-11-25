import React, { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import { useLogout } from '../../../shared/hooks/useLogout.js';
import { useChangePassword } from '../../users/api/usersApi.js';

function extractPasswordError(err) {
  const data = err?.response?.data;
  if (!data) return 'Unable to update password. Please check your entries.';
  if (typeof data.detail === 'string') return data.detail;
  for (const key of ['current_password', 'new_password', 'confirm_password']) {
    if (Array.isArray(data[key]) && data[key][0]) return String(data[key][0]);
    if (typeof data[key] === 'string') return data[key];
  }
  return 'Unable to update password. Please check your entries.';
}

/**
 * ForcePasswordChangeDialog — Non-dismissible M3E modal shown whenever an
 * authenticated user has needs_password_change === true after an OSAS password reset.
 */
export default function ForcePasswordChangeDialog({ open, userEmail }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    try {
      await changePassword.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(extractPasswordError(err));
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      disableEscapeKeyDown
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.78)' : 'rgba(15, 23, 42, 0.55)',
          },
        },
        paper: {
          component: 'form',
          onSubmit: handleSubmit,
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
          gap: 1.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            bgcolor: 'rgba(245, 158, 11, 0.22)',
            color: '#fcd34d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LockResetIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, color: '#ffffff' }}>
            Set Your New Password
          </Typography>
          <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
            {userEmail || 'Required after OSAS password reset'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 2.25, sm: 3 },
          pt: { xs: '24px !important', sm: '28px !important' },
          pb: { xs: '24px !important', sm: '28px !important' },
          flexGrow: 1,
        }}
      >
        <Stack spacing={2}>
          <Alert severity="info" sx={{ borderRadius: '14px' }}>
            Your password was reset by OSAS. Please enter the temporary password you received and choose a new personal password to continue.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ borderRadius: '14px' }}>
              {error}
            </Alert>
          )}

          <TextField
            required
            fullWidth
            type="password"
            label="Temporary Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <TextField
            required
            fullWidth
            type="password"
            label="New Password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <TextField
            required
            fullWidth
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.25, sm: 3 },
          py: 2,
          bgcolor: isDark ? '#1a1b1e' : '#f8fafd',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1.25,
          '& > *': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
        }}
      >
        <M3PillButton
          variant="text"
          color="neutral"
          fullWidth={isMobile}
          disabled={logout.isPending}
          startIcon={<LogoutIcon sx={{ fontSize: '18px !important' }} />}
          onClick={() => logout.mutate()}
        >
          Sign Out
        </M3PillButton>
        <M3PillButton
          type="submit"
          variant="filled"
          color="primary"
          fullWidth={isMobile}
          loading={changePassword.isPending}
          disabled={!currentPassword || !newPassword || !confirmPassword}
          startIcon={<SaveIcon sx={{ fontSize: '18px !important' }} />}
        >
          Update Password
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
