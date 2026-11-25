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
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';

/**
 * LocationFormDialog — M3 Expressive Create/Edit dialog for CampusLocation (Found Locations).
 * Adapts the exact CategoryFormDialog / modal_architecture_rules.md layout.
 */
export default function LocationFormDialog({
  open,
  location = null,
  loading = false,
  errorMessage = '',
  onClose,
  onSubmit,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isEdit = Boolean(location);

  const [buildingName, setBuildingName] = useState(location?.building_name || '');
  const [floorRoom, setFloorRoom] = useState(location?.floor_room || '');
  const [qrSlug, setQrSlug] = useState(location?.qr_slug || '');
  const [isDropOffPoint, setIsDropOffPoint] = useState(location?.is_drop_off_point ?? false);
  const [isActive, setIsActive] = useState(location?.is_active ?? true);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmedBuilding = buildingName.trim();
    if (!trimmedBuilding) return;
    onSubmit?.({
      building_name: trimmedBuilding,
      floor_room: floorRoom.trim(),
      qr_slug: qrSlug.trim(),
      is_drop_off_point: Boolean(isDropOffPoint),
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
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
            <LocationOnIcon fontSize="small" />
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
              {isEdit ? 'Edit Campus Location' : 'New Campus Location'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.2, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.76)' }}
            >
              {isEdit
                ? 'Update building name, room label, or visibility'
                : 'Add a campus place for Found & Lost item reports'}
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close location dialog"
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

          <Box sx={{ p: 2, borderRadius: '16px', bgcolor: '#f0f4f9' }}>
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
              Place Details
            </Typography>
            <Stack spacing={1.75}>
              <TextField
                required
                fullWidth
                size="small"
                label="Building / Area Name"
                placeholder="e.g., Main Library, IT Annex, Gymnasium"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
              <TextField
                fullWidth
                size="small"
                label="Floor / Room (Optional)"
                placeholder="e.g., 2F Quiet Study Wing, Room 304"
                value={floorRoom}
                onChange={(e) => setFloorRoom(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
              <TextField
                fullWidth
                size="small"
                label="QR Station Slug (Optional)"
                placeholder="Auto-generated from building & room if blank"
                value={qrSlug}
                onChange={(e) => setQrSlug(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
            </Stack>
          </Box>

          <Box sx={{ p: 2, borderRadius: '16px', bgcolor: '#f0f4f9' }}>
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
              Station &amp; Visibility
            </Typography>
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isDropOffPoint}
                    onChange={(e) => setIsDropOffPoint(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={600}>
                    Designate as QR drop-off station
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
          bgcolor: '#f8fafd',
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
          Cancel
        </M3PillButton>
        <M3PillButton
          type="submit"
          variant="filled"
          color="primary"
          fullWidth={isMobile}
          loading={loading}
          disabled={!buildingName.trim()}
          startIcon={<SaveIcon sx={{ fontSize: '18px !important' }} />}
        >
          {isEdit ? 'Save Changes' : 'Create Location'}
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
