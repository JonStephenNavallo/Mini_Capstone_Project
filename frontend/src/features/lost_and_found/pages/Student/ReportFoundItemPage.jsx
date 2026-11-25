import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { useSearchParams } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import M3DateField from '../../../../shared/components/inputs/M3DateField.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import MultiPhotoUploader from '../../../../shared/components/inputs/MultiPhotoUploader.jsx';
import { useCurrentUser } from '../../../../shared/hooks/useCurrentUser.js';
import { useCategories, useLocations, usePortalConfig, useReportFoundItem } from '../../api/lostFoundApi.js';
import { DEPARTMENT_COURSES } from '../../constants/departments.js';

export default function ReportFoundItemPage() {
  const [searchParams] = useSearchParams();
  const qrLocationSlug = searchParams.get('location') || '';
  const { data: user } = useCurrentUser();
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const { data: config } = usePortalConfig();
  const reportFound = useReportFoundItem();

  const [form, setForm] = useState({
    category: '',
    title: '',
    general_description: '',
    found_location: '',
    found_location_custom: '',
    date_found: new Date().toISOString().slice(0, 10),
    finder_department: '',
  });
  const [photos, setPhotos] = useState([]);
  const [createdItem, setCreatedItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const matchedQrLocation = useMemo(
    () => (qrLocationSlug ? locations.find((l) => l.qr_slug === qrLocationSlug) : null),
    [qrLocationSlug, locations]
  );

  const selectedLocationId = form.found_location || matchedQrLocation?.id || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCreatedItem(null);
    try {
      const fd = new FormData();
      fd.append('category', form.category);
      fd.append('title', form.title);
      fd.append('general_description', form.general_description);
      if (selectedLocationId) fd.append('found_location', selectedLocationId);
      fd.append('found_location_custom', form.found_location_custom);
      fd.append('date_found', form.date_found);
      if (form.finder_department) fd.append('finder_department', form.finder_department);
      photos.forEach((file) => fd.append('photos', file));

      const res = await reportFound.mutateAsync(fd);
      setCreatedItem(res);
      setForm({
        category: '',
        title: '',
        general_description: '',
        found_location: '',
        found_location_custom: '',
        date_found: new Date().toISOString().slice(0, 10),
        finder_department: '',
      });
      setPhotos([]);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail ||
          'Unable to submit found item report. Please try again.'
      );
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Report Someone&apos;s Found Item
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Select your department/course below — once OSAS approves physical custody intake, honesty leaderboard points are credited directly to your department!
        </Typography>
      </Box>

      {qrLocationSlug && (
        <Alert severity="info" sx={{ borderRadius: '16px' }}>
          Campus Drop-Station QR detected (<strong>{qrLocationSlug}</strong>). Location has been pre-filled.
        </Alert>
      )}

      {createdItem && (
        <Alert severity="success" sx={{ borderRadius: '16px' }}>
          <Typography variant="subtitle2" fontWeight={800}>
            Surrender Logged — Tracking Code: {createdItem.tracking_code}
          </Typography>
          <Typography variant="body2">
            Status: <strong>{createdItem.custody_status}</strong>. Please surrender the physical item at{' '}
            <strong>{config?.office_location || 'OSAS Office'}</strong> to finalize custody intake.
          </Typography>
        </Alert>
      )}

      {errorMsg && <Alert severity="error" sx={{ borderRadius: '16px' }}>{errorMsg}</Alert>}

      <SectionSurface>
        <Stack spacing={2} component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={800}>
              Found Item Details
            </Typography>
            <Chip
              size="small"
              color={user ? 'primary' : 'default'}
              label={user ? `Finder: ${user.display_name}` : 'Guest / Quick Surrender'}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              required
              fullWidth
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
              select
              fullWidth
              label="Department / Course (Optional)"
              value={form.finder_department}
              onChange={(e) => setForm((p) => ({ ...p, finder_department: e.target.value }))}
              helperText="Students: select your course for department honesty points. Guards/staff may leave as None."
            >
              <MenuItem value="">None (Guard / Staff / Visitor)</MenuItem>
              {DEPARTMENT_COURSES.map((dept) => (
                <MenuItem key={dept.value} value={dept.value}>
                  {dept.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            required
            label="Item Title"
            placeholder="e.g., Black Leather Wallet / Silver Umbrella"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />

          <TextField
            required
            multiline
            rows={3}
            label="General Description (avoid posting private ID numbers)"
            value={form.general_description}
            onChange={(e) => setForm((p) => ({ ...p, general_description: e.target.value }))}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              select
              fullWidth
              label="Found Location"
              value={selectedLocationId}
              onChange={(e) => setForm((p) => ({ ...p, found_location: e.target.value }))}
            >
              <MenuItem value="">Other Campus Area</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.label}
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

          {!selectedLocationId && (
            <TextField
              label="Specific Area / Room Description"
              placeholder="e.g., Bench outside Engineering Hall"
              value={form.found_location_custom}
              onChange={(e) => setForm((p) => ({ ...p, found_location_custom: e.target.value }))}
            />
          )}

          <MultiPhotoUploader
            files={photos}
            onChange={setPhotos}
            maxFiles={4}
            label="Photo Evidence (Optional, Max 4)"
            helperText="Add up to 4 angles of the found item. Photos are automatically compressed before upload."
          />

          <M3PillButton
            type="submit"
            variant="filled"
            loading={reportFound.isPending}
            icon={<VolunteerActivismIcon fontSize="small" />}
          >
            Submit Found Item Notice
          </M3PillButton>
        </Stack>
      </SectionSurface>
    </Stack>
  );
}
