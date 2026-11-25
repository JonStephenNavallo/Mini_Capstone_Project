import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CloseIcon from '@mui/icons-material/Close';
import NoPhotographyOutlinedIcon from '@mui/icons-material/NoPhotographyOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import { useQrLookup } from '../api/lostFoundApi.js';
import { useLostFoundUiStore } from '../state/lostFoundUiStore.js';

function classifyCameraError(err) {
  const name = err?.name || '';
  const msg = String(err?.message || err || '').toLowerCase();

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('permission')) {
    return {
      permission: 'denied',
      message:
        'Camera access was denied. To scan QR codes, allow Camera permission in your browser address bar (lock/site settings icon) and tap "Retry Camera".',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || msg.includes('no camera') || msg.includes('requested device not found')) {
    return {
      permission: 'unavailable',
      message: 'No camera device was detected on this device. You can upload a QR image or enter the code manually below.',
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || msg.includes('in use')) {
    return {
      permission: 'prompt',
      message: 'Your camera is currently in use by another app or browser tab. Close the other app and try again.',
    };
  }
  return {
    permission: 'prompt',
    message: 'Unable to start the camera scanner. Check camera permissions or enter the code manually below.',
  };
}

export default function QrScannerDialog({ onResolved }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const open = useLostFoundUiStore((s) => s.qrScannerOpen);
  const mode = useLostFoundUiStore((s) => s.qrScannerMode);
  const closeQrScanner = useLostFoundUiStore((s) => s.closeQrScanner);
  const openItemDetail = useLostFoundUiStore((s) => s.openItemDetail);

  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'insecure' | 'unavailable'
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef(null);
  const resolvingRef = useRef(false);
  const fileInputRef = useRef(null);
  const qrLookup = useQrLookup();

  const cleanupScannerInstance = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance) return;
    scannerRef.current = null;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      instance.clear();
    } catch {
      // Ignore cleanup errors when DOM node already unmounted
    }
  }, []);

  const stopCamera = useCallback(async () => {
    await cleanupScannerInstance();
    setCameraActive(false);
    setStartingCamera(false);
  }, [cleanupScannerInstance]);

  // Monitor browser camera permission state while the scanner dialog is open
  useEffect(() => {
    if (!open) {
      cleanupScannerInstance();
      resolvingRef.current = false;
      return undefined;
    }

    let permStatus = null;
    let active = true;

    const inspectPermissions = async () => {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        if (active) setPermissionState('insecure');
        return;
      }
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        if (active) setPermissionState('unavailable');
        return;
      }
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          permStatus = await navigator.permissions.query({ name: 'camera' });
          if (active) setPermissionState(permStatus.state);
          permStatus.onchange = () => {
            if (active) {
              setPermissionState(permStatus.state);
              if (permStatus.state === 'denied') {
                stopCamera();
                setScanError(
                  'Camera permission was revoked in browser settings. Re-enable Camera access to continue scanning.'
                );
              }
            }
          };
        } catch {
          // Safari / Firefox may not support querying 'camera' via Permissions API
          if (active) setPermissionState('prompt');
        }
      }
    };

    inspectPermissions();

    return () => {
      active = false;
      if (permStatus) permStatus.onchange = null;
      cleanupScannerInstance();
    };
  }, [open, cleanupScannerInstance, stopCamera]);

  const handleClose = async () => {
    await stopCamera();
    resolvingRef.current = false;
    setScanError('');
    closeQrScanner();
  };

  const handleResolveCode = useCallback(
    async (rawCode) => {
      const cleaned = (rawCode || '').trim();
      if (!cleaned || resolvingRef.current) return;
      resolvingRef.current = true;
      setScanError('');
      try {
        const result = await qrLookup.mutateAsync(cleaned);
        await stopCamera();
        closeQrScanner();
        if (onResolved) {
          onResolved(result);
          return;
        }
        if (result.match_type === 'CAMPUS_LOCATION') {
          navigate(`/report-found?location=${encodeURIComponent(result.location.qr_slug)}`);
        } else if (result.found_item) {
          if (mode === 'claim_counter') {
            navigate(`/admin/claim?code=${encodeURIComponent(cleaned)}`);
          } else {
            openItemDetail(result.found_item.id);
          }
        }
      } catch (err) {
        setScanError(err.response?.data?.code || err.response?.data?.detail || 'Code could not be resolved.');
      } finally {
        resolvingRef.current = false;
      }
    },
    [qrLookup, stopCamera, closeQrScanner, onResolved, navigate, mode, openItemDetail]
  );

  const startCamera = async () => {
    setScanError('');

    // 1. Enforce secure context & MediaDevices API support before touching Html5Qrcode
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setPermissionState('insecure');
      setScanError(
        'Camera access requires a secure connection (HTTPS or localhost). Open the app over HTTPS or enter the code manually below.'
      );
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setPermissionState('unavailable');
      setScanError('This browser does not support live camera access. Upload a QR image or enter the code manually.');
      return;
    }

    setStartingCamera(true);
    try {
      // 2. Explicitly request & verify camera permission via getUserMedia before opening the scanner
      let probeStream = null;
      try {
        probeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback to any available webcam if rear-facing constraint is unsupported on desktop
        if (firstErr?.name === 'OverconstrainedError' || firstErr?.name === 'NotFoundError') {
          probeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw firstErr;
        }
      } finally {
        probeStream?.getTracks().forEach((track) => track.stop());
      }

      setPermissionState('granted');

      // 3. Pick rear camera when available, otherwise fall back to first detected camera
      let cameraConfig = { facingMode: 'environment' };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rearCamera = devices.find((d) => /back|rear|environment/i.test(d.label || ''));
          cameraConfig = (rearCamera || devices[0]).id;
        }
      } catch {
        // Keep facingMode fallback if enumerateDevices fails
      }

      await cleanupScannerInstance();
      const scanner = new Html5Qrcode('lnf-qr-reader');
      scannerRef.current = scanner;
      setCameraActive(true);
      await scanner.start(
        cameraConfig,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          handleResolveCode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      await cleanupScannerInstance();
      setCameraActive(false);
      const classified = classifyCameraError(err);
      setPermissionState(classified.permission);
      setScanError(classified.message);
    } finally {
      setStartingCamera(false);
    }
  };

  const handleScanImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanError('');
    try {
      await stopCamera();
      const fileScanner = new Html5Qrcode('lnf-qr-file-reader');
      const decodedText = await fileScanner.scanFile(file, false);
      fileScanner.clear();
      await handleResolveCode(decodedText);
    } catch {
      setScanError('No valid QR code was detected in that image. Try a clearer photo or enter the code manually.');
    }
  };

  const permissionChip = (() => {
    switch (permissionState) {
      case 'granted':
        return {
          label: 'Camera Permission Granted',
          color: 'success',
          icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 16 }} />,
        };
      case 'denied':
        return {
          label: 'Camera Permission Blocked',
          color: 'error',
          icon: <NoPhotographyOutlinedIcon sx={{ fontSize: 16 }} />,
        };
      case 'insecure':
        return {
          label: 'HTTPS Required for Camera',
          color: 'warning',
          icon: <NoPhotographyOutlinedIcon sx={{ fontSize: 16 }} />,
        };
      case 'unavailable':
        return {
          label: 'Camera Unavailable',
          color: 'default',
          icon: <NoPhotographyOutlinedIcon sx={{ fontSize: 16 }} />,
        };
      default:
        return {
          label: 'Camera Permission Required',
          color: 'info',
          icon: <CameraAltOutlinedIcon sx={{ fontSize: 16 }} />,
        };
    }
  })();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(6px)',
            backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(15,23,42,0.45)',
          },
        },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: isMobile ? 0 : '28px',
            bgcolor: isDark ? '#1e1f23' : '#ffffff',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2.25,
          pt: { xs: 'calc(env(safe-area-inset-top, 0px) + 16px)', sm: 2.25 },
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
            <QrCodeScannerIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem', color: '#ffffff' }}>
              QR &amp; Code Lookup
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.76)', display: 'block' }}>
              Scan item tag, claim pass, or station poster
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="Close QR scanner"
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

      <DialogContent sx={{ px: 2.5, pt: '24px !important', pb: '24px !important' }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Chip
              size="small"
              icon={permissionChip.icon}
              label={permissionChip.label}
              color={permissionChip.color}
              variant="outlined"
              sx={{ fontWeight: 700, borderRadius: '9999px' }}
            />
          </Box>

          {scanError && (
            <Alert severity={permissionState === 'denied' ? 'error' : 'warning'} sx={{ borderRadius: '12px' }}>
              {scanError}
            </Alert>
          )}

          <Box
            id="lnf-qr-reader"
            sx={{
              width: '100%',
              minHeight: cameraActive ? 240 : 0,
              borderRadius: '16px',
              overflow: 'hidden',
              bgcolor: cameraActive ? '#000' : 'transparent',
            }}
          />
          {/* Hidden mount node for single-image QR decoding */}
          <Box id="lnf-qr-file-reader" sx={{ display: 'none' }} />

          {!cameraActive ? (
            <Stack spacing={1}>
              <M3PillButton
                variant="tonal"
                fullWidth
                loading={startingCamera}
                disabled={permissionState === 'insecure' || permissionState === 'unavailable'}
                icon={<QrCodeScannerIcon fontSize="small" />}
                onClick={startCamera}
              >
                {permissionState === 'denied' ? 'Retry Camera Permission' : 'Open Camera QR Scanner'}
              </M3PillButton>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleScanImageFile}
              />
              <M3PillButton
                variant="outlined"
                color="neutral"
                fullWidth
                icon={<PhotoLibraryOutlinedIcon fontSize="small" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Scan QR from Image
              </M3PillButton>
            </Stack>
          ) : (
            <M3PillButton variant="outlined" color="neutral" fullWidth onClick={stopCamera}>
              Stop Camera
            </M3PillButton>
          )}

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) handleResolveCode(manualCode.trim());
            }}
          >
            <Stack spacing={1.25}>
              <TextField
                label="Or enter Tracking / Ticket / Station Code"
                placeholder="e.g. OSAS-2026-1001, CLM-XXXXXX, or lib-2f"
                size="small"
                fullWidth
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <M3PillButton
                type="submit"
                variant="filled"
                fullWidth
                loading={qrLookup.isPending}
                icon={<SearchIcon fontSize="small" />}
              >
                Lookup Code
              </M3PillButton>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: isDark ? '#1a1b1e' : '#f8fafd',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <M3PillButton variant="text" color="neutral" fullWidth={isMobile} onClick={handleClose}>
          Cancel
        </M3PillButton>
      </DialogActions>
    </Dialog>
  );
}
