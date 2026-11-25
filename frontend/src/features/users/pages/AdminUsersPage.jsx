import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { useSearchParams } from 'react-router-dom';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import CompactPagination from '../../../shared/components/data-display/CompactPagination.jsx';
import DataTable from '../../../shared/components/data-display/DataTable.jsx';
import {
  M3SegmentedList,
  M3SegmentedListItem,
} from '../../../shared/components/data-display/M3SegmentedList.jsx';
import StatusBadge from '../../../shared/components/data-display/StatusBadge.jsx';
import FilterPillsBar from '../../../shared/components/filters/FilterPillsBar.jsx';
import PageSubheader from '../../../shared/components/navigation/PageSubheader.jsx';
import UniversalBottomSheet from '../../../shared/components/overlays/UniversalBottomSheet.jsx';
import {
  useBreadcrumbs,
  useHeaderSearch,
} from '../../../shared/utils/breadcrumbContextValue.js';
import ConfirmActionDialog from '../../lost_and_found/components/ConfirmActionDialog.jsx';
import StudentActivityRecordsView from '../../lost_and_found/components/StudentActivityRecordsView.jsx';
import {
  useAdminStudentRecords,
  useAdminStudents,
  useResetStudentPassword,
  useToggleStudentStatus,
} from '../api/usersApi.js';

const ACCOUNT_STATUS_FILTER_ITEMS = [
  { key: 'ALL', label: 'All Accounts' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' },
  { key: 'RESET_REQUIRED', label: 'Reset Required' },
];

function StudentAccountDetailPanel({
  student,
  onClose,
  onResetPassword,
  onToggleStatus,
  toggling,
  hideHeader = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [panelTab, setPanelTab] = useState('profile');
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const { data: records, isLoading: recordsLoading } = useAdminStudentRecords(
    student?.id,
    Boolean(student?.id) && panelTab === 'records'
  );

  if (!student) return null;

  const initial = (student.display_name || student.email || 'S').charAt(0).toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {!hideHeader && (
        <Box
          sx={{
            px: 2.25,
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Avatar
              src={student.profile_photo || undefined}
              alt={student.display_name || student.email}
              sx={{
                width: 42,
                height: 42,
                bgcolor: 'rgba(245, 127, 59, 0.16)',
                color: '#f57f3b',
                border: '2px solid #f57f3b',
                fontSize: '0.95rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {initial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                {student.display_name || student.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {student.student_number || 'No student ID'} • {student.program_year || 'Student'}
              </Typography>
            </Box>
          </Box>
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close student details"
              sx={{
                borderRadius: '9999px',
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      {/* Profile vs. Activity Records Tabs */}
      <Box sx={{ px: 2.25, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs
          value={panelTab}
          onChange={(_, v) => setPanelTab(v)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40, py: 0.75, fontWeight: 700, fontSize: '0.82rem', textTransform: 'none' },
          }}
        >
          <Tab value="profile" label="Profile" />
          <Tab value="records" label="Records" />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25 }}>
        {panelTab === 'records' ? (
          <StudentActivityRecordsView records={records} loading={recordsLoading} compact />
        ) : (
          <Stack spacing={2}>
            {/* Student Profile Photo & Identity Summary */}
            <Box
              sx={{
                p: 1.75,
                borderRadius: '18px',
                bgcolor: '#011f2f',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
              }}
            >
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                  src={student.profile_photo || undefined}
                  alt={student.display_name || student.email}
                  onClick={student.profile_photo ? () => setPhotoPreviewOpen(true) : undefined}
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: 'rgba(245, 127, 59, 0.22)',
                    color: '#ffb380',
                    border: '2px solid #f57f3b',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    cursor: student.profile_photo ? 'pointer' : 'default',
                  }}
                >
                  {initial}
                </Avatar>
                {student.profile_photo && (
                  <Tooltip title="Enlarge profile photo">
                    <IconButton
                      size="small"
                      aria-label="Enlarge profile photo"
                      onClick={() => setPhotoPreviewOpen(true)}
                      sx={{
                        position: 'absolute',
                        right: -4,
                        bottom: -4,
                        width: 24,
                        height: 24,
                        bgcolor: '#f57f3b',
                        color: '#ffffff',
                        border: '2px solid #011f2f',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#e56f2c' },
                      }}
                    >
                      <ZoomInIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ color: '#ffffff', lineHeight: 1.25 }}>
                  {student.display_name || student.email}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.74)', mt: 0.2 }}
                >
                  {student.student_number || 'No student ID'} • {student.program_year || 'Student'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.9 }}>
                  <StatusBadge
                    status={student.is_active ? 'ACTIVE' : 'DISPOSED'}
                    label={student.is_active ? 'Active' : 'Inactive'}
                  />
                  {student.needs_password_change && (
                    <StatusBadge status="PENDING" label="Password Reset Required" />
                  )}
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                p: 1.75,
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
                  mb: 0.75,
                  fontSize: '0.7rem',
                }}
              >
                Student Account Profile
              </Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2">
                  <strong>Email:</strong> {student.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Student Number:</strong> {student.student_number || '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Program &amp; Year:</strong> {student.program_year || '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Contact:</strong> {student.contact_number || '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Last Login:</strong>{' '}
                  {student.last_login ? new Date(student.last_login).toLocaleString() : 'Never'}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>

      {/* Pinned Bottom Action Footer (Desktop Right Panel & Mobile Bottom Sheet) */}
      <Box
        sx={{
          px: 2.25,
          pt: 1.5,
          pb: { xs: 'calc(env(safe-area-inset-bottom, 12px) + 12px)', sm: 2.25 },
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? '#1a1b1e' : '#f8fafd',
          flexShrink: 0,
        }}
      >
        <Stack spacing={1}>
          <M3PillButton
            variant="filled"
            color="primary"
            fullWidth
            startIcon={<LockResetIcon sx={{ fontSize: '18px !important' }} />}
            onClick={() => onResetPassword?.(student)}
          >
            Reset Student Password
          </M3PillButton>

          <M3PillButton
            variant="outlined"
            color={student.is_active ? 'error' : 'success'}
            fullWidth
            loading={toggling}
            startIcon={
              student.is_active ? (
                <BlockIcon sx={{ fontSize: '18px !important' }} />
              ) : (
                <CheckCircleOutlinedIcon sx={{ fontSize: '18px !important' }} />
              )
            }
            onClick={() => onToggleStatus?.(student)}
          >
            {student.is_active ? 'Deactivate Account' : 'Reactivate Account'}
          </M3PillButton>
        </Stack>
      </Box>

      {/* Enlarged Student Profile Photo Lightbox */}
      <Dialog
        open={Boolean(photoPreviewOpen && student.profile_photo)}
        onClose={() => setPhotoPreviewOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
            },
          },
          paper: {
            elevation: 0,
            sx: {
              borderRadius: '28px',
              bgcolor: '#011f2f',
              background: 'linear-gradient(180deg, #042a3f 0px, #042a3f 84px, #011f2f 84px, #011f2f 100%)',
              border: 'none',
              overflow: 'hidden',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.28)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.25,
            bgcolor: '#042a3f',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ color: '#ffffff', lineHeight: 1.25 }}>
              {student.display_name || student.email}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
              {student.student_number || 'Student Profile Photo'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label="Close enlarged profile photo"
            onClick={() => setPhotoPreviewOpen(false)}
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
        <DialogContent sx={{ p: '20px !important', display: 'flex', justifyContent: 'center', bgcolor: '#011f2f' }}>
          <Box
            component="img"
            src={student.profile_photo}
            alt={student.display_name || student.email}
            sx={{
              width: '100%',
              maxHeight: '65vh',
              objectFit: 'contain',
              borderRadius: '18px',
              display: 'block',
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

/**
 * AdminUsersPage — OSAS Admin Student Accounts directory with walk-in
 * one-time temporary password recovery and account activation controls.
 * Adapts the exact desktop DataTable + mobile M3SegmentedList layout from StudentDirectory.
 */
export default function AdminUsersPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const { setRightPanelContent, setRightPanelExpanded } = useBreadcrumbs();

  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = Math.max(0, Number(searchParams.get('page') || 0));
  const pageSize = Number(searchParams.get('page_size') || 10);
  const selectedIdParam = searchParams.get('student') || '';

  const [resetTarget, setResetTarget] = useState(null);
  const [issuedReset, setIssuedReset] = useState(null); // { student, temporary_password }
  const [copied, setCopied] = useState(false);

  const updateParams = useCallback(
    (updates, replace = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (val) => updateParams({ search: val, page: null }, true),
    [updateParams]
  );

  useHeaderSearch({
    value: search,
    onChange: handleSearchChange,
    placeholder: 'Search by student name, ID number, email, or program…',
    visible: true,
  });

  const queryParams = useMemo(() => {
    const p = { page: page + 1, page_size: pageSize };
    if (search.trim()) p.search = search.trim();
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [page, pageSize, search, statusFilter]);

  const { data, isLoading } = useAdminStudents(queryParams);
  const resetPassword = useResetStudentPassword();
  const toggleStatus = useToggleStudentStatus();

  const students = useMemo(() => data?.results || [], [data]);
  const totalCount = data?.count || 0;

  const selectedStudent = useMemo(() => {
    if (!selectedIdParam) return null;
    return students.find((s) => String(s.id) === String(selectedIdParam)) || null;
  }, [students, selectedIdParam]);

  const handleRowClick = useCallback(
    (student) => {
      if (!student) return;
      const isSame = String(student.id) === String(selectedIdParam);
      updateParams({ student: isSame ? null : student.id });
    },
    [selectedIdParam, updateParams]
  );

  const handleClosePanel = useCallback(() => {
    updateParams({ student: null });
  }, [updateParams]);

  const { mutateAsync: toggleStatusMutateAsync, isPending: isTogglingStatus } = toggleStatus;

  const handleToggleStatus = useCallback(
    async (student) => {
      if (!student) return;
      await toggleStatusMutateAsync({
        studentId: student.id,
        isActive: !student.is_active,
      });
    },
    [toggleStatusMutateAsync]
  );

  const handleConfirmReset = useCallback(async () => {
    if (!resetTarget) return;
    const result = await resetPassword.mutateAsync(resetTarget.id);
    setResetTarget(null);
    setCopied(false);
    setIssuedReset(result);
  }, [resetTarget, resetPassword]);

  const handleCopyTempPassword = async () => {
    if (!issuedReset?.temporary_password) return;
    try {
      await navigator.clipboard.writeText(issuedReset.temporary_password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // Store panel action callbacks in a ref so mutation/router identity churn never triggers effect loops
  const panelHandlersRef = useRef({
    handleClosePanel,
    setResetTarget,
    handleToggleStatus,
  });
  useEffect(() => {
    panelHandlersRef.current = {
      handleClosePanel,
      setResetTarget,
      handleToggleStatus,
    };
  }, [handleClosePanel, setResetTarget, handleToggleStatus]);

  useEffect(() => {
    if (selectedStudent && !isMobile) {
      setRightPanelContent(
        <StudentAccountDetailPanel
          student={selectedStudent}
          onClose={() => panelHandlersRef.current.handleClosePanel()}
          onResetPassword={(st) => panelHandlersRef.current.setResetTarget(st)}
          onToggleStatus={(st) => panelHandlersRef.current.handleToggleStatus(st)}
          toggling={isTogglingStatus}
        />
      );
      setRightPanelExpanded((prev) => (prev ? false : prev));
    } else {
      setRightPanelContent((prev) => (prev === null ? prev : null));
      setRightPanelExpanded((prev) => (prev ? false : prev));
    }
  }, [selectedStudent, isMobile, isTogglingStatus, setRightPanelContent, setRightPanelExpanded]);

  // Unmount-only cleanup when navigating away via the sidebar
  useEffect(
    () => () => {
      setRightPanelContent((prev) => (prev === null ? prev : null));
      setRightPanelExpanded((prev) => (prev ? false : prev));
    },
    [setRightPanelContent, setRightPanelExpanded]
  );

  const tableColumns = useMemo(
    () => [
      {
        field: 'student_number',
        headerName: 'Student ID',
        width: 120,
        cellSx: { fontWeight: 700, whiteSpace: 'nowrap' },
      },
      {
        field: 'display_name',
        headerName: 'Student',
        width: 220,
        renderCell: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Avatar
              src={row.profile_photo || undefined}
              alt={row.display_name || row.email}
              sx={{
                width: 32,
                height: 32,
                bgcolor: isDark ? 'rgba(138, 180, 248, 0.2)' : '#e8f0fe',
                color: isDark ? '#8ab4f8' : '#0d4b6e',
                fontSize: '0.8rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(row.display_name || row.email || 'S').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {row.display_name || row.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {row.email}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: 'program_year',
        headerName: 'Program / Year',
        width: 130,
        renderCell: (row) => row.program_year || '—',
      },
      {
        field: 'is_active',
        headerName: 'Status',
        width: 170,
        renderCell: (row) => (
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <StatusBadge
              status={row.is_active ? 'ACTIVE' : 'DISPOSED'}
              label={row.is_active ? 'Active' : 'Inactive'}
            />
            {row.needs_password_change && (
              <StatusBadge status="PENDING" label="Reset Pending" />
            )}
          </Stack>
        ),
      },
      {
        field: '_actions',
        headerName: 'Actions',
        align: 'right',
        width: 120,
        sortable: false,
        renderCell: (row) => (
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Reset Password">
              <IconButton
                color="primary"
                size="small"
                onClick={() => setResetTarget(row)}
              >
                <LockResetIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={row.is_active ? 'Deactivate Account' : 'Reactivate Account'}>
              <IconButton
                color={row.is_active ? 'error' : 'success'}
                size="small"
                disabled={toggleStatus.isPending}
                onClick={() => handleToggleStatus(row)}
              >
                {row.is_active ? (
                  <BlockIcon fontSize="small" />
                ) : (
                  <CheckCircleOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [handleToggleStatus, isDark, toggleStatus.isPending]
  );

  return (
    <Box sx={{ display: 'flex', gap: 1, height: '100%', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Desktop Header (sm+) */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', flexShrink: 0 }}>
          <Box sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Student Accounts
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {totalCount} {totalCount === 1 ? 'student' : 'students'} — issue one-time walk-in password resets or manage account access.
            </Typography>
          </Box>
        </Box>

        {/* Mobile Header (xs) */}
        <PageSubheader
          title="Student Accounts"
          subtitle={`${totalCount} ${totalCount === 1 ? 'student' : 'students'}`}
          sx={{ display: { xs: 'block', sm: 'none' }, mb: 0.75 }}
        />

        {/* Horizontal Filter Chips Bar (matching ExploreItemsPage on both desktop & mobile) */}
        <Box sx={{ flexShrink: 0, pb: { xs: 1.25, sm: 2 }, pt: { xs: 0.25, sm: 0.75 }, minWidth: 0 }}>
          <FilterPillsBar
            items={ACCOUNT_STATUS_FILTER_ITEMS}
            selected={statusFilter || 'ALL'}
            onSelect={(key) =>
              updateParams({ status: key === 'ALL' ? null : key, page: null }, true)
            }
          />
        </Box>

        {/* Desktop DataTable (sm+) */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flex: 1, flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <DataTable
            columns={tableColumns}
            rows={students}
            loading={isLoading}
            emptyMessage="No student accounts found."
            onRowClick={handleRowClick}
            selectedRowId={selectedStudent?.id}
            selectedRowIdField="id"
            page={page}
            rowsPerPage={pageSize}
            totalCount={totalCount}
            onPageChange={(newPage) => updateParams({ page: newPage === 0 ? null : newPage })}
            onRowsPerPageChange={(newSize) => updateParams({ page_size: newSize, page: null })}
            rowsPerPageOptions={[10, 25, 50]}
          />
        </Box>

        {/* Mobile M3SegmentedList (xs) */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, flex: 1, flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5, scrollbarWidth: 'thin' }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} />
              </Box>
            ) : students.length === 0 ? (
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
                  No student accounts found.
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
                {students.map((student) => {
                  const initial = (student.display_name || student.email || 'S').charAt(0).toUpperCase();
                  return (
                    <M3SegmentedListItem
                      key={student.id}
                      onClick={() => handleRowClick(student)}
                      selected={selectedStudent?.id === student.id}
                      leading={
                        <Avatar
                          src={student.profile_photo || undefined}
                          alt={student.display_name || student.email}
                          sx={{
                            width: 38,
                            height: 38,
                            bgcolor: isDark ? 'rgba(138, 180, 248, 0.2)' : '#e8f0fe',
                            color: isDark ? '#8ab4f8' : '#0d4b6e',
                            fontSize: '0.88rem',
                            fontWeight: 750,
                          }}
                        >
                          {initial}
                        </Avatar>
                      }
                      trailing={
                        <IconButton
                          size="small"
                          sx={{
                            color: 'text.secondary',
                            bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                            borderRadius: '50%',
                            p: 0.65,
                          }}
                        >
                          <ChevronRightIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, py: 0.5, pr: 0.5 }}>
                        <Typography variant="body2" fontWeight={750} noWrap sx={{ fontSize: '0.88rem' }}>
                          {student.display_name || student.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.74rem', mb: 0.4 }}>
                          {student.student_number || 'No ID'} • {student.program_year || student.email}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <StatusBadge
                            status={student.is_active ? 'ACTIVE' : 'DISPOSED'}
                            label={student.is_active ? 'Active' : 'Inactive'}
                            sx={{ height: 20, fontSize: '0.68rem' }}
                          />
                          {student.needs_password_change && (
                            <StatusBadge
                              status="PENDING"
                              label="Reset Pending"
                              sx={{ height: 20, fontSize: '0.68rem' }}
                            />
                          )}
                        </Box>
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
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8f9fa',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <CompactPagination
              count={totalCount}
              page={page}
              onPageChange={(newPage) => updateParams({ page: newPage === 0 ? null : newPage })}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(newSize) => updateParams({ page_size: newSize, page: null })}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        </Box>
      </Box>

      {/* Mobile Student Detail Sheet */}
      <UniversalBottomSheet
        open={Boolean(selectedStudent && isMobile)}
        onClosed={handleClosePanel}
        title={selectedStudent?.display_name || 'Student Account'}
        subtitle={selectedStudent ? `${selectedStudent.student_number || 'No ID'} • ${selectedStudent.email}` : ''}
      >
        <StudentAccountDetailPanel
          student={selectedStudent}
          hideHeader
          onClose={handleClosePanel}
          onResetPassword={setResetTarget}
          onToggleStatus={handleToggleStatus}
          toggling={toggleStatus.isPending}
        />
      </UniversalBottomSheet>

      {/* Confirm Password Reset Dialog */}
      <ConfirmActionDialog
        open={Boolean(resetTarget)}
        title="Reset Student Password"
        reference={resetTarget ? `${resetTarget.display_name} (${resetTarget.student_number || resetTarget.email})` : ''}
        message="Generate a one-time temporary password for this student? Their current password will be replaced immediately and they will be required to choose a new password on their next sign-in."
        confirmLabel="Generate Temporary Password"
        loading={resetPassword.isPending}
        onClose={() => setResetTarget(null)}
        onConfirm={handleConfirmReset}
      />

      {/* One-Time Temporary Password Display Dialog (M3E Modal Standard) */}
      <Dialog
        open={Boolean(issuedReset)}
        onClose={() => setIssuedReset(null)}
        fullScreen={isMobile}
        maxWidth="xs"
        fullWidth
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
              bgcolor: '#ffffff',
              background: 'linear-gradient(180deg, #042a3f 0px, #042a3f 92px, #ffffff 92px, #ffffff 100%)',
              border: 'none',
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.16)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            p: 2.5,
            bgcolor: '#042a3f',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
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
              <KeyOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, color: '#ffffff' }}>
                Temporary Password Issued
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
                {issuedReset?.student?.display_name || issuedReset?.student?.email}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setIssuedReset(null)}
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

        <DialogContent sx={{ px: 3, pt: '24px !important', pb: 2.5 }}>
          <Stack spacing={2}>
            <Alert severity="warning" sx={{ borderRadius: '14px' }}>
              This temporary password is shown <strong>once</strong>. Provide it directly to the verified student — they will be required to set a new personal password on their next login.
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f4f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  wordBreak: 'break-all',
                }}
              >
                {issuedReset?.temporary_password}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy temporary password'}>
                <IconButton onClick={handleCopyTempPassword} color={copied ? 'success' : 'primary'}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            bgcolor: isDark ? '#1a1b1e' : '#f8fafd',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'flex-end',
          }}
        >
          <M3PillButton variant="filled" color="primary" fullWidth={isMobile} onClick={() => setIssuedReset(null)}>
            Done
          </M3PillButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
