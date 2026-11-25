import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { SectionSurface } from '../../../shared/components/dashboard/KpiMetricCard.jsx';
import { OVERVIEW_GAP, SECTION_RADIUS } from '../../../shared/components/dashboard/dashboardTokens.js';
import { CARD_COLORS } from '../../../shared/theme/themeContextValue.js';

/**
 * FoundItemCardSkeleton - Layout-matched skeleton mirroring M3MediaCard / FoundItemCard
 * (`#011f2f` card surface, `#083344` media header, overline, title, description, meta, and CTA pill).
 */
export function FoundItemCardSkeleton() {
  return (
    <Box
      sx={{
        borderRadius: '20px',
        overflow: 'hidden',
        bgcolor: CARD_COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
      }}
    >
      <Skeleton
        variant="rectangular"
        animation="wave"
        sx={{
          width: '100%',
          height: 168,
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
        }}
      />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        <Skeleton
          variant="text"
          width="38%"
          height={14}
          animation="wave"
          sx={{ bgcolor: 'rgba(245, 127, 59, 0.25)' }}
        />
        <Skeleton
          variant="text"
          width="82%"
          height={24}
          animation="wave"
          sx={{ bgcolor: 'rgba(255, 255, 255, 0.14)' }}
        />
        <Skeleton
          variant="text"
          width="95%"
          height={16}
          animation="wave"
          sx={{ bgcolor: 'rgba(255, 255, 255, 0.09)' }}
        />
        <Skeleton
          variant="text"
          width="66%"
          height={16}
          animation="wave"
          sx={{ bgcolor: 'rgba(255, 255, 255, 0.09)' }}
        />
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          <Skeleton
            variant="text"
            width="58%"
            height={14}
            animation="wave"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}
          />
          <Skeleton
            variant="text"
            width="46%"
            height={14}
            animation="wave"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}
          />
        </Stack>
        <Box sx={{ mt: 'auto', pt: 1.5 }}>
          <Skeleton
            variant="rounded"
            height={38}
            animation="wave"
            sx={{ borderRadius: '9999px', bgcolor: 'rgba(245, 127, 59, 0.28)' }}
          />
        </Box>
      </Box>
    </Box>
  );
}

/**
 * HonestyLeaderRowSkeleton - Matches the Honesty Leaders preview rows on HomeHeroPage.
 */
export function HonestyLeaderRowSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1.5,
        borderRadius: '14px',
        bgcolor: 'background.default',
        gap: 1.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
        <Skeleton variant="rounded" width={34} height={24} animation="wave" sx={{ borderRadius: '9999px', flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="44%" height={18} animation="wave" />
          <Skeleton variant="text" width="70%" height={14} animation="wave" />
        </Box>
      </Box>
      <Skeleton variant="text" width={46} height={20} animation="wave" sx={{ flexShrink: 0 }} />
    </Box>
  );
}

const KPI_SKELETON_TONES = ['#edf4f8', '#fff7eb', '#edf8f1', '#fbf3fd'];
const BAR_SKELETON_HEIGHTS = [165, 115, 138, 92, 124];

/**
 * AdminDashboardSkeleton - Full layout-matched skeleton mirroring AdminDashboardPage:
 * 2x2/4-col KPI matrix, Donut & Rounded Bar charts grid, and Pending/Retention lists.
 */
export function AdminDashboardSkeleton() {
  return (
    <Stack spacing={3}>
      {/* Header + Desktop CTA pills */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
        }}
      >
        <Skeleton variant="text" width={260} height={38} animation="wave" />
        <Stack direction="row" spacing={1.25} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Skeleton variant="rounded" width={168} height={40} animation="wave" sx={{ borderRadius: '9999px' }} />
          <Skeleton variant="rounded" width={182} height={40} animation="wave" sx={{ borderRadius: '9999px' }} />
        </Stack>
      </Box>

      {/* 2x2 Mobile / 4-col Desktop KPI Matrix */}
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
        {KPI_SKELETON_TONES.map((bg, idx) => (
          <Box
            key={bg}
            sx={{
              borderRadius: SECTION_RADIUS,
              bgcolor: bg,
              p: { xs: 1.75, sm: 2.25 },
              minHeight: { xs: 128, sm: 146 },
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              gap: 1.25,
              minWidth: 0,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="text" width="58%" height={16} animation="wave" />
              <Skeleton variant="rounded" width={36} height={36} animation="wave" sx={{ borderRadius: '12px', flexShrink: 0 }} />
            </Box>
            <Skeleton variant="text" width={idx === 3 ? '48%' : '32%'} height={36} animation="wave" sx={{ alignSelf: 'end' }} />
            <Box>
              <Skeleton
                variant="rounded"
                height={4}
                animation="wave"
                sx={{ borderRadius: 2, mb: 0.75, visibility: idx === 3 ? 'visible' : 'hidden' }}
              />
              <Skeleton variant="text" width="72%" height={14} animation="wave" />
            </Box>
          </Box>
        ))}
      </Box>

      {/* Charts Grid (Donut + Rounded Bar Chart) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: OVERVIEW_GAP,
        }}
      >
        {/* Items by Category Donut Skeleton */}
        <SectionSurface>
          <Skeleton variant="text" width="42%" height={24} animation="wave" />
          <Skeleton variant="text" width="60%" height={16} animation="wave" />
          <Box sx={{ mt: 2.5, mb: 2.5, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Box sx={{ position: 'relative', width: 176, height: 176 }}>
              <Skeleton variant="circular" width={176} height={176} animation="wave" />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 36,
                  borderRadius: '50%',
                  bgcolor: '#f0f4f9',
                }}
              />
            </Box>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={24} animation="wave" sx={{ borderRadius: '8px' }} />
            ))}
          </Box>
        </SectionSurface>

        {/* Campus Loss Hotspots Rounded Bar Chart Skeleton */}
        <SectionSurface>
          <Skeleton variant="text" width="46%" height={24} animation="wave" />
          <Skeleton variant="text" width="66%" height={16} animation="wave" />
          <Box
            sx={{
              mt: 3,
              height: 235,
              px: { xs: 1, sm: 2.5 },
              pb: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              alignItems: 'end',
              gap: { xs: 1.5, sm: 2.5 },
            }}
          >
            {BAR_SKELETON_HEIGHTS.map((barHeight, i) => (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Skeleton
                  variant="rounded"
                  width="100%"
                  height={barHeight}
                  animation="wave"
                  sx={{ borderRadius: '14px 14px 4px 4px', maxWidth: 56 }}
                />
                <Skeleton variant="text" width="76%" height={14} animation="wave" />
              </Box>
            ))}
          </Box>
        </SectionSurface>
      </Box>

      {/* Pending Surrender Queue & Retention Radar Skeletons */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: OVERVIEW_GAP,
        }}
      >
        {[0, 1].map((col) => (
          <SectionSurface key={col}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Skeleton variant="text" width="45%" height={24} animation="wave" />
              <Skeleton variant="rounded" width={88} height={28} animation="wave" sx={{ borderRadius: '9999px' }} />
            </Box>
            <Stack spacing={1}>
              {[0, 1, 2].map((row) => (
                <Box
                  key={row}
                  sx={{
                    p: 1.5,
                    borderRadius: '14px',
                    bgcolor: 'background.default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton variant="text" width="62%" height={18} animation="wave" />
                    <Skeleton variant="text" width="44%" height={14} animation="wave" />
                  </Box>
                  <Skeleton variant="rounded" width={68} height={24} animation="wave" sx={{ borderRadius: '9999px', flexShrink: 0 }} />
                </Box>
              ))}
            </Stack>
          </SectionSurface>
        ))}
      </Box>
    </Stack>
  );
}
