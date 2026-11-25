import React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LoginIcon from '@mui/icons-material/Login';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import { useCurrentUser } from '../../../shared/hooks/useCurrentUser.js';
import {
  useGenerateClaimTicket,
  usePortalConfig,
  usePublicFoundItemDetail,
} from '../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../state/lostFoundUiStore.js';
import { STATUS_CHIP_STYLES } from '../constants/statusStyles.js';
import ItemPhotoGallery from './ItemPhotoGallery.jsx';

export default function ItemDetailDialog() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const selectedItemId = useLostFoundUiStore((s) => s.selectedItemId);
  const closeItemDetail = useLostFoundUiStore((s) => s.closeItemDetail);
  const openQrPrint = useLostFoundUiStore((s) => s.openQrPrint);

  const { data: user } = useCurrentUser();
  const { data: item, isLoading } = usePublicFoundItemDetail(selectedItemId);
  const { data: config } = usePortalConfig();
  const generateTicket = useGenerateClaimTicket();

  const handleGeneratePass = async () => {
    if (!item) return;
    const ticket = await generateTicket.mutateAsync(item.id);
    closeItemDetail();
    openQrPrint({
      title: 'Walk-In OSAS Claim Pass',
      subtitle: `${item.title} (${item.tracking_code})`,
      code: ticket.ticket_code,
      hint: `Present this QR pass & your Student ID in person at ${config?.office_location || 'the OSAS Office'} for physical verification.`,
    });
  };

  const badge = item ? STATUS_CHIP_STYLES[item.custody_status] || { label: item.custody_status, color: 'default' } : null;

  return (
    <Dialog
      open={Boolean(selectedItemId)}
      onClose={closeItemDetail}
      fullScreen={isMobile}
      maxWidth="sm"
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
            bgcolor: '#ffffff',
            background: 'linear-gradient(180deg, #042a3f 0px, #042a3f 96px, #ffffff 96px, #ffffff 100%)',
            border: 'none',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.16)',
            maxHeight: isMobile ? '100dvh' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              bgcolor: 'rgba(245, 127, 59, 0.22)',
              color: '#ffb380',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Inventory2Icon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} noWrap sx={{ fontSize: '1.05rem', color: '#ffffff' }}>
              {item ? item.title : 'Found Item Details'}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.76)' }}>
              {item ? `${item.tracking_code} • ${item.category_name}` : 'Loading item details…'}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={closeItemDetail}
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
        {isLoading || !item ? (
          <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.25}>
            <ItemPhotoGallery
              key={item.id}
              primaryPhoto={
                item.custody_status === 'CLAIMED' && item.public_handover_photo
                  ? item.public_handover_photo
                  : item.primary_photo
              }
              photos={
                item.custody_status === 'CLAIMED' && item.public_handover_photo && item.primary_photo
                  ? [{ id: 'original-primary', image: item.primary_photo }, ...(item.photos || [])]
                  : item.photos
              }
              alt={item.title}
              maxHeight={240}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={badge.label} color={badge.color} size="small" sx={{ fontWeight: 700 }} />
              <Chip label={`Found: ${item.date_found}`} size="small" variant="outlined" />
              <Chip label={item.location_label} size="small" variant="outlined" />
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', display: 'block', mb: 0.75 }}
              >
                Public Description
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {item.general_description}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Surrendered by: {item.finder_display}
              </Typography>
            </Box>

            <Alert
              severity="info"
              icon={<VerifiedUserIcon fontSize="small" />}
              sx={{ borderRadius: '16px' }}
            >
              <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                In-Person OSAS Verification Required
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                Online ownership claims and delivery are disabled. Please visit{' '}
                <strong>{config?.office_location || 'OSAS Office'}</strong> ({config?.office_hours || 'Mon–Fri, 8AM–5PM'})
                with your Student ID to describe hidden identifying markers and claim this item.
              </Typography>
            </Alert>
          </Stack>
        )}
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
          gap: 1.25,
          '& > *': { width: { xs: '100%', sm: 'auto' }, m: '0 !important' },
        }}
      >
        <M3PillButton variant="text" color="neutral" fullWidth={isMobile} onClick={closeItemDetail}>
          Close
        </M3PillButton>
        {item?.custody_status === 'IN_CUSTODY' && (
          user ? (
            <M3PillButton
              variant="filled"
              fullWidth={isMobile}
              loading={generateTicket.isPending}
              icon={<QrCode2Icon fontSize="small" />}
              onClick={handleGeneratePass}
            >
              Generate Walk-In QR Pass
            </M3PillButton>
          ) : (
            <M3PillButton
              variant="filled"
              fullWidth={isMobile}
              icon={<LoginIcon fontSize="small" />}
              onClick={() => {
                closeItemDetail();
                navigate('/auth/login');
              }}
            >
              Sign In for Walk-In QR Pass
            </M3PillButton>
          )
        )}
      </DialogActions>
    </Dialog>
  );
}
