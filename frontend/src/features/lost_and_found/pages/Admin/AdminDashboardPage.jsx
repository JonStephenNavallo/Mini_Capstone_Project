import React, { useMemo } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddBoxIcon from '@mui/icons-material/AddBox';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { BarChart, PieChart } from '@mui/x-charts';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import M3FabMenu from '../../../../shared/components/actions/M3FabMenu.jsx';
import {
  ChartLegend,
  KpiMetricCard,
  SectionSurface,
} from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import { OVERVIEW_GAP } from '../../../../shared/components/dashboard/dashboardTokens.js';
import { useAdminAnalytics, useAdminFoundItems } from '../../api/lostFoundApi.js';
import { AdminDashboardSkeleton } from '../../components/LostFoundSkeletons.jsx';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';

const CHART_PALETTE = ['#0d4b6e', '#2e7d32', '#f57f3b', '#7b1fa2', '#00838f', '#c62828'];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const openWalkInIntake = useLostFoundUiStore((s) => s.openWalkInIntake);
  const { data: analytics, isLoading } = useAdminAnalytics(true);
  const { data: pendingData } = useAdminFoundItems({ status: 'PENDING_SURRENDER', page_size: 5 });

  const pieData = useMemo(() => {
    const raw = analytics?.category_breakdown || [];
    return raw.map((item, idx) => ({
      id: idx,
      label: item.label,
      value: item.value,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
    }));
  }, [analytics]);

  const pieTotal = useMemo(() => pieData.reduce((acc, i) => acc + i.value, 0), [pieData]);
  const hotspots = analytics?.campus_hotspots || [];

  // Mobile-only M3E FAB speed-dial actions for quick OSAS counter operations
  const fabMenuItems = useMemo(
    () => [
      {
        key: 'walk-in-intake',
        label: 'Walk-In Item Intake',
        icon: <AddBoxOutlinedIcon sx={{ fontSize: 20 }} />,
        onClick: () => openWalkInIntake(),
      },
      {
        key: 'process-claim',
        label: 'Process Walk-In Claim',
        icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 20 }} />,
        onClick: () => navigate('/admin/claim'),
      },
    ],
    [navigate, openWalkInIntake]
  );

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  const kpis = analytics?.kpis || {};

  return (
    <Stack spacing={3}>
      {/* Header + Walk-In Action CTAs */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            OSAS Custody Dashboard
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <M3PillButton
            variant="filled"
            color="accent"
            icon={<AddBoxIcon fontSize="small" />}
            onClick={openWalkInIntake}
          >
            Walk-In Item Intake
          </M3PillButton>
          <M3PillButton
            variant="tonal"
            icon={<VerifiedUserIcon fontSize="small" />}
            onClick={() => navigate('/admin/claim')}
          >
            Process Walk-In Claim
          </M3PillButton>
        </Stack>
      </Box>

      {/* Compact 2x2 Mobile / 4-col Desktop KPI Matrix */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          gap: OVERVIEW_GAP,
        }}
      >
        <KpiMetricCard
          label="In Custody"
          value={kpis.in_custody ?? 0}
          caption={`${kpis.total_logged ?? 0} total logged`}
          icon={<Inventory2Icon fontSize="small" />}
          tone="primary"
        />
        <KpiMetricCard
          label="Pending Intake"
          value={kpis.pending_intake ?? 0}
          caption="Awaiting OSAS turn-in"
          icon={<HourglassEmptyIcon fontSize="small" />}
          tone="warning"
        />
        <KpiMetricCard
          label="Claimed Items"
          value={kpis.claimed_count ?? 0}
          caption="Verified in person"
          icon={<CheckCircleOutlinedIcon fontSize="small" />}
          tone="success"
        />
        <KpiMetricCard
          label="Recovery Rate"
          value={`${kpis.recovery_rate ?? 0}%`}
          caption={`${kpis.open_lost_reports ?? 0} open student reports`}
          icon={<TrendingUpIcon fontSize="small" />}
          tone="info"
          progress={Math.min(100, Number(kpis.recovery_rate ?? 0))}
        />
      </Box>

      {/* Charts Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: OVERVIEW_GAP,
        }}
      >
        <SectionSurface>
          <Typography variant="h6" fontWeight={800}>
            Items by Category
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Distribution of all logged campus property
          </Typography>

          {pieData.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
              No category data recorded yet.
            </Typography>
          ) : (
            <>
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                <PieChart
                  hideLegend
                  height={210}
                  margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  series={[
                    {
                      data: pieData,
                      innerRadius: 52,
                      outerRadius: 88,
                      paddingAngle: 2,
                      cornerRadius: 4,
                    },
                  ]}
                />
              </Box>
              <ChartLegend items={pieData} total={pieTotal} />
            </>
          )}
        </SectionSurface>

        <SectionSurface>
          <Typography variant="h6" fontWeight={800}>
            Campus Loss Hotspots
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Buildings with the highest number of found item logs
          </Typography>

          {hotspots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
              No campus location data recorded yet.
            </Typography>
          ) : (
            <Box sx={{ mt: 1.5, minWidth: 0 }}>
              <BarChart
                hideLegend
                borderRadius={14}
                height={260}
                grid={{ horizontal: true }}
                xAxis={[
                  {
                    scaleType: 'band',
                    data: hotspots.map((h) => h.building || 'Campus Grounds'),
                    categoryGapRatio: 0.42,
                    disableLine: true,
                    disableTicks: true,
                  },
                ]}
                yAxis={[
                  {
                    disableLine: true,
                    disableTicks: true,
                    tickMinStep: 1,
                  },
                ]}
                series={[
                  {
                    data: hotspots.map((h) => h.count),
                    label: 'Items Found',
                    color: '#0d4b6e',
                  },
                ]}
                sx={{
                  '& .MuiChartsGrid-line': {
                    strokeDasharray: '4 4',
                    strokeOpacity: 0.35,
                  },
                }}
              />
            </Box>
          )}
        </SectionSurface>
      </Box>

      {/* Pending Surrender Queue & Retention Radar */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: OVERVIEW_GAP,
        }}
      >
        <SectionSurface>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" fontWeight={800}>
              Pending Surrender Queue
            </Typography>
            <M3PillButton
              size="small"
              variant="text"
              onClick={() => navigate('/admin/directory?status=PENDING_SURRENDER')}
            >
              Manage all
            </M3PillButton>
          </Box>
          <Stack spacing={1}>
            {(pendingData?.results || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending student/guest drop-off notices.
              </Typography>
            ) : (
              pendingData.results.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    borderRadius: '14px',
                    bgcolor: 'background.default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {item.tracking_code} • {item.finder_display}
                    </Typography>
                  </Box>
                  <M3PillButton
                    size="small"
                    variant="tonal"
                    onClick={() => navigate('/admin/directory?status=PENDING_SURRENDER')}
                  >
                    Approve
                  </M3PillButton>
                </Box>
              ))
            )}
          </Stack>
        </SectionSurface>

        <SectionSurface>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
            Retention Aging Alerts
          </Typography>
          {(analytics?.aging_items || []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items in custody are nearing the retention disposal cutoff.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {analytics.aging_items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 1.5,
                    borderRadius: '14px',
                    bgcolor: 'background.default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.tracking_code} • Found {item.date_found}
                    </Typography>
                  </Box>
                  <Chip size="small" color="warning" label={item.storage_shelf_bin || 'In Vault'} />
                </Box>
              ))}
            </Stack>
          )}
        </SectionSurface>
      </Box>

      {/* Mobile-only M3E FAB (+) Speed-Dial for Admin Counter Actions */}
      <M3FabMenu
        items={fabMenuItems}
        triggerIcon={<AddIcon sx={{ fontSize: 28 }} />}
        ariaLabel="OSAS Admin Quick Actions"
        mobileOnly
      />
    </Stack>
  );
}
