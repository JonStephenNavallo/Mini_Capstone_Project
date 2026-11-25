import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import { useLeaderboard } from '../../api/lostFoundApi.js';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { data: entries = [], isLoading } = useLeaderboard();

  return (
    <Stack spacing={3}>
      <SectionSurface
        sx={{
          bgcolor: '#fff8eb',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '16px',
              bgcolor: 'rgba(245, 127, 59, 0.14)',
              color: '#f57f3b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EmojiEventsIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Department Honesty Leaderboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recognizing academic departments whose students promptly surrender lost campus property to OSAS.
            </Typography>
          </Box>
        </Box>
        <M3PillButton
          variant="filled"
          icon={<VolunteerActivismIcon fontSize="small" />}
          onClick={() => navigate('/report-found')}
        >
          Return a Found Item
        </M3PillButton>
      </SectionSurface>

      {isLoading ? (
        <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : entries.length === 0 ? (
        <SectionSurface sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="body1" fontWeight={700}>
            No department returns recorded yet this term.
          </Typography>
        </SectionSurface>
      ) : (
        <SectionSurface>
          <Stack spacing={1.5}>
            {entries.map((entry, idx) => (
              <Box
                key={entry.department}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  p: 2,
                  borderRadius: '16px',
                  bgcolor: 'background.default',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
                  <Chip
                    label={`#${idx + 1}`}
                    color={idx === 0 ? 'warning' : idx < 3 ? 'primary' : 'default'}
                    sx={{ fontWeight: 800, minWidth: 44 }}
                  />
                  <Avatar
                    sx={{
                      bgcolor: idx === 0 ? '#f57f3b' : '#011f2f',
                      color: '#ffffff',
                      fontWeight: 800,
                      width: 44,
                      height: 44,
                    }}
                  >
                    <SchoolIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} noWrap>
                      {entry.department}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {entry.total_items_surrendered}{' '}
                      {entry.total_items_surrendered === 1 ? 'verified return' : 'verified returns'}
                    </Typography>
                  </Box>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Chip
                    label={entry.tier_label}
                    size="small"
                    variant="outlined"
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                  />
                  <Typography variant="h6" fontWeight={800} color="primary">
                    {entry.total_points} pts
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </SectionSurface>
      )}
    </Stack>
  );
}
