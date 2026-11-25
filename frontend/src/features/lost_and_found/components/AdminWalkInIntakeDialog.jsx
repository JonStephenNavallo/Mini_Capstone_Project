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
import AddBoxIcon from '@mui/icons-material/AddBox';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import M3DateField from '../../../shared/components/inputs/M3DateField.jsx';
import MultiPhotoUploader from '../../../shared/components/inputs/MultiPhotoUploader.jsx';
import M3StepWizard from '../../../shared/components/navigation/M3StepWizard.jsx';
import api from '../../../services/api.js';
import {
  useAdminCreateFoundItem,
  useCategories,
  useLocations,
} from '../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../state/lostFoundUiStore.js';
import { DEPARTMENT_COURSES } from '../constants/departments.js';

const INTAKE_WIZARD_STEPS = [
  { key: 'item', label: 'Item & Location', caption: 'Public details' },
  { key: 'custody', label: 'Vault & Credit', caption: 'Secret marks & dept' },
  { key: 'confirm', label: 'Log & QR Tag', caption: 'Confirm intake' },
];

const INITIAL_FORM = () => ({
  category: '',
  title: '',
  general_description: '',
  secret_identifiers: '',
  found_location: '',
  found_location_custom: '',
  date_found: new Date().toISOString().slice(0, 10),
  storage_shelf_bin: '',
  finder_department: '',
  finder_user: '',
  finder_name: '',
  finder_contact: '',
});

/**
 * AdminWalkInIntakeDialog - Material 3 Expressive Modal Dialog hosting the
 * 3-step OSAS Walk-In Found Item Intake Wizard & instant Custody QR Tag generator.
 * Accessible globally from the Desktop Sidebar FAB, Admin Dashboard, Items Directory, and Mobile FAB.
 */
export default function AdminWalkInIntakeDialog() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const open = useLostFoundUiStore((s) => s.walkInIntakeOpen);
  const closeWalkInIntake = useLostFoundUiStore((s) => s.closeWalkInIntake);
  const openQrPrint = useLostFoundUiStore((s) => s.openQrPrint);

  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const createItem = useAdminCreateFoundItem();

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [publicPhotos, setPublicPhotos] = useState([]);
  const [secretPhotos, setSecretPhotos] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentMatches, setStudentMatches] = useState([]);
  const [createdItem, setCreatedItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c.id === form.category)?.name || '—',
    [categories, form.category]
  );

  const selectedLocationLabel = useMemo(() => {
    if (form.found_location) {
      return locations.find((l) => l.id === form.found_location)?.label || 'Campus Location';
    }
    return form.found_location_custom.trim() || 'Campus Grounds';
  }, [locations, form.found_location, form.found_location_custom]);

  const canProceed = useMemo(() => {
    if (activeStep === 0) {
      return Boolean(
        form.category &&
        form.title.trim() &&
        form.general_description.trim() &&
        form.date_found
      );
    }
    return true;
  }, [activeStep, form]);

  const resetFormState = () => {
    setForm(INITIAL_FORM());
    setPublicPhotos([]);
    setSecretPhotos([]);
    setStudentQuery('');
    setStudentMatches([]);
    setCreatedItem(null);
    setErrorMsg('');
    setActiveStep(0);
  };

  const handleClose = () => {
    if (createItem.isPending) return;
    resetFormState();
    closeWalkInIntake();
  };

  const handleLookupFinderStudent = async (q) => {
    setStudentQuery(q);
    if (q.trim().length < 2) {
      setStudentMatches([]);
      return;
    }
    try {
      const { data } = await api.get('/users/students/', { params: { q: q.trim() } });
      setStudentMatches(data);
    } catch {
      setStudentMatches([]);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('title', form.title);
      fd.append('general_description', form.general_description);
      fd.append('secret_identifiers', form.secret_identifiers);
      if (form.found_location) fd.append('found_location', form.found_location);
      fd.append('found_location_custom', form.found_location_custom);
      fd.append('date_found', form.date_found);
      fd.append('storage_shelf_bin', form.storage_shelf_bin);
      fd.append('custody_status', 'IN_CUSTODY');
      if (form.finder_department) fd.append('finder_department', form.finder_department);
      if (form.finder_user) fd.append('finder_user', form.finder_user);
      fd.append('finder_name', form.finder_name);
      fd.append('finder_contact', form.finder_contact);
      if (publicPhotos[0]) fd.append('primary_photo', publicPhotos[0]);
      publicPhotos.slice(1).forEach((file) => fd.append('photos', file));
      if (secretPhotos[0]) fd.append('secret_photo', secretPhotos[0]);

      const res = await createItem.mutateAsync(fd);
      setCreatedItem(res);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to log item into OSAS custody.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="md"
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
      {/* Institutional M3 Header Lockup */}
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
            <AddBoxIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1rem', sm: '1.15rem' },
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                color: '#ffffff',
              }}
            >
              Walk-In Found Item Intake
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.25, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.76)' }}
            >
              Log surrendered property into OSAS custody and generate its Custody QR Tag
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="Close walk-in intake modal"
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

      {/* Scrollable Wizard Content (Mandatory pt !important override) */}
      <DialogContent
        sx={{
          px: { xs: 2.25, sm: 3.5 },
          pt: { xs: '24px !important', sm: '28px !important' },
          pb: { xs: '24px !important', sm: '28px !important' },
          flexGrow: 1,
        }}
      >
        {errorMsg && (
          <Alert severity="error" sx={{ borderRadius: '14px', mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {createdItem ? (
          <Stack spacing={2.5} alignItems="center" sx={{ py: 1.5, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                bgcolor: 'rgba(46, 125, 50, 0.12)',
                color: '#2e7d32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircleOutlinedIcon sx={{ fontSize: 32 }} />
            </Box>

            <Box>
              <Typography variant="h6" fontWeight={800}>
                Custody Logged &amp; QR Tag Ready
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                <strong>{createdItem.title}</strong> ({createdItem.tracking_code}) is now{' '}
                <strong>IN CUSTODY</strong> and auto-matching has run.
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: '#f8fafd',
                border: '1px solid',
                borderColor: 'divider',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <QRCodeSVG value={createdItem.tracking_code} size={156} level="M" />
              <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '0.04em' }}>
                {createdItem.tracking_code}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shelf: {createdItem.storage_shelf_bin || 'OSAS Vault'}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <M3PillButton
                variant="filled"
                color="accent"
                icon={<QrCode2Icon fontSize="small" />}
                onClick={() =>
                  openQrPrint({
                    title: 'OSAS Custody Tag',
                    subtitle: createdItem.title,
                    code: createdItem.tracking_code,
                    hint: `Shelf: ${createdItem.storage_shelf_bin || 'OSAS Vault'}`,
                  })
                }
              >
                Print Custody QR Tag
              </M3PillButton>
              <M3PillButton variant="outlined" color="primary" onClick={resetFormState}>
                Log Another Item
              </M3PillButton>
              <M3PillButton variant="text" color="neutral" onClick={handleClose}>
                Done
              </M3PillButton>
            </Stack>
          </Stack>
        ) : (
          <M3StepWizard
            steps={INTAKE_WIZARD_STEPS}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            canProceed={canProceed}
            submitLabel="Log Into OSAS Custody & Generate QR"
            submitIcon={<AddBoxIcon fontSize="small" />}
            submitColor="accent"
            submitting={createItem.isPending}
            onSubmit={handleSubmit}
          >
            {activeStep === 0 && (
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    required
                    fullWidth
                    label="Category"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {categories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <M3DateField
                    required
                    fullWidth
                    label="Date Found"
                    value={form.date_found}
                    onChange={(nextDate) => setForm((p) => ({ ...p, date_found: nextDate }))}
                  />
                </Stack>

                <TextField
                  required
                  label="Item Title"
                  placeholder="e.g., Silver MacBook Air Charger 30W"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />

                <TextField
                  required
                  multiline
                  rows={3}
                  label="Public General Description (visible to students)"
                  value={form.general_description}
                  onChange={(e) => setForm((p) => ({ ...p, general_description: e.target.value }))}
                />

                <TextField
                  select
                  fullWidth
                  label="Found Location"
                  value={form.found_location}
                  onChange={(e) => setForm((p) => ({ ...p, found_location: e.target.value }))}
                >
                  <MenuItem value="">Other / Custom</MenuItem>
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.label}
                    </MenuItem>
                  ))}
                </TextField>

                {!form.found_location && (
                  <TextField
                    label="Custom Location"
                    value={form.found_location_custom}
                    onChange={(e) => setForm((p) => ({ ...p, found_location_custom: e.target.value }))}
                  />
                )}
              </Stack>
            )}

            {activeStep === 1 && (
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Storage Shelf / Bin"
                  placeholder="e.g., Shelf B - Bin 04"
                  value={form.storage_shelf_bin}
                  onChange={(e) => setForm((p) => ({ ...p, storage_shelf_bin: e.target.value }))}
                />

                <TextField
                  multiline
                  rows={2}
                  label="Confidential Secret Identifiers (OSAS Staff Only — hidden from students)"
                  placeholder="e.g., Serial #C02..., custom sticker underneath, contents inside wallet"
                  value={form.secret_identifiers}
                  onChange={(e) => setForm((p) => ({ ...p, secret_identifiers: e.target.value }))}
                />

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
                    Finder Department &amp; Details (Credits Department Leaderboard)
                  </Typography>
                  <Stack spacing={1.25}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      label="Student Department / Course"
                      value={form.finder_department}
                      onChange={(e) => setForm((p) => ({ ...p, finder_department: e.target.value }))}
                      helperText="Select the student finder's course to award +25 points to their department."
                      sx={{ bgcolor: '#ffffff', borderRadius: '8px' }}
                    >
                      <MenuItem value="">None (Staff / Non-Student)</MenuItem>
                      {DEPARTMENT_COURSES.map((dept) => (
                        <MenuItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      size="small"
                      label="Search Student by Name, Email, or Student Number (Optional)"
                      value={studentQuery}
                      onChange={(e) => handleLookupFinderStudent(e.target.value)}
                      sx={{ bgcolor: '#ffffff', borderRadius: '8px' }}
                    />
                    {studentMatches.length > 0 && (
                      <TextField
                        select
                        size="small"
                        label="Select Matched Student"
                        value={form.finder_user}
                        onChange={(e) => setForm((p) => ({ ...p, finder_user: e.target.value }))}
                        sx={{ bgcolor: '#ffffff', borderRadius: '8px' }}
                      >
                        <MenuItem value="">None (Walk-in Guest / Staff)</MenuItem>
                        {studentMatches.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.last_name}, {s.first_name} ({s.student_number})
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    {!form.finder_user && (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Walk-In Finder Name"
                          value={form.finder_name}
                          onChange={(e) => setForm((p) => ({ ...p, finder_name: e.target.value }))}
                          sx={{ bgcolor: '#ffffff', borderRadius: '8px' }}
                        />
                        <TextField
                          size="small"
                          fullWidth
                          label="Finder Contact"
                          value={form.finder_contact}
                          onChange={(e) => setForm((p) => ({ ...p, finder_contact: e.target.value }))}
                          sx={{ bgcolor: '#ffffff', borderRadius: '8px' }}
                        />
                      </Stack>
                    )}
                  </Stack>
                </Box>

                <Stack spacing={2}>
                  <MultiPhotoUploader
                    files={publicPhotos}
                    onChange={setPublicPhotos}
                    maxFiles={4}
                    label="Public Photo Evidence (Optional)"
                    helperText="Upload up to 4 clear photos shown in the public catalog. First photo is the primary thumbnail."
                  />
                  <MultiPhotoUploader
                    files={secretPhotos}
                    onChange={setSecretPhotos}
                    maxFiles={1}
                    label="Confidential Serial / Mark Photo (OSAS Admin Only — Optional)"
                    helperText="Private verification photo stored for OSAS staff only. Never displayed publicly."
                  />
                </Stack>
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
                  OSAS Custody Intake Summary
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, color: '#ffffff' }}>
                  {form.title}
                </Typography>

                <Stack spacing={1} sx={{ mt: 1.75 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Category:</strong> {selectedCategoryName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Found:</strong> {selectedLocationLabel} on {form.date_found}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Storage Vault / Bin:</strong> {form.storage_shelf_bin || 'Unassigned'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Department Credit:</strong> {form.finder_department || 'None (Staff / Non-Student)'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <strong>Public Description:</strong> {form.general_description}
                  </Typography>
                  {form.secret_identifiers && (
                    <Typography variant="body2" sx={{ color: '#ffb07c' }}>
                      <strong>Confidential Marks (Staff Only):</strong> {form.secret_identifiers}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </M3StepWizard>
        )}
      </DialogContent>
    </Dialog>
  );
}
