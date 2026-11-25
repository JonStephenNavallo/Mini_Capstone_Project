import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import UndoIcon from '@mui/icons-material/Undo';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ViewListIcon from '@mui/icons-material/ViewList';
import { M3eButton } from '@m3e/react/button';
import { M3eButtonGroup } from '@m3e/react/button-group';
import { M3eIconButton } from '@m3e/react/icon-button';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import CompactPagination from '../../../../shared/components/data-display/CompactPagination.jsx';
import DataTable from '../../../../shared/components/data-display/DataTable.jsx';
import M3MediaCard from '../../../../shared/components/data-display/M3MediaCard.jsx';
import {
  M3SegmentedList,
  M3SegmentedListItem,
} from '../../../../shared/components/data-display/M3SegmentedList.jsx';
import StatusBadge from '../../../../shared/components/data-display/StatusBadge.jsx';
import M3DateRangeFilter from '../../../../shared/components/filters/M3DateRangeFilter.jsx';
import PageSubheader from '../../../../shared/components/navigation/PageSubheader.jsx';
import UniversalBottomSheet from '../../../../shared/components/overlays/UniversalBottomSheet.jsx';
import { primarySelectedControlSx } from '../../../../shared/theme/controlStyles.js';
import {
  useBreadcrumbs,
  useHeaderSearch,
} from '../../../../shared/utils/breadcrumbContextValue.js';
import AdminItemDetailPanel from '../../components/AdminItemDetailPanel.jsx';
import ConfirmActionDialog from '../../components/ConfirmActionDialog.jsx';
import EditFoundItemDialog from '../../components/EditFoundItemDialog.jsx';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';
import { STATUS_CHIP_STYLES } from '../../constants/statusStyles.js';
import {
  ITEM_STATUS_OPTIONS,
  useAdminItemsDirectory,
} from '../../hooks/useAdminItemsDirectory.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';

/**
 * Renders the M3 Expressive StatusBadge with an audit hover tooltip
 * mirroring the reference StudentDirectory status column pattern.
 */
const renderStatusCell = (row) => {
  const badge = STATUS_CHIP_STYLES[row.custody_status] || {
    label: row.custody_status,
  };

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography
            variant="caption"
            display="block"
            sx={{
              fontWeight: 600,
              mb: 0.5,
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              pb: 0.5,
            }}
          >
            Custody Audit Summary
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
            <strong>Tracking:</strong> {row.tracking_code || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
            <strong>Found On:</strong> {row.date_found || 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
            <strong>Shelf / Bin:</strong> {row.storage_shelf_bin || 'Unassigned'}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            <strong>Surrendered By:</strong> {row.finder_display || 'Anonymous'}
          </Typography>
        </Box>
      }
      arrow
      placement="top-start"
    >
      <Box component="span" sx={{ display: 'inline-flex', cursor: 'help' }}>
        <StatusBadge status={row.custody_status} label={badge.label} size="small" />
      </Box>
    </Tooltip>
  );
};

export default function AdminItemsDirectoryPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const openQrPrint = useLostFoundUiStore((s) => s.openQrPrint);
  const openWalkInIntake = useLostFoundUiStore((s) => s.openWalkInIntake);
  const { setRightPanelContent, setRightPanelExpanded } = useBreadcrumbs();

  const {
    viewMode,
    search,
    statusFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
    items,
    totalCount,
    categories,
    locations,
    loading,
    selectedItem,
    activeFiltersCount,
    updateParams,
    handleRowClick,
    handleClosePanel,
    approveTarget,
    shelfBin,
    setShelfBin,
    secretNote,
    setSecretNote,
    openApproveDialog,
    closeApproveDialog,
    handleConfirmApprove,
    isApproving,
    deleteTarget,
    setDeleteTarget,
    handleConfirmDelete,
    isDeleting,
    editTarget,
    editError,
    openEditDialog,
    closeEditDialog,
    handleConfirmEdit,
    isUpdatingItem,
    voidTarget,
    voidReason,
    setVoidReason,
    openVoidDialog,
    closeVoidDialog,
    handleConfirmVoidClaim,
    isVoidingClaim,
  } = useAdminItemsDirectory();

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [tempCategory, setTempCategory] = useState('');
  const [tempStatus, setTempStatus] = useState('');
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');

  // Connect local search query to the Google Workspace Topbar searchbar
  const handleSearchChange = useCallback(
    (val) => updateParams({ search: val, page: null }, true),
    [updateParams]
  );

  useHeaderSearch({
    value: search,
    onChange: handleSearchChange,
    placeholder: 'Search tracking code, item title, or shelf bin…',
    visible: true,
  });

  const handleProcessClaim = useCallback(
    (item) => {
      if (!item) return;
      navigate(`/admin/claim?code=${encodeURIComponent(item.tracking_code)}`);
    },
    [navigate]
  );

  const handlePrintQr = useCallback(
    (item) => {
      if (!item) return;
      openQrPrint({
        title: 'OSAS Custody Tag',
        subtitle: item.title,
        code: item.tracking_code,
        hint: item.storage_shelf_bin || 'OSAS Vault',
      });
    },
    [openQrPrint]
  );

  // Store panel action callbacks in a ref so route/searchParam transitions never cause effect loops
  const panelHandlersRef = useRef({
    handleClosePanel,
    openApproveDialog,
    openEditDialog,
    handleProcessClaim,
    openVoidDialog,
    handlePrintQr,
    setDeleteTarget,
  });
  useEffect(() => {
    panelHandlersRef.current = {
      handleClosePanel,
      openApproveDialog,
      openEditDialog,
      handleProcessClaim,
      openVoidDialog,
      handlePrintQr,
      setDeleteTarget,
    };
  }, [handleClosePanel, openApproveDialog, openEditDialog, handleProcessClaim, openVoidDialog, handlePrintQr, setDeleteTarget]);

  // Sync selected item into Desktop Right Split Panel (guarded against Maximum update depth loops)
  useEffect(() => {
    if (selectedItem && !isMobile) {
      setRightPanelContent(
        <AdminItemDetailPanel
          item={selectedItem}
          onClose={() => panelHandlersRef.current.handleClosePanel()}
          onApprove={(it) => panelHandlersRef.current.openApproveDialog(it)}
          onEdit={(it) => panelHandlersRef.current.openEditDialog(it)}
          onProcessClaim={(it) => panelHandlersRef.current.handleProcessClaim(it)}
          onVoidClaim={(it) => panelHandlersRef.current.openVoidDialog(it)}
          onPrintQr={(it) => panelHandlersRef.current.handlePrintQr(it)}
          onDelete={(it) => panelHandlersRef.current.setDeleteTarget(it)}
        />
      );
      setRightPanelExpanded((prev) => (prev ? false : prev));
    } else {
      setRightPanelContent((prev) => (prev === null ? prev : null));
      setRightPanelExpanded((prev) => (prev ? false : prev));
    }
  }, [selectedItem, isMobile, setRightPanelContent, setRightPanelExpanded]);

  // Unmount-only cleanup so navigating away via the sidebar always clears the right panel cleanly
  useEffect(
    () => () => {
      setRightPanelContent((prev) => (prev === null ? prev : null));
      setRightPanelExpanded((prev) => (prev ? false : prev));
    },
    [setRightPanelContent, setRightPanelExpanded]
  );

  // Memoized column definitions for Desktop DataTable
  const tableColumns = useMemo(
    () => [
      {
        field: 'tracking_code',
        headerName: 'Tracking',
        width: 130,
        cellSx: { fontWeight: 700, whiteSpace: 'nowrap' },
      },
      {
        field: 'title',
        headerName: 'Item',
        width: 220,
        renderCell: (row) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {row.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {row.location_label || 'Campus Grounds'} • {row.date_found || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'category_name',
        headerName: 'Category',
        width: 130,
      },
      {
        field: 'storage_shelf_bin',
        headerName: 'Shelf / Bin',
        width: 120,
        renderCell: (row) => row.storage_shelf_bin || '—',
      },
      {
        field: 'custody_status',
        headerName: 'Status',
        width: 150,
        renderCell: (row) => renderStatusCell(row),
      },
      {
        field: '_actions',
        headerName: 'Actions',
        align: 'right',
        width: 140,
        sortable: false,
        renderCell: (row) => (
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            onClick={(e) => e.stopPropagation()}
          >
            {row.custody_status === 'PENDING_SURRENDER' && (
              <Tooltip title="Approve Physical Intake">
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => openApproveDialog(row)}
                >
                  <CheckCircleOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {row.custody_status === 'IN_CUSTODY' && (
              <Tooltip title="Process Walk-In Claim">
                <IconButton
                  color="success"
                  size="small"
                  onClick={() => handleProcessClaim(row)}
                >
                  <VerifiedUserIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {row.custody_status !== 'CLAIMED' && (
              <Tooltip title="Edit Item">
                <IconButton size="small" onClick={() => openEditDialog(row)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {row.custody_status === 'IN_CUSTODY' && (
              <Tooltip title="Print QR Tag">
                <IconButton size="small" onClick={() => handlePrintQr(row)}>
                  <QrCode2Icon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {['PENDING_SURRENDER', 'IN_CUSTODY'].includes(row.custody_status) &&
              !(row.claim_history?.length > 0) && (
                <Tooltip title="Delete Item">
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => setDeleteTarget(row)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
          </Stack>
        ),
      },
    ],
    [openApproveDialog, openEditDialog, handleProcessClaim, handlePrintQr, setDeleteTarget]
  );

  // Reusable List-to-Grid Toggle Control matching StudentDirectory.jsx exactly
  const viewModeToggle = (
    <Box
      sx={{
        display: 'flex',
        gap: '2px',
        borderRadius: '24px',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Tooltip title="All Items (Table View)">
        <ToggleButton
          value="table"
          selected={viewMode === 'table'}
          onClick={() => updateParams({ view: null, item: null })}
          aria-label="Table view"
          sx={{
            width: { xs: 50, sm: 52 },
            height: { xs: 40, sm: 38 },
            p: 0,
            borderRadius: viewMode === 'table' ? '24px !important' : '8px !important',
            bgcolor: (t) =>
              t.palette.mode === 'light' ? '#f1f3ff !important' : '#303134 !important',
            color: 'inherit',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none !important',
            '&.Mui-selected': primarySelectedControlSx,
            '&:hover': {
              bgcolor: (t) =>
                t.palette.mode === 'light'
                  ? 'rgba(0,0,0,0.06)'
                  : 'rgba(255,255,255,0.06)',
            },
          }}
        >
          <ViewListIcon sx={{ fontSize: { xs: 21, sm: 20 } }} />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Cards (Grid View)">
        <ToggleButton
          value="grid"
          selected={viewMode === 'grid'}
          onClick={() => updateParams({ view: 'grid', item: null })}
          aria-label="Grid view"
          sx={{
            width: { xs: 50, sm: 52 },
            height: { xs: 40, sm: 38 },
            p: 0,
            borderRadius: viewMode === 'grid' ? '24px !important' : '8px !important',
            bgcolor: (t) =>
              t.palette.mode === 'light' ? '#f1f3ff !important' : '#303134 !important',
            color: 'inherit',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none !important',
            '&.Mui-selected': primarySelectedControlSx,
            '&:hover': {
              bgcolor: (t) =>
                t.palette.mode === 'light'
                  ? 'rgba(0,0,0,0.06)'
                  : 'rgba(255,255,255,0.06)',
            },
          }}
        >
          <GridViewIcon sx={{ fontSize: { xs: 21, sm: 20 } }} />
        </ToggleButton>
      </Tooltip>
    </Box>
  );

  const openMobileFilters = () => {
    setTempCategory(categoryFilter);
    setTempStatus(statusFilter);
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setIsFilterSheetOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, height: '100%', overflow: 'hidden' }}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* ═══════════ DESKTOP HEADER + FILTER CONTROLS (sm+) ═══════════ */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              pb: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}
              >
                OSAS Items Directory
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {totalCount} {totalCount === 1 ? 'item' : 'items'} — approve walk-in surrenders, print shelf QR tags, or initiate claims.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexShrink: 0 }}>
              <M3PillButton
                variant="filled"
                color="accent"
                size="small"
                icon={<AddBoxIcon fontSize="small" />}
                onClick={openWalkInIntake}
              >
                Walk-In Intake
              </M3PillButton>
              {viewModeToggle}
            </Stack>
          </Box>

          {/* Compact Desktop Filter Row (matching StudentDirectory.jsx lines 355-412) */}
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: 'center',
              flexWrap: 'wrap',
              flexShrink: 0,
              pb: 2,
              pt: 1,
            }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel
                id="items-category-filter-label"
                sx={{
                  fontSize: '0.8rem',
                  transform: 'translate(14px, 6px) scale(1)',
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -4px) scale(0.75)',
                    bgcolor: 'background.default',
                    px: 0.5,
                  },
                }}
              >
                Category
              </InputLabel>
              <Select
                labelId="items-category-filter-label"
                value={categoryFilter}
                label="Category"
                onChange={(e) =>
                  updateParams({ category: e.target.value || null, page: null }, true)
                }
                sx={{ height: 32, fontSize: '0.8rem', borderRadius: '8px' }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel
                id="items-status-filter-label"
                sx={{
                  fontSize: '0.8rem',
                  transform: 'translate(14px, 6px) scale(1)',
                  '&.MuiInputLabel-shrink': {
                    transform: 'translate(14px, -4px) scale(0.75)',
                    bgcolor: 'background.default',
                    px: 0.5,
                  },
                }}
              >
                Status
              </InputLabel>
              <Select
                labelId="items-status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={(e) =>
                  updateParams({ status: e.target.value || null, page: null }, true)
                }
                sx={{ height: 32, fontSize: '0.8rem', borderRadius: '8px' }}
              >
                {ITEM_STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value || 'ALL'} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <M3DateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              label="Date Found"
              onChange={({ dateFrom: nextFrom, dateTo: nextTo }) =>
                updateParams(
                  {
                    date_from: nextFrom || null,
                    date_to: nextTo || null,
                    page: null,
                  },
                  true
                )
              }
            />

            {activeFiltersCount > 0 && (
              <M3PillButton
                size="small"
                variant="text"
                color="neutral"
                startIcon={<RestartAltIcon sx={{ fontSize: '16px !important' }} />}
                onClick={() =>
                  updateParams(
                    {
                      category: null,
                      status: null,
                      date_from: null,
                      date_to: null,
                      page: null,
                    },
                    true
                  )
                }
              >
                Clear Filters
              </M3PillButton>
            )}
          </Box>
        </Box>

        {/* ═══════════ MOBILE-ONLY SUBHEADER (xs) ═══════════ */}
        <PageSubheader
          title="Items Directory"
          subtitle={`${totalCount} ${totalCount === 1 ? 'item' : 'items'}`}
          actions={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <M3PillButton
                size="small"
                variant={activeFiltersCount > 0 ? 'filled' : 'outlined'}
                color="primary"
                startIcon={<TuneIcon sx={{ fontSize: '18px !important' }} />}
                onClick={openMobileFilters}
              >
                {activeFiltersCount > 0 ? `(${activeFiltersCount})` : 'Filter'}
              </M3PillButton>
              {viewModeToggle}
            </Box>
          }
          sx={{
            display: { xs: 'block', sm: 'none' },
            mb: 1.25,
          }}
        />

        {/* ═══════════ TABLE / LIST VIEW ═══════════ */}
        {viewMode === 'table' && (
          <>
            {/* Desktop DataTable (sm+) */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                flex: 1,
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              <DataTable
                columns={tableColumns}
                rows={items}
                loading={loading}
                emptyMessage="No items found matching your criteria."
                onRowClick={handleRowClick}
                selectedRowId={selectedItem?.id}
                selectedRowIdField="id"
                page={page}
                rowsPerPage={pageSize}
                totalCount={totalCount}
                onPageChange={(newPage) =>
                  updateParams({ page: newPage === 0 ? null : newPage })
                }
                onRowsPerPageChange={(newSize) =>
                  updateParams({ page_size: newSize, page: null })
                }
                rowsPerPageOptions={[10, 25, 50]}
              />
            </Box>

            {/* Mobile M3SegmentedList + CompactPagination (xs) */}
            <Box
              sx={{
                display: { xs: 'flex', sm: 'none' },
                flex: 1,
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: 0,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  py: 0.5,
                  scrollbarWidth: 'thin',
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : items.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      borderRadius: 3,
                      border: '1px dashed',
                      borderColor: 'divider',
                      bgcolor: 'transparent',
                      my: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      No items found matching your criteria.
                    </Typography>
                  </Paper>
                ) : (
                  <M3SegmentedList
                    gap="4px"
                    containerShape="20px"
                    itemShape="8px"
                    itemContainerColor={(t) =>
                      t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f3f4'
                    }
                  >
                    {items.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      const shelfText = item.storage_shelf_bin || 'No shelf';
                      const badge = STATUS_CHIP_STYLES[item.custody_status] || {
                        label: item.custody_status,
                      };

                      return (
                        <M3SegmentedListItem
                          key={item.id}
                          onClick={() => handleRowClick(item)}
                          selected={isSelected}
                        >
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '42px minmax(0, 1fr) 32px',
                              alignItems: 'center',
                              gap: 1.5,
                              width: '100%',
                              minWidth: 0,
                              py: 0.75,
                            }}
                          >
                            {/* Fixed 42x42 Squircle Thumbnail */}
                            <Box
                              sx={{
                                width: 42,
                                height: 42,
                                borderRadius: '12px',
                                overflow: 'hidden',
                                bgcolor: '#083344',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {(item.custody_status === 'CLAIMED' && item.public_handover_photo) || item.primary_photo ? (
                                <Box
                                  component="img"
                                  src={
                                    item.custody_status === 'CLAIMED' && item.public_handover_photo
                                      ? item.public_handover_photo
                                      : item.primary_photo
                                  }
                                  alt={item.title}
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                              ) : (
                                <Inventory2Icon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)' }} />
                              )}
                            </Box>

                            {/* Strict minmax(0, 1fr) 3-Row Content Column */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                              <Typography
                                variant="body2"
                                noWrap
                                title={item.title}
                                sx={{
                                  fontWeight: 750,
                                  fontSize: '0.88rem',
                                  color: 'text.primary',
                                  lineHeight: 1.3,
                                }}
                              >
                                {item.title}
                              </Typography>

                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.6,
                                  minWidth: 0,
                                  mt: 0.2,
                                  mb: 0.55,
                                }}
                              >
                                {item.tracking_code && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontSize: '0.73rem',
                                      color: '#0d4b6e',
                                      fontWeight: 700,
                                      lineHeight: 1.2,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {item.tracking_code}
                                  </Typography>
                                )}
                                {item.tracking_code && (
                                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.73rem', flexShrink: 0 }}>
                                    •
                                  </Typography>
                                )}
                                <Typography
                                  variant="caption"
                                  noWrap
                                  sx={{
                                    fontSize: '0.73rem',
                                    color: 'text.secondary',
                                    fontWeight: 500,
                                    lineHeight: 1.2,
                                    minWidth: 0,
                                  }}
                                >
                                  {item.category_name || 'General'}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', minWidth: 0 }}>
                                <StatusBadge
                                  status={item.custody_status}
                                  label={badge.label}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.68rem', flexShrink: 0 }}
                                />
                                <Typography
                                  variant="caption"
                                  noWrap
                                  sx={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    bgcolor: 'rgba(13, 75, 110, 0.07)',
                                    px: 0.9,
                                    py: 0.2,
                                    borderRadius: '9999px',
                                    maxWidth: '100%',
                                  }}
                                >
                                  {shelfText}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Fixed 32px Trailing Chevron */}
                            <IconButton
                              size="small"
                              aria-label="Inspect item"
                              sx={{
                                width: 32,
                                height: 32,
                                color: 'text.secondary',
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                                borderRadius: '50%',
                                p: 0,
                              }}
                            >
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </M3SegmentedListItem>
                      );
                    })}
                  </M3SegmentedList>
                )}
              </Box>

              <Box
                sx={{
                  mt: 1,
                  borderRadius: '16px',
                  bgcolor: (t) =>
                    t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8f9fa',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <CompactPagination
                  count={totalCount}
                  page={page}
                  onPageChange={(newPage) =>
                    updateParams({ page: newPage === 0 ? null : newPage })
                  }
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={(newSize) =>
                    updateParams({ page_size: newSize, page: null })
                  }
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </Box>
            </Box>
          </>
        )}

        {/* ═══════════ GRID VIEW (Desktop & Mobile) ═══════════ */}
        {viewMode === 'grid' && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <Box sx={{ flex: 1, overflowY: 'auto', pr: { xs: 0, sm: 0.5 }, pb: 1 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : items.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 5,
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '1px dashed',
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                    my: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No items found matching your criteria.
                  </Typography>
                </Paper>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(3, minmax(0, 1fr))',
                      xl: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  {items.map((item) => {
                    const badge = STATUS_CHIP_STYLES[item.custody_status] || {
                      label: item.custody_status,
                    };
                    return (
                      <M3MediaCard
                        key={item.id}
                        mediaSrc={
                          item.custody_status === 'CLAIMED' && item.public_handover_photo
                            ? item.public_handover_photo
                            : item.primary_photo
                        }
                        mediaAlt={item.title}
                        onClick={() => handleRowClick(item)}
                        topLeftBadge={
                          <StatusBadge
                            status={item.custody_status}
                            label={badge.label}
                            size="small"
                          />
                        }
                        bottomRightBadge={
                          <Chip
                            size="small"
                            label={item.tracking_code}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              bgcolor: 'rgba(255, 255, 255, 0.94)',
                              color: '#011f2f',
                            }}
                          />
                        }
                        overline={item.category_name || 'General'}
                        title={item.title}
                        description={
                          item.general_description ||
                          `Shelf / Bin: ${item.storage_shelf_bin || 'Not assigned'}`
                        }
                        metaItems={[
                          {
                            key: 'location',
                            icon: <LocationOnIcon sx={{ fontSize: 15 }} />,
                            label: item.location_label || 'Campus Grounds',
                          },
                          {
                            key: 'date',
                            icon: <CalendarTodayIcon sx={{ fontSize: 14 }} />,
                            label: `Found ${item.date_found || '—'} • ${item.storage_shelf_bin || 'No shelf'}`,
                          },
                        ]}
                        footer={
                          <Box
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              width: '100%',
                              '& m3e-button-group': {
                                width: '100%',
                                display: 'flex',
                                '--m3e-connected-button-group-spacing': '2px',
                              },
                              '& m3e-button-group > m3e-button': {
                                flex: '1 1 auto !important',
                                minWidth: 0,
                              },
                              '& m3e-button-group > m3e-icon-button': {
                                flex: '0 0 46px !important',
                                width: '46px',
                              },
                            }}
                          >
                            <M3eButtonGroup variant="connected" size="small">
                              {item.custody_status === 'PENDING_SURRENDER' && (
                                <M3eButton
                                  variant="filled"
                                  size="small"
                                  onClick={() => openApproveDialog(item)}
                                  style={{
                                    flex: 1,
                                    '--m3e-button-container-height': '38px',
                                    '--m3e-filled-button-container-color': '#f57f3b',
                                    '--m3e-filled-button-label-text-color': '#ffffff',
                                    '--m3e-filled-button-icon-color': '#ffffff',
                                    '--m3e-button-label-text-font-weight': '600',
                                    '--m3e-button-label-text-font-size': '0.82rem',
                                  }}
                                >
                                  <span slot="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <CheckCircleOutlinedIcon sx={{ fontSize: 17 }} />
                                  </span>
                                  Approve
                                </M3eButton>
                              )}
                              {item.custody_status === 'IN_CUSTODY' && (
                                <M3eButton
                                  variant="filled"
                                  size="small"
                                  onClick={() => handleProcessClaim(item)}
                                  style={{
                                    flex: 1,
                                    '--m3e-button-container-height': '38px',
                                    '--m3e-filled-button-container-color': '#f57f3b',
                                    '--m3e-filled-button-label-text-color': '#ffffff',
                                    '--m3e-filled-button-icon-color': '#ffffff',
                                    '--m3e-button-label-text-font-weight': '600',
                                    '--m3e-button-label-text-font-size': '0.82rem',
                                  }}
                                >
                                  <span slot="icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <VerifiedUserIcon sx={{ fontSize: 17 }} />
                                  </span>
                                  Claim
                                </M3eButton>
                              )}
                              {item.custody_status !== 'PENDING_SURRENDER' &&
                                item.custody_status !== 'IN_CUSTODY' && (
                                  <M3eButton
                                    variant="tonal"
                                    size="small"
                                    onClick={() => handleRowClick(item)}
                                    style={{
                                      flex: 1,
                                      '--m3e-button-container-height': '38px',
                                      '--m3e-tonal-button-container-color': 'rgba(255, 255, 255, 0.14)',
                                      '--m3e-tonal-button-label-text-color': '#ffffff',
                                      '--m3e-button-label-text-font-weight': '600',
                                      '--m3e-button-label-text-font-size': '0.82rem',
                                    }}
                                  >
                                    Inspect
                                  </M3eButton>
                                )}
                              {item.custody_status === 'IN_CUSTODY' && (
                                <M3eIconButton
                                  variant="tonal"
                                  size="small"
                                  width="narrow"
                                  title="Print QR Tag"
                                  aria-label="Print QR Tag"
                                  onClick={() => handlePrintQr(item)}
                                  style={{
                                    flex: '0 0 46px',
                                    '--m3e-icon-button-container-height': '38px',
                                    '--m3e-icon-button-icon-size': '18px',
                                    '--m3e-tonal-icon-button-container-color': 'rgba(255, 255, 255, 0.14)',
                                    '--m3e-tonal-icon-button-icon-color': '#ffffff',
                                  }}
                                >
                                  <QrCode2Icon sx={{ fontSize: 18 }} />
                                </M3eIconButton>
                              )}
                              {['PENDING_SURRENDER', 'IN_CUSTODY'].includes(item.custody_status) &&
                                !(item.claim_history?.length > 0) && (
                                  <M3eIconButton
                                    variant="tonal"
                                    size="small"
                                    width="narrow"
                                    title="Delete Item"
                                    aria-label="Delete Item"
                                    onClick={() => setDeleteTarget(item)}
                                    style={{
                                      flex: '0 0 46px',
                                      '--m3e-icon-button-container-height': '38px',
                                      '--m3e-icon-button-icon-size': '18px',
                                      '--m3e-tonal-icon-button-container-color': 'rgba(239, 68, 68, 0.24)',
                                      '--m3e-tonal-icon-button-icon-color': '#fca5a5',
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                  </M3eIconButton>
                                )}
                            </M3eButtonGroup>
                          </Box>
                        }
                      />
                    );
                  })}
                </Box>
              )}
            </Box>

            {totalCount > 0 && (
              <Box
                sx={{
                  mt: 1,
                  borderRadius: '16px',
                  bgcolor: (t) =>
                    t.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8f9fa',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <CompactPagination
                  count={totalCount}
                  page={page}
                  onPageChange={(newPage) =>
                    updateParams({ page: newPage === 0 ? null : newPage })
                  }
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={(newSize) =>
                    updateParams({ page_size: newSize, page: null })
                  }
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Mobile Filter Bottom Sheet (M3E Adaptive Height + 1-Tap Status Chips) ── */}
      <UniversalBottomSheet
        open={isFilterSheetOpen}
        onClosed={() => setIsFilterSheetOpen(false)}
        title="Filter Items"
        subtitle="Narrow directory by category, date found, or custody status"
        headerBadge={
          [tempCategory, tempStatus, tempDateFrom || tempDateTo].filter(Boolean).length > 0 ? (
            <Chip
              label={`${[tempCategory, tempStatus, tempDateFrom || tempDateTo].filter(Boolean).length} Active`}
              size="small"
              color="primary"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '9999px',
              }}
            />
          ) : null
        }
        footer={
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            <M3PillButton
              variant="outlined"
              color="neutral"
              fullWidth
              onClick={() => {
                setTempCategory('');
                setTempStatus('');
                setTempDateFrom('');
                setTempDateTo('');
              }}
            >
              Reset
            </M3PillButton>
            <M3PillButton
              variant="filled"
              color="primary"
              fullWidth
              onClick={() => {
                updateParams(
                  {
                    category: tempCategory || null,
                    status: tempStatus || null,
                    date_from: tempDateFrom || null,
                    date_to: tempDateTo || null,
                    page: null,
                  },
                  true
                );
                setIsFilterSheetOpen(false);
              }}
            >
              Apply Filters
            </M3PillButton>
          </Box>
        }
      >
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f0f4f9',
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
              Date Found Range
            </Typography>
            <M3DateRangeFilter
              variant="modal"
              fullWidth
              dateFrom={tempDateFrom}
              dateTo={tempDateTo}
              label="Select date range"
              onChange={({ dateFrom: nextFrom, dateTo: nextTo }) => {
                setTempDateFrom(nextFrom);
                setTempDateTo(nextTo);
              }}
            />
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f0f4f9',
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
              Item Category
            </Typography>
            <FormControl size="small" fullWidth>
              <InputLabel id="mobile-category-filter-label">Category</InputLabel>
              <Select
                labelId="mobile-category-filter-label"
                value={tempCategory}
                label="Category"
                onChange={(e) => setTempCategory(e.target.value)}
                sx={{ borderRadius: '10px', bgcolor: 'background.default' }}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f0f4f9',
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
              Custody Status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ITEM_STATUS_OPTIONS.map((opt) => {
                const active = tempStatus === opt.value;
                return (
                  <Chip
                    key={opt.value || 'ALL'}
                    label={opt.label}
                    clickable
                    onClick={() => setTempStatus(opt.value)}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    sx={{
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>
      </UniversalBottomSheet>

      {/* ── Mobile Item Detail Bottom Sheet ── */}
      <UniversalBottomSheet
        open={Boolean(selectedItem && isMobile)}
        onClosed={handleClosePanel}
        title={selectedItem?.title || 'Item Details'}
        subtitle={
          selectedItem
            ? `${selectedItem.tracking_code} • ${selectedItem.category_name || 'General'}`
            : ''
        }
      >
        <AdminItemDetailPanel
          item={selectedItem}
          hideHeader
          onClose={handleClosePanel}
          onApprove={openApproveDialog}
          onEdit={openEditDialog}
          onProcessClaim={handleProcessClaim}
          onVoidClaim={openVoidDialog}
          onPrintQr={handlePrintQr}
          onDelete={setDeleteTarget}
        />
      </UniversalBottomSheet>

      {/* ── Approve Custody Intake Dialog (M3E Modal Standard) ── */}
      <Dialog
        open={Boolean(approveTarget)}
        onClose={closeApproveDialog}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
        scroll="paper"
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.45)',
            },
          },
          paper: {
            elevation: 0,
            sx: {
              borderRadius: isMobile ? 0 : '28px',
              bgcolor: isDark ? '#1e1f23' : '#ffffff',
              backgroundImage: 'none',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(0, 0, 0, 0.06)',
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
                width: 40,
                height: 40,
                borderRadius: '12px',
                bgcolor: 'rgba(245, 127, 59, 0.22)',
                color: '#ffb380',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Inventory2Icon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, color: '#ffffff' }}>
                Approve Physical Intake
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
                {approveTarget?.tracking_code}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={closeApproveDialog}
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
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Confirming <strong>{approveTarget?.title}</strong> ({approveTarget?.tracking_code}) is now physically inside OSAS custody.
            </Typography>
            <TextField
              label="Assign Storage Shelf / Bin"
              placeholder="e.g., Shelf A - Bin 03"
              fullWidth
              value={shelfBin}
              onChange={(e) => setShelfBin(e.target.value)}
            />
            <TextField
              label="Confidential Secret Identifiers"
              placeholder="Hidden marks for walk-in owner verification"
              multiline
              rows={2}
              fullWidth
              value={secretNote}
              onChange={(e) => setSecretNote(e.target.value)}
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
            onClick={closeApproveDialog}
          >
            Cancel
          </M3PillButton>
          <M3PillButton
            variant="filled"
            color="primary"
            fullWidth={isMobile}
            loading={isApproving}
            onClick={handleConfirmApprove}
          >
            Approve Custody
          </M3PillButton>
        </DialogActions>
      </Dialog>

      {/* ── Reverse Mistaken Claim Dialog (M3E Modal Standard) ── */}
      <Dialog
        open={Boolean(voidTarget)}
        onClose={closeVoidDialog}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
        scroll="paper"
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.45)',
            },
          },
          paper: {
            elevation: 0,
            sx: {
              borderRadius: isMobile ? 0 : '28px',
              bgcolor: isDark ? '#1e1f23' : '#ffffff',
              backgroundImage: 'none',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(0, 0, 0, 0.06)',
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
                width: 40,
                height: 40,
                borderRadius: '12px',
                bgcolor: 'rgba(245, 158, 11, 0.22)',
                color: '#fcd34d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UndoIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, color: '#ffffff' }}>
                Reverse Mistaken Claim
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
                {voidTarget?.tracking_code}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={closeVoidDialog}
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
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Returning <strong>{voidTarget?.title}</strong> ({voidTarget?.tracking_code}) back to{' '}
              <strong>In OSAS Custody</strong>. The previous claim record will be marked as voided and preserved in the audit trail.
            </Typography>
            <TextField
              required
              multiline
              rows={3}
              fullWidth
              label="Reason for Reversal"
              placeholder="e.g., Claimant returned item after realizing it was not theirs."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
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
            onClick={closeVoidDialog}
          >
            Cancel
          </M3PillButton>
          <M3PillButton
            variant="filled"
            color="warning"
            fullWidth={isMobile}
            loading={isVoidingClaim}
            disabled={!voidReason.trim()}
            onClick={handleConfirmVoidClaim}
          >
            Return to Custody
          </M3PillButton>
        </DialogActions>
      </Dialog>

      <EditFoundItemDialog
        key={editTarget?.id || 'closed'}
        open={Boolean(editTarget)}
        item={editTarget}
        categories={categories}
        locations={locations}
        loading={isUpdatingItem}
        errorMessage={editError}
        onClose={closeEditDialog}
        onSubmit={handleConfirmEdit}
      />

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        reference={deleteTarget?.tracking_code}
        message={`Delete "${deleteTarget?.title}" from the directory?`}
        loading={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <QrTagPrintDialog />
    </Box>
  );
}
