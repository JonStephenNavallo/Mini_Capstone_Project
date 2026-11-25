import React, { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import M3DateField from '../../../shared/components/inputs/M3DateField.jsx';
import MultiPhotoUploader from '../../../shared/components/inputs/MultiPhotoUploader.jsx';

const EDITABLE_STATUS_OPTIONS = [
  { value: 'IN_CUSTODY', label: 'In OSAS Custody' },
  { value: 'DONATED', label: 'Donated (Post-Retention)' },
  { value: 'DISPOSED', label: 'Disposed (Post-Retention)' },
];

/**
 * EditFoundItemDialog — M3 Expressive modal for OSAS Admin to edit non-claimed
 * FoundItem details, shelf bin, confidential verification notes, or disposition status.
 * Strictly disallows setting CLAIMED directly (must go through Claim Counter).
 */
export default function EditFoundItemDialog({
  open,
  item = null,
  categories = [],
  locations = [],
  loading = false,
  errorMessage = '',
  onClose,
  onSubmit,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [form, setForm] = useState({
    title: item?.title || '',
    category: item?.category ? String(item.category) : '',
    general_description: item?.general_description || '',
    storage_shelf_bin: item?.storage_shelf_bin || '',
    found_location: item?.found_location ? String(item.found_location) : '',
    found_location_custom: item?.found_location_custom || '',
    date_found: item?.date_found || '',
    secret_identifiers: item?.secret_identifiers || '',
    custody_status: item?.custody_status || 'IN_CUSTODY',
  });
  const [secretPhotos, setSecretPhotos] = useState([]);

  const isPending = item?.custody_status === 'PENDING_SURRENDER';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      category: form.category || undefined,
      general_description: form.general_description.trim(),
      storage_shelf_bin: form.storage_shelf_bin.trim(),
      found_location: form.found_location || null,
      found_location_custom: form.found_location ? '' : form.found_location_custom.trim(),
      date_found: form.date_found || undefined,
      secret_identifiers: form.secret_identifiers.trim(),
    };
    if (!isPending && form.custody_status && form.custody_status !== 'CLAIMED') {
      payload.custody_status = form.custody_status;
    }

    if (secretPhotos[0]) {
      const fd = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined) return;
        fd.append(key, value === null ? '' : String(value));
      });
      fd.append('secret_photo', secretPhotos[0]);
      onSubmit?.(fd);
      return;
    }

    onSubmit?.(payload);
  };

  return (
    <Dialog
      open={Boolean(open && item)}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.45)',
          },
        },
        paper: {
          component: 'form',
          onSubmit: handleSubmit,
          elevation: 0,
          sx: {
            borderRadius: isMobile ? 0 : '28px',
            bgcolor: isDark ? '#1e1f23' : '#ffffff',
            backgroundImage: 'none',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: isDark
              ? '0 24px 48px -12px rgba(0, 0, 0, 0.6)'
              : '0 24px 48px -12px rgba(0, 0, 0, 0.12)',
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
            <EditOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, color: '#ffffff' }}>
              Edit Item Record
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
              {item?.tracking_code}
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close edit item dialog"
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
              Item Details
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                required
                size="small"
                fullWidth
                label="Item Title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  required
                  size="small"
                  fullWidth
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  fullWidth
                  label="Storage Shelf / Bin"
                  placeholder="e.g., Shelf B - Bin 04"
                  value={form.storage_shelf_bin}
                  onChange={(e) => setForm((p) => ({ ...p, storage_shelf_bin: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
                />
              </Stack>
              <TextField
                required
                multiline
                rows={2}
                size="small"
                fullWidth
                label="Public General Description"
                value={form.general_description}
                onChange={(e) => setForm((p) => ({ ...p, general_description: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Found Location"
                  value={form.found_location}
                  onChange={(e) => setForm((p) => ({ ...p, found_location: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
                >
                  <MenuItem value="">Other / Custom</MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={String(loc.id)}>
                      {loc.label}
                    </MenuItem>
                  ))}
                </TextField>
                <M3DateField
                  size="small"
                  fullWidth
                  label="Date Found"
                  value={form.date_found}
                  onChange={(nextDate) => setForm((p) => ({ ...p, date_found: nextDate }))}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
                />
              </Stack>
              {!form.found_location && (
                <TextField
                  size="small"
                  fullWidth
                  label="Custom Location"
                  value={form.found_location_custom}
                  onChange={(e) => setForm((p) => ({ ...p, found_location_custom: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
                />
              )}
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
                mb: 1.25,
                fontSize: '0.72rem',
              }}
            >
              Custody &amp; Verification
            </Typography>
            <Stack spacing={1.5}>
              {!isPending && (
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Custody Status / Disposition"
                  value={form.custody_status}
                  onChange={(e) => setForm((p) => ({ ...p, custody_status: e.target.value }))}
                  helperText="To release an item to its owner, use the Claim Counter workflow."
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
                >
                  {EDITABLE_STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                multiline
                rows={2}
                size="small"
                fullWidth
                label="Confidential Secret Identifiers (OSAS Staff Only)"
                value={form.secret_identifiers}
                onChange={(e) => setForm((p) => ({ ...p, secret_identifiers: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: '10px' } }}
              />

              {item?.secret_photo && secretPhotos.length === 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Current Confidential Reference Photo (OSAS Only)
                  </Typography>
                  <Box
                    component="img"
                    src={item.secret_photo}
                    alt="Current confidential verification photo"
                    sx={{
                      width: '100%',
                      maxWidth: 240,
                      aspectRatio: '4 / 3',
                      objectFit: 'cover',
                      borderRadius: '14px',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'block',
                    }}
                  />
                </Box>
              )}

              <MultiPhotoUploader
                files={secretPhotos}
                onChange={setSecretPhotos}
                maxFiles={1}
                label={
                  item?.secret_photo
                    ? 'Replace Confidential Serial / Mark Photo (Optional)'
                    : 'Confidential Serial / Mark Photo (OSAS Admin Only — Optional)'
                }
                helperText="Private verification photo stored for OSAS staff only. Never displayed publicly."
              />
            </Stack>
          </Box>
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
        <M3PillButton variant="text" color="neutral" fullWidth={isMobile} onClick={onClose}>
          Cancel
        </M3PillButton>
        <M3PillButton
          type="submit"
          variant="filled"
          color="primary"
          fullWidth={isMobile}
          loading={loading}
          disabled={!form.title.trim()}
          startIcon={<SaveIcon sx={{ fontSize: '18px !important' }} />}
        >
          Save Changes
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
