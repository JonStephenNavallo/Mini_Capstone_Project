import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import SaveIcon from '@mui/icons-material/Save';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import { CHROME_COLORS } from '../../../shared/theme/themeContextValue.js';
import { compressImageFile } from '../../../shared/utils/imageCompression.js';
import { useChangePassword, useUpdateMyAccount } from '../api/usersApi.js';

/**
 * AccountSettingsDialog — Material 3 Expressive self-service modal for updating
 * profile photo, contact details, and password. Full-screen on mobile and 28px modal on desktop.
 */
export default function AccountSettingsDialog({ open, onClose, currentUser }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const updateAccount = useUpdateMyAccount();
  const changePassword = useChangePassword();

  const isStudent = currentUser?.role === 'STUDENT';
  const initialContact = isStudent
    ? currentUser?.student_profile?.contact_number || ''
    : currentUser?.staff_profile?.contact_number || '';
  const initialProgram = isStudent ? currentUser?.student_profile?.program_year || '' : '';

  const [tab, setTab] = useState('profile');
  const [contactNumber, setContactNumber] = useState(initialContact);
  const [programYear, setProgramYear] = useState(initialProgram);
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset form fields whenever the modal opens for the current user
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTab('profile');
      setContactNumber(initialContact);
      setProgramYear(initialProgram);
      setPendingPhotoFile(null);
      setPreviewUrl(null);
      setRemovePhoto(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  if (!currentUser) return null;

  const avatarLetter = (currentUser.display_name || currentUser.email || 'U').charAt(0).toUpperCase();
  const displayedAvatarSrc = removePhoto ? undefined : previewUrl || currentUser.profile_photo || undefined;

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setCompressing(true);
    try {
      const compressed = await compressImageFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingPhotoFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      setRemovePhoto(false);
    } catch {
      setErrorMsg('Could not process that image. Please choose a valid JPG, PNG, or WebP photo.');
    } finally {
      setCompressing(false);
    }
  };

  const handleMarkRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingPhotoFile(null);
    setPreviewUrl(null);
    setRemovePhoto(true);
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const fd = new FormData();
      fd.append('contact_number', contactNumber.trim());
      if (isStudent) fd.append('program_year', programYear.trim());
      if (removePhoto) {
        fd.append('remove_profile_photo', 'true');
      } else if (pendingPhotoFile) {
        fd.append('profile_photo', pendingPhotoFile);
      }
      await updateAccount.mutateAsync(fd);
      setPendingPhotoFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setRemovePhoto(false);
      setSuccessMsg('Your account profile has been updated.');
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(data?.profile_photo || data?.contact_number || data?.detail || 'Failed to update profile.');
    }
  };

  const handleSavePassword = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
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
      setSuccessMsg('Password updated successfully.');
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(
        data?.current_password ||
          data?.new_password ||
          data?.confirm_password ||
          data?.detail ||
          'Failed to change password.'
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          },
        },
        paper: {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
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
            <ManageAccountsOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, lineHeight: 1.25, letterSpacing: '-0.015em', color: '#ffffff' }}
            >
              Account Settings
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.25, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.76)' }}>
              Update your profile photo, contact number, or password
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close account settings"
          sx={{
            borderRadius: '9999px',
            color: 'rgba(255, 255, 255, 0.85)',
            bgcolor: 'rgba(255, 255, 255, 0.10)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.18)', color: '#ffffff' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ px: { xs: 2.25, sm: 3.5 }, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setSuccessMsg('');
            setErrorMsg('');
          }}
          sx={{
            minHeight: 42,
            '& .MuiTab-root': { minHeight: 42, fontWeight: 700, fontSize: '0.84rem', textTransform: 'none' },
          }}
        >
          <Tab value="profile" label="Profile & Contact" />
          <Tab value="password" label="Password" />
        </Tabs>
      </Box>

      <DialogContent
        sx={{
          px: { xs: 2.25, sm: 3.5 },
          pt: { xs: '24px !important', sm: '28px !important' },
          pb: { xs: '24px !important', sm: '28px !important' },
          flexGrow: 1,
        }}
      >
        <Stack spacing={2.25}>
          {successMsg && (
            <Alert severity="success" sx={{ borderRadius: '14px' }}>
              {successMsg}
            </Alert>
          )}
          {errorMsg && (
            <Alert severity="error" sx={{ borderRadius: '14px' }}>
              {errorMsg}
            </Alert>
          )}

          {tab === 'profile' ? (
            <Stack spacing={2.25} component="form" id="account-profile-form" onSubmit={handleSaveProfile}>
              {/* Avatar Upload Section */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  component="label"
                  htmlFor="account-avatar-upload-input"
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    flexShrink: 0,
                  }}
                >
                  <Avatar
                    src={displayedAvatarSrc}
                    alt={currentUser.display_name || currentUser.email}
                    sx={{
                      width: 76,
                      height: 76,
                      bgcolor: CHROME_COLORS.sidebarSelectedBg,
                      color: CHROME_COLORS.sidebarSelectedText,
                      fontSize: '1.85rem',
                      fontWeight: 800,
                    }}
                  >
                    {avatarLetter}
                  </Avatar>
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: { xs: 'center', sm: 'flex-start' },
                    textAlign: { xs: 'center', sm: 'left' },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800}>
                    Profile Photo
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                    JPG, PNG, or WebP. Automatically compressed and displayed on your avatar and OSAS records.
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 1,
                      justifyContent: { xs: 'center', sm: 'flex-start' },
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    {/* Visually hidden (not display:none) input paired with native <label> for reliable mobile picker activation */}
                    <input
                      id="account-avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoPick}
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
                    <M3PillButton
                      component="label"
                      htmlFor="account-avatar-upload-input"
                      size="small"
                      variant="tonal"
                      loading={compressing}
                      startIcon={<CameraAltOutlinedIcon sx={{ fontSize: '17px !important' }} />}
                    >
                      {displayedAvatarSrc ? 'Change Photo' : 'Upload Photo'}
                    </M3PillButton>
                    {displayedAvatarSrc && (
                      <M3PillButton
                        size="small"
                        variant="text"
                        color="error"
                        startIcon={<DeleteOutlinedIcon sx={{ fontSize: '17px !important' }} />}
                        onClick={handleMarkRemovePhoto}
                      >
                        Remove
                      </M3PillButton>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Read-Only Institutional Identity */}
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
                    mb: 1,
                    fontSize: '0.72rem',
                  }}
                >
                  Institutional Identity (Managed by OSAS)
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <Chip size="small" label={currentUser.display_name} sx={{ fontWeight: 700, maxWidth: '100%' }} />
                  <Chip size="small" variant="outlined" label={currentUser.email} sx={{ maxWidth: '100%' }} />
                  {currentUser.student_profile?.student_number && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`ID: ${currentUser.student_profile.student_number}`}
                      sx={{ fontWeight: 700, maxWidth: '100%' }}
                    />
                  )}
                </Box>
              </Box>

              {/* Editable Contact Fields */}
              <TextField
                label="Contact Number"
                placeholder="e.g., 0917 123 4567"
                fullWidth
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                helperText="Used by OSAS only to coordinate item returns or verification follow-ups."
              />

              {isStudent && (
                <TextField
                  label="Program & Year"
                  placeholder="e.g., BSIT 3A"
                  fullWidth
                  value={programYear}
                  onChange={(e) => setProgramYear(e.target.value)}
                />
              )}
            </Stack>
          ) : (
            <Stack spacing={2} component="form" id="account-password-form" onSubmit={handleSavePassword}>
              <TextField
                required
                type="password"
                label="Current Password"
                fullWidth
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <TextField
                required
                type="password"
                label="New Password"
                helperText="At least 8 characters."
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <TextField
                required
                type="password"
                label="Confirm New Password"
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Stack>
          )}
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
        <M3PillButton variant="text" color="neutral" fullWidth={isMobile} onClick={onClose}>
          Close
        </M3PillButton>

        {tab === 'profile' ? (
          <M3PillButton
            variant="filled"
            color="primary"
            fullWidth={isMobile}
            loading={updateAccount.isPending || compressing}
            startIcon={<SaveIcon sx={{ fontSize: '18px !important' }} />}
            onClick={handleSaveProfile}
          >
            Save Changes
          </M3PillButton>
        ) : (
          <M3PillButton
            variant="filled"
            color="primary"
            fullWidth={isMobile}
            loading={changePassword.isPending}
            disabled={!currentPassword || newPassword.length < 8 || !confirmPassword}
            startIcon={<LockOutlinedIcon sx={{ fontSize: '18px !important' }} />}
            onClick={handleSavePassword}
          >
            Update Password
          </M3PillButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
