import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveIcon from '@mui/icons-material/Save';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import {
  M3SegmentedList,
  M3SegmentedListItem,
} from '../../../../shared/components/data-display/M3SegmentedList.jsx';
import StatusBadge from '../../../../shared/components/data-display/StatusBadge.jsx';
import {
  useCategories,
  useDeleteCategory,
  useDeleteLocation,
  useLocations,
  usePortalConfig,
  useSaveCategory,
  useSaveLocation,
  useUpdateCategory,
  useUpdateLocation,
  useUpdatePortalConfig,
} from '../../api/lostFoundApi.js';
import CategoryFormDialog from '../../components/CategoryFormDialog.jsx';
import LocationFormDialog from '../../components/LocationFormDialog.jsx';
import ConfirmActionDialog from '../../components/ConfirmActionDialog.jsx';

function extractApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.name) && data.name[0]) return data.name[0];
  if (typeof data.name === 'string') return data.name;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    if (Array.isArray(val) && val[0]) return String(val[0]);
    if (typeof val === 'string') return val;
  }
  return fallback;
}

export default function AdminSettingsPage() {
  const { data: config } = usePortalConfig();
  const { data: categories = [] } = useCategories();
  const { data: locations = [] } = useLocations();
  const updateConfig = useUpdatePortalConfig();
  const saveCategory = useSaveCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const saveLocation = useSaveLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [cfgDraft, setCfgDraft] = useState({});
  const [savedNotice, setSavedNotice] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryDialogState, setCategoryDialogState] = useState({
    open: false,
    category: null,
  });
  const [categoryFormError, setCategoryFormError] = useState('');
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);

  const [locationError, setLocationError] = useState('');
  const [locationDialogState, setLocationDialogState] = useState({
    open: false,
    location: null,
  });
  const [locationFormError, setLocationFormError] = useState('');
  const [deleteLocationTarget, setDeleteLocationTarget] = useState(null);

  const cfgForm = useMemo(
    () => ({
      office_name: cfgDraft.office_name ?? config?.office_name ?? '',
      office_location: cfgDraft.office_location ?? config?.office_location ?? '',
      office_hours: cfgDraft.office_hours ?? config?.office_hours ?? '',
      default_retention_days: cfgDraft.default_retention_days ?? config?.default_retention_days ?? 90,
    }),
    [cfgDraft, config]
  );

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    await updateConfig.mutateAsync(cfgForm);
    setCfgDraft({});
    setSavedNotice('Portal configuration saved.');
  };

  const openAddCategoryDialog = () => {
    setCategoryFormError('');
    setCategoryError('');
    setCategoryDialogState({ open: true, category: null });
  };

  const openEditCategoryDialog = (category) => {
    setCategoryFormError('');
    setCategoryError('');
    setCategoryDialogState({ open: true, category });
  };

  const closeCategoryDialog = () => {
    setCategoryDialogState({ open: false, category: null });
    setCategoryFormError('');
  };

  const handleSubmitCategory = async (payload) => {
    setCategoryFormError('');
    setCategoryError('');
    try {
      if (categoryDialogState.category) {
        await updateCategory.mutateAsync({
          id: categoryDialogState.category.id,
          payload,
        });
        setSavedNotice(`Category "${payload.name}" updated.`);
      } else {
        await saveCategory.mutateAsync(payload);
        setSavedNotice(`Category "${payload.name}" created.`);
      }
      closeCategoryDialog();
    } catch (err) {
      setCategoryFormError(
        extractApiError(err, 'Unable to save category. Please check your input.')
      );
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setCategoryError('');
    try {
      await deleteCategory.mutateAsync(deleteCategoryTarget.id);
      setSavedNotice(`Category "${deleteCategoryTarget.name}" deleted.`);
      setDeleteCategoryTarget(null);
    } catch (err) {
      setDeleteCategoryTarget(null);
      setCategoryError(
        extractApiError(
          err,
          'Unable to delete category. It may still be referenced by existing items.'
        )
      );
    }
  };

  const openAddLocationDialog = () => {
    setLocationFormError('');
    setLocationError('');
    setLocationDialogState({ open: true, location: null });
  };

  const openEditLocationDialog = (loc) => {
    setLocationFormError('');
    setLocationError('');
    setLocationDialogState({ open: true, location: loc });
  };

  const closeLocationDialog = () => {
    setLocationDialogState({ open: false, location: null });
    setLocationFormError('');
  };

  const handleSubmitLocation = async (payload) => {
    setLocationFormError('');
    setLocationError('');
    try {
      const label = payload.floor_room
        ? `${payload.building_name} — ${payload.floor_room}`
        : payload.building_name;
      if (locationDialogState.location) {
        await updateLocation.mutateAsync({
          id: locationDialogState.location.id,
          payload,
        });
        setSavedNotice(`Location "${label}" updated.`);
      } else {
        await saveLocation.mutateAsync(payload);
        setSavedNotice(`Location "${label}" created.`);
      }
      closeLocationDialog();
    } catch (err) {
      setLocationFormError(
        extractApiError(err, 'Unable to save location. Please check your input.')
      );
    }
  };

  const handleConfirmDeleteLocation = async () => {
    if (!deleteLocationTarget) return;
    setLocationError('');
    try {
      await deleteLocation.mutateAsync(deleteLocationTarget.id);
      setSavedNotice(`Location "${deleteLocationTarget.label}" deleted.`);
      setDeleteLocationTarget(null);
    } catch (err) {
      setDeleteLocationTarget(null);
      setLocationError(
        extractApiError(
          err,
          'Unable to delete location. It may still be referenced by existing items.'
        )
      );
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          OSAS Configuration Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure office hours, custody retention policy, and item categories.
        </Typography>
      </Box>

      {savedNotice && (
        <Alert severity="success" onClose={() => setSavedNotice('')} sx={{ borderRadius: '14px' }}>
          {savedNotice}
        </Alert>
      )}

      <SectionSurface>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
          Office &amp; Custody Policy
        </Typography>
        <Stack spacing={2} component="form" onSubmit={handleSaveConfig}>
          <TextField
            label="Custodian Office Name"
            value={cfgForm.office_name}
            onChange={(e) => setCfgDraft((p) => ({ ...p, office_name: e.target.value }))}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Office Location"
              value={cfgForm.office_location}
              onChange={(e) => setCfgDraft((p) => ({ ...p, office_location: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Office Hours"
              value={cfgForm.office_hours}
              onChange={(e) => setCfgDraft((p) => ({ ...p, office_hours: e.target.value }))}
            />
          </Stack>
          <TextField
            type="number"
            label="Default Retention Days"
            sx={{ maxWidth: { sm: 260 } }}
            value={cfgForm.default_retention_days}
            onChange={(e) => setCfgDraft((p) => ({ ...p, default_retention_days: Number(e.target.value) }))}
          />
          <Box>
            <M3PillButton
              type="submit"
              variant="filled"
              loading={updateConfig.isPending}
              icon={<SaveIcon fontSize="small" />}
            >
              Save Settings
            </M3PillButton>
          </Box>
        </Stack>
      </SectionSurface>

      <SectionSurface>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            mb: 1.75,
            flexWrap: 'wrap',
          }}
        >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Item Categories
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Create, edit retention rules, toggle visibility, or remove unused categories.
              </Typography>
            </Box>
            <M3PillButton
              variant="tonal"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: '18px !important' }} />}
              onClick={openAddCategoryDialog}
            >
              Add Category
            </M3PillButton>
          </Box>

          {categoryError && (
            <Alert
              severity="warning"
              onClose={() => setCategoryError('')}
              sx={{ mb: 1.75, borderRadius: '14px' }}
            >
              {categoryError}
            </Alert>
          )}

          {categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No item categories configured yet.
            </Typography>
          ) : (
            <M3SegmentedList
              gap="4px"
              containerShape="18px"
              itemShape="8px"
              itemContainerColor={(theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff'
              }
            >
              {categories.map((cat) => {
                const linkedCount = (cat.items_count || 0) + (cat.lost_reports_count || 0);
                return (
                  <M3SegmentedListItem key={cat.id}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        minWidth: 0,
                        py: 0.75,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={750}
                          noWrap
                          title={cat.name}
                          sx={{ lineHeight: 1.3 }}
                        >
                          {cat.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.4 }}>
                          <StatusBadge
                            status={cat.is_active ? 'ACTIVE' : 'INACTIVE'}
                            label={cat.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.68rem' }}
                          />
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {cat.retention_days}d retention •{' '}
                            {cat.requires_secret_verification ? 'Secret check' : 'Standard'} •{' '}
                            {cat.items_count ?? 0} {cat.items_count === 1 ? 'item' : 'items'}
                          </Typography>
                        </Box>
                      </Box>

                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                        <Tooltip title="Edit Category">
                          <IconButton
                            size="small"
                            aria-label={`Edit ${cat.name}`}
                            onClick={() => openEditCategoryDialog(cat)}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            linkedCount > 0
                              ? `In use by ${linkedCount} record(s) — deactivate via Edit instead`
                              : 'Delete Category'
                          }
                        >
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Delete ${cat.name}`}
                            onClick={() => setDeleteCategoryTarget(cat)}
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </M3SegmentedListItem>
                );
              })}
            </M3SegmentedList>
          )}
      </SectionSurface>

      <SectionSurface>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            mb: 1.75,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Found &amp; Campus Locations
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add buildings or rooms, toggle drop-off stations, or remove unused campus places.
            </Typography>
          </Box>
          <M3PillButton
            variant="tonal"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: '18px !important' }} />}
            onClick={openAddLocationDialog}
          >
            Add Location
          </M3PillButton>
        </Box>

        {locationError && (
          <Alert
            severity="warning"
            onClose={() => setLocationError('')}
            sx={{ mb: 1.75, borderRadius: '14px' }}
          >
            {locationError}
          </Alert>
        )}

        {locations.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No campus locations configured yet.
          </Typography>
        ) : (
          <M3SegmentedList
            gap="4px"
            containerShape="18px"
            itemShape="8px"
            itemContainerColor="#ffffff"
          >
            {locations.map((loc) => {
              const linkedCount = (loc.items_count || 0) + (loc.lost_reports_count || 0);
              return (
                <M3SegmentedListItem key={loc.id}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      alignItems: 'center',
                      gap: 1.25,
                      width: '100%',
                      minWidth: 0,
                      py: 0.75,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={750}
                        noWrap
                        title={loc.label}
                        sx={{ lineHeight: 1.3 }}
                      >
                        {loc.label}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.4 }}>
                        <StatusBadge
                          status={loc.is_active ? 'ACTIVE' : 'INACTIVE'}
                          label={loc.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{ height: 20, fontSize: '0.68rem' }}
                        />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {loc.is_drop_off_point ? 'QR Drop-Off' : 'General Area'} •{' '}
                          {loc.items_count ?? 0} {loc.items_count === 1 ? 'item' : 'items'}
                        </Typography>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Tooltip title="Edit Location">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${loc.label}`}
                          onClick={() => openEditLocationDialog(loc)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          linkedCount > 0
                            ? `In use by ${linkedCount} record(s) — deactivate via Edit instead`
                            : 'Delete Location'
                        }
                      >
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete ${loc.label}`}
                          onClick={() => setDeleteLocationTarget(loc)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </M3SegmentedListItem>
              );
            })}
          </M3SegmentedList>
        )}
      </SectionSurface>

      <CategoryFormDialog
        key={categoryDialogState.category?.id || (categoryDialogState.open ? 'new' : 'closed')}
        open={categoryDialogState.open}
        category={categoryDialogState.category}
        loading={saveCategory.isPending || updateCategory.isPending}
        errorMessage={categoryFormError}
        onClose={closeCategoryDialog}
        onSubmit={handleSubmitCategory}
      />

      <LocationFormDialog
        key={locationDialogState.location?.id || (locationDialogState.open ? 'new-loc' : 'closed-loc')}
        open={locationDialogState.open}
        location={locationDialogState.location}
        loading={saveLocation.isPending || updateLocation.isPending}
        errorMessage={locationFormError}
        onClose={closeLocationDialog}
        onSubmit={handleSubmitLocation}
      />

      <ConfirmActionDialog
        open={Boolean(deleteCategoryTarget)}
        title="Delete Item Category"
        reference={deleteCategoryTarget?.name}
        message={`Permanently delete "${deleteCategoryTarget?.name}"? Categories linked to existing found items or lost reports cannot be deleted and should be set to Inactive instead.`}
        confirmLabel="Delete Category"
        loading={deleteCategory.isPending}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={handleConfirmDeleteCategory}
      />

      <ConfirmActionDialog
        open={Boolean(deleteLocationTarget)}
        title="Delete Campus Location"
        reference={deleteLocationTarget?.label}
        message={`Permanently delete "${deleteLocationTarget?.label}"? Locations linked to existing found items or lost reports cannot be deleted and should be set to Inactive instead.`}
        confirmLabel="Delete Location"
        loading={deleteLocation.isPending}
        onClose={() => setDeleteLocationTarget(null)}
        onConfirm={handleConfirmDeleteLocation}
      />
    </Stack>
  );
}
