import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Fab,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useSearchParams } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import FilterPillsBar from '../../../../shared/components/filters/FilterPillsBar.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import {
  useCloseLostReport,
  useDeleteLostReport,
  useLostReports,
  useMatchFeedback,
} from '../../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';
import ConfirmActionDialog from '../../components/ConfirmActionDialog.jsx';
import ItemDetailDialog from '../../components/ItemDetailDialog.jsx';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';
import ReportLostItemDialog from '../../components/ReportLostItemDialog.jsx';

const STATUS_FILTER_ITEMS = [
  { key: 'ALL', label: 'All Reports' },
  { key: 'ACTIVE', label: 'Active & Matched' },
  { key: 'RESOLVED', label: 'Claimed & Closed' },
];

export default function ReportLostItemPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openItemDetail = useLostFoundUiStore((s) => s.openItemDetail);

  const { data: reportsData, isLoading } = useLostReports();
  const sendFeedback = useMatchFeedback();
  const closeReport = useCloseLostReport();
  const deleteReport = useDeleteLostReport();

  const highlightId = searchParams.get('highlight') || '';
  const shouldAutoOpenModal = searchParams.get('new') === '1';

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const modalOpen = manualModalOpen || shouldAutoOpenModal;

  const handleOpenModal = useCallback(() => {
    setManualModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setManualModalOpen(false);
    if (shouldAutoOpenModal) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('new');
          return next;
        },
        { replace: true }
      );
    }
  }, [shouldAutoOpenModal, setSearchParams]);

  const allReports = useMemo(() => reportsData?.results || [], [reportsData]);

  const filteredReports = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return allReports.filter((r) => ['SEARCHING', 'POTENTIAL_MATCH'].includes(r.status));
    }
    if (statusFilter === 'RESOLVED') {
      return allReports.filter((r) => ['VERIFIED_CLAIMED', 'CLOSED'].includes(r.status));
    }
    return allReports;
  }, [allReports, statusFilter]);

  return (
    <Stack spacing={2.5} sx={{ pb: { xs: 9, sm: 2 } }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            My Lost Reports
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Track your personal lost item inquiries and inspect live OSAS custody auto-matches.
          </Typography>
        </Box>

        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}>
          <M3PillButton
            variant="filled"
            color="accent"
            icon={<ReportProblemIcon fontSize="small" />}
            onClick={handleOpenModal}
          >
            Report Lost Item
          </M3PillButton>
        </Box>
      </Box>

      {successMsg && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlinedIcon fontSize="small" />}
          onClose={() => setSuccessMsg('')}
          sx={{ borderRadius: '14px' }}
        >
          {successMsg}
        </Alert>
      )}

      {/* Filter Pills */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <FilterPillsBar
          items={STATUS_FILTER_ITEMS}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
        </Typography>
      </Box>

      {/* Reports & Auto-Matches List */}
      <SectionSurface>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Lost Reports &amp; Auto-Matches
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredReports.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {allReports.length === 0
                ? 'You have not filed any lost item reports yet'
                : 'No reports match this filter'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.25 }}>
              {allReports.length === 0
                ? 'File a personal lost item inquiry so our Auto-Matching Engine notifies you as soon as OSAS logs a matching item.'
                : 'Switch filter tabs or file a new lost item report.'}
            </Typography>
            <M3PillButton
              variant="filled"
              color="accent"
              icon={<ReportProblemIcon fontSize="small" />}
              onClick={handleOpenModal}
            >
              Report Lost Item
            </M3PillButton>
          </Box>
        ) : (
          <Stack spacing={1.75}>
            {filteredReports.map((rep) => {
              const isHighlighted = Boolean(highlightId) && String(rep.id) === String(highlightId);
              return (
                <Box
                  key={rep.id}
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    bgcolor: isHighlighted ? '#edf4ff' : 'background.default',
                    border: isHighlighted ? '2px solid' : '1px solid transparent',
                    borderColor: isHighlighted ? 'primary.main' : 'transparent',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {rep.item_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rep.category_name} • Lost {rep.date_lost} at {rep.location_label}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        size="small"
                        label={rep.status.replaceAll('_', ' ')}
                        color={
                          rep.status === 'POTENTIAL_MATCH'
                            ? 'warning'
                            : rep.status === 'VERIFIED_CLAIMED'
                              ? 'success'
                              : 'default'
                        }
                      />
                      {['SEARCHING', 'POTENTIAL_MATCH'].includes(rep.status) && (
                        <Tooltip title="I already found my item (stop match alerts)">
                          <IconButton
                            size="small"
                            color="success"
                            disabled={closeReport.isPending}
                            onClick={() => closeReport.mutate(rep.id)}
                          >
                            <CheckCircleOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete lost report">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(rep)}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>

                  {rep.match_candidates?.some((c) => c.student_feedback !== 'NOT_MY_ITEM') && (
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      <Typography variant="caption" fontWeight={800} color="primary">
                        Suggested OSAS Custody Matches:
                      </Typography>
                      {rep.match_candidates
                        .filter((cand) => cand.student_feedback !== 'NOT_MY_ITEM')
                        .map((cand) => {
                          const reasons = cand.match_reasons || {};
                          const reasonChips = [];
                          if (reasons.category > 0) reasonChips.push('Same Category');
                          if (reasons.location >= 20) reasonChips.push('Exact Location');
                          else if (reasons.location > 0) reasonChips.push('Same Area');
                          if (reasons.date_proximity >= 16) reasonChips.push('Date Close');
                          if (Array.isArray(reasons.matched_keywords) && reasons.matched_keywords.length > 0) {
                            reasonChips.push(`Keywords: ${reasons.matched_keywords.slice(0, 3).join(', ')}`);
                          }
                          return (
                            <Box
                              key={cand.id}
                              sx={{
                                p: 1.5,
                                borderRadius: '14px',
                                bgcolor: '#ffffff',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 1.25,
                                flexWrap: 'wrap',
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700}>
                                  {cand.found_item.title} ({cand.match_score}% match)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {cand.found_item.tracking_code} • {cand.found_item.location_label}
                                </Typography>
                                {reasonChips.length > 0 && (
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.6 }}>
                                    {reasonChips.map((chipLabel) => (
                                      <Chip
                                        key={chipLabel}
                                        size="small"
                                        variant="outlined"
                                        label={chipLabel}
                                        sx={{ height: 20, fontSize: '0.66rem', fontWeight: 600 }}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Stack direction="row" spacing={1}>
                                <M3PillButton
                                  size="small"
                                  variant="tonal"
                                  onClick={() => openItemDetail(cand.found_item.id)}
                                >
                                  Inspect &amp; Get QR Pass
                                </M3PillButton>
                                {cand.student_feedback === 'PENDING' && (
                                  <M3PillButton
                                    size="small"
                                    variant="outlined"
                                    color="neutral"
                                    onClick={() =>
                                      sendFeedback.mutate({ matchId: cand.id, feedback: 'NOT_MY_ITEM' })
                                    }
                                  >
                                    Not mine
                                  </M3PillButton>
                                )}
                              </Stack>
                            </Box>
                          );
                        })}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </SectionSurface>

      {/* Mobile-only FAB to open the full-screen Report Lost Item modal */}
      <Fab
        variant="extended"
        onClick={handleOpenModal}
        aria-label="Report Lost Item"
        sx={{
          display: { xs: 'inline-flex', sm: 'none' },
          position: 'fixed',
          right: 20,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          zIndex: 1200,
          borderRadius: '16px',
          bgcolor: '#f57f3b',
          color: '#ffffff',
          fontWeight: 700,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { bgcolor: '#e06c28' },
        }}
      >
        <AddIcon sx={{ mr: 0.75 }} />
        Report Lost
      </Fab>

      <ReportLostItemDialog
        open={modalOpen}
        onClose={handleCloseModal}
        onCreated={(msg) => setSuccessMsg(msg)}
      />

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        title="Delete Lost Item Report"
        reference={deleteTarget?.item_name}
        message={`Delete your lost report for "${deleteTarget?.item_name}"? You will no longer receive auto-match alerts for this item.`}
        confirmLabel="Delete Report"
        loading={deleteReport.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteReport.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <ItemDetailDialog />
      <QrTagPrintDialog />
    </Stack>
  );
}
