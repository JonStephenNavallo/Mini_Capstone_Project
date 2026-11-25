import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import { useCurrentUser } from '../../../../shared/hooks/useCurrentUser.js';
import { useClaimTickets, usePortalConfig } from '../../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';
import QrTagPrintDialog from '../../components/QrTagPrintDialog.jsx';

export default function ClaimGuidePage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: config } = usePortalConfig();
  const { data: tickets = [] } = useClaimTickets(Boolean(user));
  const openQrPrint = useLostFoundUiStore((s) => s.openQrPrint);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Claiming an Item at OSAS
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Walk-in verification instructions and your active QR passes.
        </Typography>
      </Box>

      <Alert
        severity="warning"
        icon={<VerifiedUserIcon />}
        sx={{ borderRadius: '20px', p: 2 }}
      >
        <Typography variant="subtitle2" fontWeight={800}>
          Strict In-Person Policy (No Online Claims or Delivery)
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Students cannot submit online ownership claims or request courier delivery. You must personally visit{' '}
          <strong>{config?.office_location || 'the OSAS Office'}</strong> during office hours (
          <strong>{config?.office_hours || 'Mon–Fri, 8:00 AM – 5:00 PM'}</strong>) with a valid Student ID to verify
          unique identifying marks and claim your belongings.
        </Typography>
      </Alert>

      <SectionSurface>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
          3-Step Walk-In Claim Process
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {[
            {
              step: 'Step 1',
              title: 'Locate & Generate Pass',
              desc: 'Find your item in the Explore Catalog and generate a temporary Walk-In QR Claim Pass.',
            },
            {
              step: 'Step 2',
              title: 'Visit OSAS with Student ID',
              desc: `Proceed to ${config?.office_location || 'OSAS'} and present your QR pass at the counter.`,
            },
            {
              step: 'Step 3',
              title: 'Verify & Sign Release',
              desc: 'Describe hidden identifiers (e.g., wallpaper, engraving, contents) to complete physical release.',
            },
          ].map((s) => (
            <Box key={s.step} sx={{ p: 2, borderRadius: '16px', bgcolor: 'background.default' }}>
              <Chip label={s.step} size="small" color="primary" sx={{ fontWeight: 700, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={800}>
                {s.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {s.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </SectionSurface>

      <SectionSurface>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            My Walk-In QR Claim Passes
          </Typography>
          <M3PillButton
            variant="tonal"
            size="small"
            icon={<SearchIcon fontSize="small" />}
            onClick={() => navigate('/explore')}
          >
            Find Item to Generate Pass
          </M3PillButton>
        </Box>

        {!user ? (
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography variant="body2" color="text.secondary">
              Sign in to generate or view your Walk-In QR Claim Passes.
            </Typography>
            <M3PillButton
              variant="filled"
              icon={<LoginIcon fontSize="small" />}
              onClick={() => navigate('/auth/login')}
            >
              Sign In
            </M3PillButton>
          </Stack>
        ) : tickets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            You have no Walk-In QR Claim Passes yet. Open any item in &ldquo;Explore Items&rdquo; to generate one.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {tickets.map((t) => (
              <Box
                key={t.id}
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  bgcolor: 'background.default',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={800}>
                      {t.ticket_code}
                    </Typography>
                    <Chip
                      size="small"
                      label={t.status}
                      color={t.status === 'ACTIVE' ? 'primary' : t.status === 'USED' ? 'success' : 'default'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t.found_item_detail?.title} ({t.found_item_detail?.tracking_code})
                  </Typography>
                </Box>
                <M3PillButton
                  size="small"
                  variant="tonal"
                  icon={<QrCode2Icon fontSize="small" />}
                  onClick={() =>
                    openQrPrint({
                      title: 'Walk-In OSAS Claim Pass',
                      subtitle: `${t.found_item_detail?.title} (${t.found_item_detail?.tracking_code})`,
                      code: t.ticket_code,
                      hint: `Show this QR code at ${config?.office_location || 'OSAS Office'} with your Student ID.`,
                    })
                  }
                >
                  Show QR Pass
                </M3PillButton>
              </Box>
            ))}
          </Stack>
        )}
      </SectionSurface>

      <QrTagPrintDialog />
    </Stack>
  );
}
