import React, { useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography, useTheme } from '@mui/material';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import StatusBadge from '../../../shared/components/data-display/StatusBadge.jsx';
import FilterPillsBar from '../../../shared/components/filters/FilterPillsBar.jsx';

/**
 * Reusable Student Activity Records view (Claimed Items, Returned/Surrendered Items,
 * and Lost Reports) shared between the Student "My Records" page and the OSAS Admin
 * Student Accounts detail panel.
 */
export default function StudentActivityRecordsView({
  records,
  loading = false,
  compact = false,
  onSelectItem,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState('CLAIMED');

  const claimedItems = useMemo(() => records?.claimed_items || [], [records]);
  const returnedItems = useMemo(() => records?.returned_items || [], [records]);
  const lostReports = useMemo(() => records?.lost_reports || [], [records]);

  const tabItems = useMemo(
    () => [
      { key: 'CLAIMED', label: `Claimed (${claimedItems.length})` },
      { key: 'RETURNED', label: `Returned (${returnedItems.length})` },
      { key: 'LOST', label: `Lost Reports (${lostReports.length})` },
    ],
    [claimedItems.length, returnedItems.length, lostReports.length]
  );

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : compact ? '#f0f4f9' : 'background.default';

  if (loading) {
    return (
      <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  return (
    <Stack spacing={compact ? 1.5 : 2}>
      <FilterPillsBar items={tabItems} selected={activeTab} onSelect={setActiveTab} />

      {activeTab === 'CLAIMED' && (
        claimedItems.length === 0 ? (
          <Box sx={{ py: compact ? 3 : 5, textAlign: 'center', color: 'text.secondary' }}>
            <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 34, opacity: 0.4, mb: 0.75 }} />
            <Typography variant="body2">No claimed item records yet.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {claimedItems.map((entry) => (
              <Box
                key={entry.id}
                onClick={onSelectItem ? () => onSelectItem(entry.found_item_id) : undefined}
                sx={{
                  p: compact ? 1.5 : 2,
                  borderRadius: '16px',
                  bgcolor: cardBg,
                  cursor: onSelectItem ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                  '&:hover': onSelectItem
                    ? { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#e8eff5' }
                    : undefined,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.25 }}>
                      {entry.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {entry.tracking_code} • {entry.category_name} • {entry.location_label}
                    </Typography>
                  </Box>
                  <StatusBadge
                    status={entry.is_voided ? 'DISPOSED' : 'CLAIMED'}
                    label={entry.is_voided ? 'Reversed' : 'Claimed'}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Released {new Date(entry.claim_date).toLocaleString()} • Verified by {entry.verified_by_name}
                </Typography>

                {entry.is_voided && entry.void_reason && (
                  <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.4, fontWeight: 600 }}>
                    Reversal reason: {entry.void_reason}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )
      )}

      {activeTab === 'RETURNED' && (
        returnedItems.length === 0 ? (
          <Box sx={{ py: compact ? 3 : 5, textAlign: 'center', color: 'text.secondary' }}>
            <VolunteerActivismOutlinedIcon sx={{ fontSize: 34, opacity: 0.4, mb: 0.75 }} />
            <Typography variant="body2">No surrendered / returned item records yet.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {returnedItems.map((entry) => (
              <Box
                key={entry.id}
                onClick={onSelectItem ? () => onSelectItem(entry.id) : undefined}
                sx={{
                  p: compact ? 1.5 : 2,
                  borderRadius: '16px',
                  bgcolor: cardBg,
                  cursor: onSelectItem ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                  '&:hover': onSelectItem
                    ? { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#e8eff5' }
                    : undefined,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.25 }}>
                      {entry.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {entry.tracking_code} • {entry.category_name} • {entry.location_label}
                    </Typography>
                  </Box>
                  <StatusBadge status={entry.custody_status} label={entry.custody_status_label} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    Found {entry.date_found}
                  </Typography>
                  {entry.finder_department && (
                    <Chip
                      size="small"
                      label={`${entry.finder_department} Credited`}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        )
      )}

      {activeTab === 'LOST' && (
        lostReports.length === 0 ? (
          <Box sx={{ py: compact ? 3 : 5, textAlign: 'center', color: 'text.secondary' }}>
            <HistoryOutlinedIcon sx={{ fontSize: 34, opacity: 0.4, mb: 0.75 }} />
            <Typography variant="body2">No lost item reports filed yet.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {lostReports.map((rep) => (
              <Box
                key={rep.id}
                sx={{
                  p: compact ? 1.5 : 2,
                  borderRadius: '16px',
                  bgcolor: cardBg,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.25 }}>
                      {rep.item_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {rep.category_name} • Lost {rep.date_lost} at {rep.location_label}
                    </Typography>
                  </Box>
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
                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )
      )}
    </Stack>
  );
}
