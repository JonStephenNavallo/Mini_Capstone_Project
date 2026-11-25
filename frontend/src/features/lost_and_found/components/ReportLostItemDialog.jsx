import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
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
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SendIcon from '@mui/icons-material/Send';
import M3DateField from '../../../shared/components/inputs/M3DateField.jsx';
import MultiPhotoUploader from '../../../shared/components/inputs/MultiPhotoUploader.jsx';
import M3StepWizard from '../../../shared/components/navigation/M3StepWizard.jsx';
import { useCategories, useCreateLostReport, useLocations } from '../api/lostFoundApi.js';

const LOST_WIZARD_STEPS = [
  { key: 'item', label: 'Item Details', caption: 'Category & photo' },
  { key: 'context', label: 'Location & Clues', caption: 'Where, when & marks' },
  { key: 'review', label: 'Review & Match', caption: 'Confirm & submit' },
];

const INITIAL_FORM = () => ({
  category: '',
  item_name: '',
  detailed_description: '',
  distinctive_features: '',
  suspected_location: '',
  suspected_location_custom: '',
  date_lost: new Date().toISOString().slice(0, 10),
});

/**
 * Material 3 Expressive 3-step Lost Item Report modal.
 * Full-screen on mobile (`sm` down) and a 28px squircle modal on desktop.
 */
export default function ReportLostItemDialog({ open, onClose, onCreated }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const createReport = useCreateLostReport();

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [photos, setPhotos] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === form.category)?.name || '—',
    [categories, form.category]
  );

  const selectedLocationLabel = useMemo(() => {
    if (form.suspected_location) {
      return locations.find((l) => l.id === form.suspected_location)?.label || 'Campus Location';
    }
    return form.suspected_location_custom.trim() || 'Unspecified';
  }, [locations, form.suspected_location, form.suspected_location_custom]);

  const canProceed = useMemo(() => {
    if (activeStep === 0) {
      return Boolean(form.category && form.item_name.trim());
    }
    if (activeStep === 1) {
      return Boolean(form.detailed_description.trim() && form.date_lost);
    }
    return Boolean(form.category && form.item_name.trim() && form.detailed_description.trim() && form.date_lost);
  }, [activeStep, form]);

  const handleResetAndClose = () => {
    if (createReport.isPending) return;
    setErrorMsg('');
    setActiveStep(0);
    setForm(INITIAL_FORM());
    setPhotos([]);
    onClose?.();
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('item_name', form.item_name);
      fd.append('detailed_description', form.detailed_description);
      fd.append('distinctive_features', form.distinctive_features);
      if (form.suspected_location) fd.append('suspected_location', form.suspected_location);
      fd.append('suspected_location_custom', form.suspected_location_custom);
      fd.append('date_lost', form.date_lost);
      if (photos[0]) fd.append('reference_photo', photos[0]);

      const created = await createReport.mutateAsync(fd);
      const matchesCount = created.match_candidates?.length || 0;
      const summaryMessage =
        matchesCount > 0
          ? `Report filed! Auto-matching immediately found ${matchesCount} potential match(es) in OSAS custody — inspect them below to generate your Walk-In Claim QR Pass.`
          : 'Lost item report filed! You will receive an automatic alert if a matching item is turned in to OSAS.';

      setForm(INITIAL_FORM());
      setPhotos([]);
      setActiveStep(0);
      onCreated?.(summaryMessage, created);
      onClose?.();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit lost item report.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleResetAndClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.45)',
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: isMobile ? 0 : '28px',
            bgcolor: isDark ? '#1e1f23' : '#ffffff',
            backgroundImage: 'none',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
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
            <ReportProblemOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.15rem' }, lineHeight: 1.25, letterSpacing: '-0.015em', color: '#ffffff' }}
            >
              Report Personal Lost Item
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.25, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.76)' }}
            >
              Complete the 3-step inquiry so our Auto-Matching Engine alerts you when OSAS logs a match.
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={handleResetAndClose}
          disabled={createReport.isPending}
          aria-label="Close report lost item dialog"
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
          px: { xs: 2.25, sm: 3.5 },
          pt: { xs: '24px !important', sm: '28px !important' },
          pb: { xs: '24px !important', sm: '28px !important' },
          flexGrow: 1,
        }}
      >
        <Stack spacing={2}>
          {errorMsg && (
            <Alert severity="error" sx={{ borderRadius: '14px' }}>
              {errorMsg}
            </Alert>
          )}

          <M3StepWizard
            steps={LOST_WIZARD_STEPS}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            canProceed={canProceed}
            submitLabel="Submit & Run Auto-Match"
            submitIcon={<SendIcon fontSize="small" />}
            submitColor="accent"
            submitting={createReport.isPending}
            onSubmit={handleSubmit}
          >
            {activeStep === 0 && (
              <Stack spacing={2}>
                <TextField
                  select
                  required
                  label="Item Category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  required
                  label="Item Name"
                  placeholder="e.g., Navy AquaFlask 32oz Tumbler"
                  value={form.item_name}
                  onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))}
                />

                <MultiPhotoUploader
                  files={photos}
                  onChange={setPhotos}
                  maxFiles={1}
                  label="Reference Photo (Optional)"
                  helperText="Upload a photo if you have one; automatically compressed before upload."
                />
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    fullWidth
                    label="Suspected Campus Location"
                    value={form.suspected_location}
                    onChange={(e) => setForm((p) => ({ ...p, suspected_location: e.target.value }))}
                  >
                    <MenuItem value="">Unspecified / Other</MenuItem>
                    {locations.map((loc) => (
                      <MenuItem key={loc.id} value={loc.id}>
                        {loc.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <M3DateField
                    required
                    fullWidth
                    label="Date Lost"
                    value={form.date_lost}
                    onChange={(nextDate) => setForm((p) => ({ ...p, date_lost: nextDate }))}
                  />
                </Stack>

                {!form.suspected_location && (
                  <TextField
                    label="Specific Area / Room (Optional)"
                    placeholder="e.g., 2nd floor hallway near Room 204"
                    value={form.suspected_location_custom}
                    onChange={(e) => setForm((p) => ({ ...p, suspected_location_custom: e.target.value }))}
                  />
                )}

                <TextField
                  required
                  multiline
                  rows={3}
                  label="Detailed Description"
                  placeholder="Color, brand, model, and where you last had it…"
                  value={form.detailed_description}
                  onChange={(e) => setForm((p) => ({ ...p, detailed_description: e.target.value }))}
                />

                <TextField
                  label="Distinctive / Secret Marks (helps OSAS verify ownership)"
                  placeholder="e.g., Cat sticker inside lid, initials scratched on back"
                  value={form.distinctive_features}
                  onChange={(e) => setForm((p) => ({ ...p, distinctive_features: e.target.value }))}
                />
              </Stack>
            )}

            {activeStep === 2 && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '18px',
                  bgcolor: '#011f2f',
                  color: '#ffffff',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: '#f57f3b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Inquiry Summary — Ready for Auto-Match
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#ffffff' }}>
                  {form.item_name}
                </Typography>

                <Stack spacing={1} sx={{ mt: 1.75 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Category:</strong> {selectedCategoryName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Last Seen:</strong> {selectedLocationLabel} on {form.date_lost}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Description:</strong> {form.detailed_description}
                  </Typography>
                  {form.distinctive_features && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                      <strong>Secret / Distinctive Marks:</strong> {form.distinctive_features}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.68)', pt: 0.5 }}>
                    {photos.length > 0 ? '1 reference photo attached' : 'No reference photo attached'}
                  </Typography>
                </Stack>
              </Box>
            )}
          </M3StepWizard>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
