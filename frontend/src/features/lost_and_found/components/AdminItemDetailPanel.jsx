import React from 'react';
import { Box, Chip, Divider, IconButton, Stack, Typography, useTheme } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import UndoIcon from '@mui/icons-material/Undo';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import M3PillButton from '../../../shared/components/actions/M3PillButton.jsx';
import StatusBadge from '../../../shared/components/data-display/StatusBadge.jsx';
import { STATUS_CHIP_STYLES } from '../constants/statusStyles.js';
import ItemPhotoGallery from './ItemPhotoGallery.jsx';

/**
 * AdminItemDetailPanel — Displays full OSAS custody details and quick actions
 * for a selected directory item inside the desktop right split-pane or mobile bottom sheet.
 */
export default function AdminItemDetailPanel({
  item,
  onClose,
  onApprove,
  onEdit,
  onProcessClaim,
  onVoidClaim,
  onPrintQr,
  onDelete,
  hideHeader = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!item) return null;

  const badge = STATUS_CHIP_STYLES[item.custody_status] || {
    label: item.custody_status,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {!hideHeader && (
        <Box
          sx={{
            px: 2.25,
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap>
              {item.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {item.tracking_code} • {item.category_name || 'Uncategorized'}
            </Typography>
          </Box>
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close item details"
              sx={{
                borderRadius: '9999px',
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25 }}>
        <Stack spacing={2}>
          <ItemPhotoGallery
            key={item.id}
            primaryPhoto={item.primary_photo}
            photos={item.photos}
            alt={item.title}
            maxHeight={190}
            showPlaceholder
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <StatusBadge status={item.custody_status} label={badge.label} />
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Found {item.date_found || '—'}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.75,
              borderRadius: '16px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f0f4f9',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block',
                mb: 0.75,
                fontSize: '0.7rem',
              }}
            >
              Custody Metadata
            </Typography>
            <Stack spacing={0.75}>
              <Typography variant="body2">
                <strong>Tracking Code:</strong> {item.tracking_code}
              </Typography>
              <Typography variant="body2">
                <strong>Shelf / Bin:</strong> {item.storage_shelf_bin || 'Not assigned'}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <span>{item.location_label || 'Campus Grounds'}</span>
              </Typography>
              <Typography variant="body2">
                <strong>Surrendered By:</strong> {item.finder_display || 'Anonymous'}
              </Typography>
            </Stack>
          </Box>

          {item.general_description && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.7rem',
                }}
              >
                Public Description
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.55 }}>
                {item.general_description}
              </Typography>
            </Box>
          )}

          {(item.secret_identifiers || item.secret_photo) && (
            <Box
              sx={{
                p: 1.75,
                borderRadius: '16px',
                bgcolor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fef9e7',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: isDark ? '#fcd34d' : '#92400e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 0.5,
                  fontSize: '0.7rem',
                }}
              >
                Confidential Verification Markers
              </Typography>
              {item.secret_identifiers && (
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  {item.secret_identifiers}
                </Typography>
              )}
              {item.secret_photo && (
                <Box
                  component="img"
                  src={item.secret_photo}
                  alt="Confidential verification photo"
                  sx={{
                    mt: item.secret_identifiers ? 1.25 : 0.5,
                    width: '100%',
                    maxHeight: 160,
                    objectFit: 'cover',
                    borderRadius: '12px',
                    display: 'block',
                  }}
                />
              )}
            </Box>
          )}

          {item.claim_transaction && (
            <Box
              sx={{
                p: 1.75,
                borderRadius: '16px',
                bgcolor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#edf8f1',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: isDark ? '#86efac' : '#0d532b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 0.75,
                  fontSize: '0.7rem',
                }}
              >
                Claim Release Audit &amp; Evidence
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Claimant:</strong> {item.claim_transaction.claimant_name} ({item.claim_transaction.claimant_student_number})
                </Typography>
                <Typography variant="body2">
                  <strong>ID Presented:</strong> {item.claim_transaction.claimant_id_type}
                </Typography>
                <Typography variant="body2">
                  <strong>Verified By:</strong> {item.claim_transaction.verifying_admin_name || 'OSAS Admin'}
                </Typography>
                <Typography variant="body2">
                  <strong>Released On:</strong>{' '}
                  {item.claim_transaction.claim_date
                    ? new Date(item.claim_transaction.claim_date).toLocaleString()
                    : '—'}
                </Typography>
                {item.claim_transaction.verification_notes && (
                  <Typography variant="body2">
                    <strong>Notes:</strong> {item.claim_transaction.verification_notes}
                  </Typography>
                )}
              </Stack>
              {item.claim_transaction.id_photo_evidence && (
                <Box sx={{ mt: 1.25 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Private Claimant ID Evidence (OSAS Only):
                  </Typography>
                  <ItemPhotoGallery
                    primaryPhoto={item.claim_transaction.id_photo_evidence}
                    alt="Private claimant ID evidence"
                    maxHeight={160}
                  />
                </Box>
              )}
              {item.claim_transaction.public_handover_photo && (
                <Box sx={{ mt: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Handover / Reunion Photo:
                    </Typography>
                    <Chip
                      size="small"
                      label={item.claim_transaction.public_handover_consent ? 'Publicly Shown' : 'Internal Only'}
                      color={item.claim_transaction.public_handover_consent ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700, borderRadius: '9999px' }}
                    />
                  </Box>
                  <ItemPhotoGallery
                    primaryPhoto={item.claim_transaction.public_handover_photo}
                    alt="Item handover reunion photo"
                    maxHeight={160}
                  />
                </Box>
              )}
            </Box>
          )}

          {Array.isArray(item.claim_history) &&
            item.claim_history.some((tx) => tx.is_voided) && (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: '16px',
                  bgcolor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: isDark ? '#fca5a5' : '#991b1b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'block',
                    mb: 0.75,
                    fontSize: '0.7rem',
                  }}
                >
                  Reversed / Mistaken Claim History
                </Typography>
                <Stack spacing={1}>
                  {item.claim_history
                    .filter((tx) => tx.is_voided)
                    .map((tx) => (
                      <Box key={tx.id}>
                        <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                          {tx.claimant_name} ({tx.claimant_student_number}) — Reversed by {tx.voided_by_name || 'Admin'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Reason: {tx.void_reason}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Box>
            )}

          <Divider />

          <Stack spacing={1}>
            {item.custody_status === 'PENDING_SURRENDER' && (
              <M3PillButton
                variant="filled"
                color="primary"
                fullWidth
                startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: '18px !important' }} />}
                onClick={() => onApprove?.(item)}
              >
                Approve Physical Intake
              </M3PillButton>
            )}
            {item.custody_status === 'IN_CUSTODY' && (
              <M3PillButton
                variant="filled"
                color="success"
                fullWidth
                startIcon={<VerifiedUserIcon sx={{ fontSize: '18px !important' }} />}
                onClick={() => onProcessClaim?.(item)}
              >
                Process Walk-In Claim
              </M3PillButton>
            )}
            {item.custody_status === 'CLAIMED' && (
              <M3PillButton
                variant="outlined"
                color="warning"
                fullWidth
                startIcon={<UndoIcon sx={{ fontSize: '18px !important' }} />}
                onClick={() => onVoidClaim?.(item)}
              >
                Reverse Mistaken Claim
              </M3PillButton>
            )}
            {item.custody_status !== 'CLAIMED' && (
              <M3PillButton
                variant="tonal"
                color="primary"
                fullWidth
                startIcon={<EditOutlinedIcon sx={{ fontSize: '18px !important' }} />}
                onClick={() => onEdit?.(item)}
              >
                Edit Item Record
              </M3PillButton>
            )}
            {item.custody_status === 'IN_CUSTODY' && (
              <M3PillButton
                variant="tonal"
                color="neutral"
                fullWidth
                startIcon={<QrCode2Icon sx={{ fontSize: '18px !important' }} />}
                onClick={() => onPrintQr?.(item)}
              >
                Print Custody QR Tag
              </M3PillButton>
            )}
            {['PENDING_SURRENDER', 'IN_CUSTODY'].includes(item.custody_status) &&
              !(item.claim_history?.length > 0) && (
                <M3PillButton
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<DeleteIcon sx={{ fontSize: '18px !important' }} />}
                  onClick={() => onDelete?.(item)}
                >
                  Delete Item
                </M3PillButton>
              )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
