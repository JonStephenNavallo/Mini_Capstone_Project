import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import FindInPageOutlinedIcon from '@mui/icons-material/FindInPageOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { KpiMetricCard, SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import { useMyActivityRecords } from '../../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';
import ItemDetailDialog from '../../components/ItemDetailDialog.jsx';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';
import StudentActivityRecordsView from '../../components/StudentActivityRecordsView.jsx';

/**
 * MyRecordsPage — Student personal history of claimed items, returned/surrendered
 * found items, and filed lost item reports. Adapts KpiMetricCard, SectionSurface,
 * and FilterPillsBar for UI consistency.
 */
export default function MyRecordsPage() {
  const openItemDetail = useLostFoundUiStore((s) => s.openItemDetail);
  const { data: records, isLoading } = useMyActivityRecords(true);

  const counts = records?.counts || {
    claimed_active: 0,
    claimed_voided: 0,
    returned: 0,
    lost_reports: 0,
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          My Records
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          View your complete OSAS Lost &amp; Found history — claimed items, items you turned in, and past lost reports.
        </Typography>
      </Box>

      {/* Summary KPI Grid (MUI v9 native CSS Grid with minWidth: 0) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <KpiMetricCard
          label="Claimed Items"
          value={counts.claimed_active}
          caption={counts.claimed_voided > 0 ? `${counts.claimed_voided} reversed` : 'Verified releases at OSAS'}
          tone="success"
          icon={<AssignmentTurnedInOutlinedIcon fontSize="small" />}
        />
        <KpiMetricCard
          label="Items Turned In"
          value={counts.returned}
          caption="Found items surrendered to OSAS"
          tone="primary"
          icon={<VolunteerActivismOutlinedIcon fontSize="small" />}
        />
        <KpiMetricCard
          label="Lost Reports"
          value={counts.lost_reports}
          caption="Personal inquiries filed"
          tone="warning"
          icon={<FindInPageOutlinedIcon fontSize="small" />}
        />
      </Box>

      <SectionSurface>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HistoryOutlinedIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Activity History
          </Typography>
        </Box>

        <StudentActivityRecordsView
          records={records}
          loading={isLoading}
          onSelectItem={(itemId) => openItemDetail(itemId)}
        />
      </SectionSurface>

      <ItemDetailDialog />
      <QrTagPrintDialog />
    </Stack>
  );
}
