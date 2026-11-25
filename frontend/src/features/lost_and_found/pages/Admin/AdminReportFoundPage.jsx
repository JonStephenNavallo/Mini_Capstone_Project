import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import M3DateField from '../../../../shared/components/inputs/M3DateField.jsx';
import M3StepWizard from '../../../../shared/components/navigation/M3StepWizard.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import api from '../../../../services/api.js';
import {
  useAdminCreateFoundItem,
  useCategories,
  useLocations,
} from '../../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';
import { DEPARTMENT_COURSES } from '../../constants/departments.js';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';

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

export default function AdminReportFoundPage() {
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const createItem = useAdminCreateFoundItem();
  const openQrPrint = useLostFoundUiStore((s) => s.openQrPrint);

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [primaryPhoto, setPrimaryPhoto] = useState(null);
  const [secretPhoto, setSecretPhoto] = useState(null);
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

  const handleResetWizard = () => {
    setForm(INITIAL_FORM());
    setPrimaryPhoto(null);
    setSecretPhoto(null);
    setStudentQuery('');
    setStudentMatches([]);
    setCreatedItem(null);
    setErrorMsg('');
    setActiveStep(0);
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
      if (primaryPhoto) fd.append('primary_photo', primaryPhoto);
      if (secretPhoto) fd.append('secret_photo', secretPhoto);

      const res = await createItem.mutateAsync(fd);
      setCreatedItem(res);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to log item into OSAS custody.');
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 860, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Walk-In Found Item Intake
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Log surrendered property into OSAS custody in 3 steps, credit the finder&apos;s department, and print its Custody QR Tag.
        </Typography>
      </Box>

      {errorMsg && <Alert severity="error" sx={{ borderRadius: '16px' }}>{errorMsg}</Alert>}

      <SectionSurface>
        {createdItem ? (
          <Stack spacing={2.5} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
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
              <Typography variant="h5" fontWeight={800}>
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
                bgcolor: '#ffffff',
                border: '1px solid',
                borderColor: 'divider',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <QRCodeSVG value={createdItem.tracking_code} size={160} level="M" />
              <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '0.04em' }}>
                {createdItem.tracking_code}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Shelf: {createdItem.storage_shelf_bin || 'OSAS Vault'}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
              <M3PillButton variant="outlined" color="primary" onClick={handleResetWizard}>
                Log Another Item
              </M3PillButton>
            </Stack>
          </Stack>
        ) : (
          <M3StepWizard
            steps={INTAKE_WIZARD_STEPS}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            canProceed={canProceed}
            submitLabel="Log Into OSAS Custody & Generate QR Tag"
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

                {/* Department Credit for Honesty Leaderboard + Optional Finder Details */}
                <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                    Finder Department &amp; Details (Credits Department Honesty Leaderboard)
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
                    />
                    {studentMatches.length > 0 && (
                      <TextField
                        select
                        size="small"
                        label="Select Matched Student"
                        value={form.finder_user}
                        onChange={(e) => setForm((p) => ({ ...p, finder_user: e.target.value }))}
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
                        />
                        <TextField
                          size="small"
                          fullWidth
                          label="Finder Contact"
                          value={form.finder_contact}
                          onChange={(e) => setForm((p) => ({ ...p, finder_contact: e.target.value }))}
                        />
                      </Stack>
                    )}
                  </Stack>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Public Photo Evidence
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPrimaryPhoto(e.target.files?.[0] || null)}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Confidential Serial/Mark Photo (Admin Only)
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSecretPhoto(e.target.files?.[0] || null)}
                    />
                  </Box>
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
      </SectionSurface>

      <QrTagPrintDialog />
    </Stack>
  );
}
