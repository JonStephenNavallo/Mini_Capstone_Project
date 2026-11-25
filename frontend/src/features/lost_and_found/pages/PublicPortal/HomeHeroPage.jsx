import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import M3FabMenu from '../../../../shared/components/actions/M3FabMenu.jsx';
import M3HorizontalCarousel from '../../../../shared/components/data-display/M3HorizontalCarousel.jsx';
import { PRIMARY_BUTTON_GRADIENT } from '../../../../shared/theme/themeContextValue.js';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import { useLeaderboard, usePortalConfig, usePublicFoundItems } from '../../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';
import FoundItemCard from '../../components/FoundItemCard.jsx';
import ItemDetailDialog from '../../components/ItemDetailDialog.jsx';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';

export default function HomeHeroPage() {
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState('');

  const openItemDetail = useLostFoundUiStore((s) => s.openItemDetail);

  const { data: custodyData } = usePublicFoundItems({ status: 'IN_CUSTODY', page_size: 7 });
  const { data: claimedData } = usePublicFoundItems({ status: 'CLAIMED', page_size: 2 });
  const { data: leaderboard = [] } = useLeaderboard();
  const { data: config } = usePortalConfig();

  // Prioritize today's turn-ins for the Home carousel; gracefully fall back to latest turn-ins
  const { spotlightItems, todayCount } = useMemo(() => {
    const allItems = custodyData?.results || [];
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const todayItems = allItems.filter((item) => item.date_found === todayIso);
    const ordered = todayItems.length > 0
      ? [...todayItems, ...allItems.filter((item) => item.date_found !== todayIso)]
      : allItems;
    return { spotlightItems: ordered, todayCount: todayItems.length };
  }, [custodyData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/explore${heroSearch.trim() ? `?search=${encodeURIComponent(heroSearch.trim())}` : ''}`);
  };

  // Mobile-only M3E FAB speed-dial actions for quick Lost/Found reporting
  const fabMenuItems = useMemo(
    () => [
      {
        key: 'report-lost',
        label: 'Report Lost Item',
        icon: <ReportProblemOutlinedIcon sx={{ fontSize: 20 }} />,
        onClick: () => navigate('/report-lost?new=1'),
      },
      {
        key: 'report-found',
        label: 'Report Found Item',
        icon: <VolunteerActivismOutlinedIcon sx={{ fontSize: 20 }} />,
        onClick: () => navigate('/report-found'),
      },
    ],
    [navigate]
  );

  return (
    <Stack spacing={3}>
      {/* Hero Banner */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: '24px', sm: '28px' },
          p: { xs: 2.5, sm: 4.5 },
          bgcolor: '#edf4ff',
          boxShadow: 'none',
        }}
      >
        <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 740, mx: 'auto', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="OSAS Official Campus Custody Portal"
              color="primary"
              size="small"
              sx={{ fontWeight: 700, borderRadius: '9999px' }}
            />
            <Chip
              label={config?.office_hours || 'Mon–Fri, 8:00 AM – 5:00 PM'}
              variant="outlined"
              size="small"
              sx={{ borderRadius: '9999px' }}
            />
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.75rem', sm: '2.5rem' },
              lineHeight: 1.18,
              letterSpacing: '-0.025em',
              pb: 0.25,
              backgroundImage: PRIMARY_BUTTON_GRADIENT,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            Lost something on campus? Let&apos;s bring it back safely.
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620, mx: 'auto' }}>
            Browse items turned in to the Office of Student Affairs and Services (OSAS), log a missing item for automatic matching, or drop off a found item in seconds. All claims are verified in person at OSAS.
          </Typography>

          {/* Search Bar */}
          <Box component="form" onSubmit={handleSearchSubmit} sx={{ width: '100%', maxWidth: 640 }}>
            <TextField
              fullWidth
              placeholder="Search found items (e.g., AquaFlask, AirPods, Student ID, Library)…"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <M3PillButton type="submit" size="small" variant="filled">
                        Search
                      </M3PillButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: '9999px',
                    bgcolor: '#ffffff',
                    pr: 1,
                  },
                },
              }}
            />
          </Box>

          {/* Primary Action CTAs (Desktop shows Report Lost/Found pills; Mobile uses M3FabMenu) */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            justifyContent="center"
            alignItems="center"
            flexWrap="wrap"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <M3PillButton
              variant="filled"
              icon={<SearchIcon fontSize="small" />}
              onClick={() => navigate('/explore')}
            >
              Explore Found Items
            </M3PillButton>
            <M3PillButton
              variant="filled"
              color="accent"
              icon={<ReportProblemIcon fontSize="small" />}
              onClick={() => navigate('/report-lost?new=1')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Report Lost Item
            </M3PillButton>
            <M3PillButton
              variant="outlined"
              color="accent"
              icon={<VolunteerActivismIcon fontSize="small" />}
              onClick={() => navigate('/report-found')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Report Found Item
            </M3PillButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Today's & Recently Turned In Full-Bleed Carousel (In Custody) */}
      <M3HorizontalCarousel
        fullBleed
        ariaLabel="Today's and recently turned in items"
        headerLeft={
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" fontWeight={800}>
                {todayCount > 0 ? "Today's & Recently Turned In" : 'Recently Turned In to OSAS'}
              </Typography>
              {todayCount > 0 && (
                <Chip
                  size="small"
                  label={`${todayCount} logged today`}
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(245, 127, 59, 0.14)',
                    color: '#d96320',
                    borderRadius: '9999px',
                  }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Swipe or browse items currently in safe OSAS custody awaiting owner verification
            </Typography>
          </Box>
        }
        headerRight={
          <M3PillButton
            variant="text"
            size="small"
            trailingIcon={<ArrowForwardIcon fontSize="small" />}
            onClick={() => navigate('/explore')}
          >
            View all ({custodyData?.count || 0})
          </M3PillButton>
        }
      >
        {spotlightItems.map((item) => (
          <FoundItemCard
            key={item.id}
            item={item}
            maskSensitivePhoto
            onSelect={(it) => openItemDetail(it.id)}
          />
        ))}
      </M3HorizontalCarousel>

      {/* Recently Claimed Showcase + Honesty Leaders */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 2,
        }}
      >
        <SectionSurface>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutlinedIcon color="success" />
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  Recently Claimed &amp; Reunited
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Verified walk-in returns at {config?.office_location || 'OSAS'}
                </Typography>
              </Box>
            </Box>
            <M3PillButton
              variant="text"
              size="small"
              onClick={() => navigate('/explore?status=CLAIMED')}
            >
              See history
            </M3PillButton>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            {(claimedData?.results || []).slice(0, 2).map((item) => (
              <FoundItemCard key={item.id} item={item} onSelect={(it) => openItemDetail(it.id)} />
            ))}
          </Box>
        </SectionSurface>

        <SectionSurface>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEventsIcon color="warning" />
              <Typography variant="h6" fontWeight={800}>
                Honesty Leaders
              </Typography>
            </Box>
            <M3PillButton variant="text" size="small" onClick={() => navigate('/leaderboard')}>
              Full board
            </M3PillButton>
          </Box>

          <Stack spacing={1.25}>
            {leaderboard.slice(0, 4).map((entry, index) => (
              <Box
                key={entry.department}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: '14px',
                  bgcolor: 'background.default',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  <Chip
                    label={`#${index + 1}`}
                    size="small"
                    color={index === 0 ? 'warning' : 'default'}
                    sx={{ fontWeight: 800 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {entry.department}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {entry.total_items_surrendered} returned • {entry.tier_label}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="subtitle2" fontWeight={800} color="primary">
                  {entry.total_points} pts
                </Typography>
              </Box>
            ))}
          </Stack>
        </SectionSurface>
      </Box>

      <ItemDetailDialog />
      <QrTagPrintDialog />

      {/* Mobile-only M3E FAB (+) Speed-Dial copied from Teacher Instructional Hub */}
      <M3FabMenu
        items={fabMenuItems}
        triggerIcon={<AddIcon sx={{ fontSize: 28 }} />}
        ariaLabel="Report Lost or Found Item"
        mobileOnly
      />
    </Stack>
  );
}
