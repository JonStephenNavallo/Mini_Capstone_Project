import React from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { QRCodeSVG } from 'qrcode.react';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import { useLostFoundUiStore } from '../state/lostFoundUiStore.js';

export default function QrTagPrintDialog() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const payload = useLostFoundUiStore((s) => s.qrPrintPayload);
  const closeQrPrint = useLostFoundUiStore((s) => s.closeQrPrint);

  return (
    <Dialog
      open={Boolean(payload)}
      onClose={closeQrPrint}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(15,23,42,0.45)',
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: '28px',
            bgcolor: '#ffffff',
            background: 'linear-gradient(180deg, #042a3f 0px, #042a3f 84px, #ffffff 84px, #ffffff 100%)',
            border: 'none',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.16)',
            overflow: 'hidden',
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
            <QrCode2Icon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#ffffff', lineHeight: 1.25 }}>
              {payload?.title || 'QR Label'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.76)', display: 'block' }}>
              {payload?.subtitle}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={closeQrPrint}
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

      <DialogContent sx={{ px: 3, pt: '28px !important', pb: '24px !important' }}>
        {payload && (
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: '#ffffff',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <QRCodeSVG value={payload.code} size={184} includeMargin />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '0.04em' }}>
              {payload.code}
            </Typography>
            {payload.hint && (
              <Typography variant="body2" color="text.secondary">
                {payload.hint}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        className="no-print"
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: isDark ? '#1a1b1e' : '#f8fafd',
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
        }}
      >
        <M3PillButton variant="text" color="neutral" onClick={closeQrPrint}>
          Close
        </M3PillButton>
        <M3PillButton
          variant="filled"
          icon={<PrintIcon fontSize="small" />}
          onClick={() => window.print()}
        >
          Print Tag
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
