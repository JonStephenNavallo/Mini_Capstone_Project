import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import LockIcon from '@mui/icons-material/Lock';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import M3PillButton from '../../../../shared/components/actions/M3PillButton.jsx';
import MultiPhotoUploader from '../../../../shared/components/inputs/MultiPhotoUploader.jsx';
import M3StepWizard from '../../../../shared/components/navigation/M3StepWizard.jsx';
import { SectionSurface } from '../../../../shared/components/dashboard/KpiMetricCard.jsx';
import api from '../../../../services/api.js';
import { useProcessWalkInClaim, useQrLookup } from '../../api/lostFoundApi.js';
import ItemPhotoGallery from '../../components/ItemPhotoGallery.jsx';
import { useLostFoundUiStore } from '../../state/lostFoundUiStore.js';

const CLAIM_WIZARD_STEPS = [
  { key: 'scan', label: 'Scan QR / Tag', caption: 'Verify custody code' },
  { key: 'verify', label: 'Blind Verification', caption: 'Check secret marks' },
  { key: 'release', label: 'Identity & Release', caption: 'Sign-off audit' },
];

export default function AdminProcessClaimPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const openQrScanner = useLostFoundUiStore((s) => s.openQrScanner);

  const [prevInitialCode, setPrevInitialCode] = useState(initialCode);
  const [lookupCode, setLookupCode] = useState(initialCode);
  const [manualResolved, setManualResolved] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [claimDraft, setClaimDraft] = useState({});
  const [idPhotos, setIdPhotos] = useState([]);
  const [handoverPhotos, setHandoverPhotos] = useState([]);
  const [handoverConsent, setHandoverConsent] = useState(false);
  const [verifiedBlindCheck, setVerifiedBlindCheck] = useState(false);
  const [stepOverride, setStepOverride] = useState(null);

  // When a new QR code is scanned into `?code=...` while already on Claim Counter,
  // clear any previous manual lookup/claim state so the newly scanned item loads immediately.
  if (initialCode !== prevInitialCode) {
    setPrevInitialCode(initialCode);
    setLookupCode(initialCode);
    setManualResolved(null);
    setLookupError('');
    setClaimSuccess(null);
    setClaimError('');
    setClaimDraft({});
    setIdPhotos([]);
    setHandoverPhotos([]);
    setHandoverConsent(false);
    setVerifiedBlindCheck(false);
    setStepOverride(null);
  }

  const qrLookup = useQrLookup();
  const processClaim = useProcessWalkInClaim();

  // Fetch initial code via TanStack Query so no setState is needed inside useEffect
  const initialLookup = useQuery({
    queryKey: ['lostFound', 'claimCounterLookup', initialCode],
    queryFn: async () => {
      const { data } = await api.get('/lost-found/qr-lookup/', { params: { code: initialCode } });
      return data;
    },
    enabled: Boolean(initialCode),
    retry: false,
  });

  const resolved = manualResolved ?? initialLookup.data ?? null;
  const item = resolved?.found_item || null;
  const isItemClaimable = Boolean(item && item.custody_status === 'IN_CUSTODY');

  // Auto-advance to Step 1 (Blind Verification) once a valid IN_CUSTODY QR/code is resolved
  const activeStep = stepOverride !== null ? stepOverride : isItemClaimable ? 1 : 0;

  const effectiveLookupError =
    lookupError ||
    (initialLookup.isError
      ? initialLookup.error?.response?.data?.code ||
        initialLookup.error?.response?.data?.detail ||
        'Item or pass not found.'
      : '');

  const claimForm = useMemo(() => {
    const ticket = resolved?.claim_ticket;
    return {
      claimant_student: claimDraft.claimant_student ?? ticket?.student ?? '',
      claimant_name: claimDraft.claimant_name ?? ticket?.student_name ?? '',
      claimant_student_number: claimDraft.claimant_student_number ?? ticket?.student_number ?? '',
      claimant_id_type: claimDraft.claimant_id_type ?? 'Validated Student ID',
      verification_notes: claimDraft.verification_notes ?? '',
    };
  }, [resolved, claimDraft]);

  const performLookup = async (codeToLookup) => {
    setLookupError('');
    setClaimError('');
    setClaimSuccess(null);
    setClaimDraft({});
    setVerifiedBlindCheck(false);
    setStepOverride(null);
    try {
      const data = await qrLookup.mutateAsync(codeToLookup);
      if (!data.found_item) {
        setLookupError('This QR code belongs to a campus station, not a custody item.');
        setManualResolved(null);
        return;
      }
      setManualResolved(data);
      if (data.found_item.custody_status === 'IN_CUSTODY') {
        setStepOverride(1);
      } else {
        setStepOverride(0);
      }
    } catch (err) {
      setManualResolved(null);
      setLookupError(err.response?.data?.code || err.response?.data?.detail || 'Item or pass not found.');
    }
  };

  const handleStudentSearch = async (studentNumOrName) => {
    setClaimDraft((p) => ({ ...p, claimant_student_number: studentNumOrName }));
    if (studentNumOrName.trim().length < 3) return;
    try {
      const { data } = await api.get('/users/students/', { params: { q: studentNumOrName.trim() } });
      if (data.length === 1) {
        const st = data[0];
        setClaimDraft((p) => ({
          ...p,
          claimant_student: st.id,
          claimant_name: `${st.first_name} ${st.last_name}`.trim(),
          claimant_student_number: st.student_number,
        }));
      }
    } catch {
      // Optional auto-complete
    }
  };

  const handleFinalizeClaim = async () => {
    if (!resolved?.found_item) return;
    setClaimError('');
    try {
      const fd = new FormData();
      if (claimForm.claimant_student) fd.append('claimant_student', claimForm.claimant_student);
      fd.append('claimant_name', claimForm.claimant_name);
      fd.append('claimant_student_number', claimForm.claimant_student_number);
      fd.append('claimant_id_type', claimForm.claimant_id_type);
      if (resolved.claim_ticket?.ticket_code) fd.append('ticket_code', resolved.claim_ticket.ticket_code);
      fd.append('verification_notes', claimForm.verification_notes);
      if (idPhotos[0]) fd.append('id_photo_evidence', idPhotos[0]);
      if (handoverPhotos[0]) {
        fd.append('public_handover_photo', handoverPhotos[0]);
        fd.append('public_handover_consent', handoverConsent ? 'true' : 'false');
      }

      const tx = await processClaim.mutateAsync({ itemId: resolved.found_item.id, formData: fd });
      setClaimSuccess(tx);
      setManualResolved({
        ...resolved,
        found_item: { ...resolved.found_item, custody_status: 'CLAIMED' },
      });
    } catch (err) {
      setClaimError(err.response?.data?.detail || 'Failed to finalize walk-in claim.');
    }
  };

  const handleStartNextClaim = () => {
    setLookupCode('');
    setManualResolved(null);
    setLookupError('');
    setClaimSuccess(null);
    setClaimError('');
    setClaimDraft({});
    setIdPhotos([]);
    setHandoverPhotos([]);
    setHandoverConsent(false);
    setVerifiedBlindCheck(false);
    setStepOverride(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('code');
      return next;
    });
  };

  const canProceed = useMemo(() => {
    if (activeStep === 0) return isItemClaimable;
    if (activeStep === 1) return isItemClaimable && verifiedBlindCheck;
    return Boolean(
      isItemClaimable &&
      verifiedBlindCheck &&
      claimForm.claimant_student_number.trim() &&
      claimForm.claimant_name.trim()
    );
  }, [activeStep, isItemClaimable, verifiedBlindCheck, claimForm]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 880, mx: 'auto' }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Walk-In Claim Counter
        </Typography>
        <Typography variant="body2" color="text.secondary">
          QR-enforced 3-step release workflow: scan pass or custody tag, verify secret marks blindly, and log claimant ID.
        </Typography>
      </Box>

      <SectionSurface>
        {claimSuccess ? (
          <Stack spacing={2.5} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                bgcolor: 'rgba(46, 125, 50, 0.12)',
                color: '#2e7d32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircleOutlinedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Property Released &amp; Audit Logged
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Item <strong>{claimSuccess.found_item_tracking}</strong> has been officially released to{' '}
                <strong>{claimSuccess.claimant_name}</strong> ({claimSuccess.claimant_student_number}).
              </Typography>
            </Box>
            <M3PillButton variant="filled" color="primary" onClick={handleStartNextClaim}>
              Process Next Walk-In Claim
            </M3PillButton>
          </Stack>
        ) : (
          <M3StepWizard
            steps={CLAIM_WIZARD_STEPS}
            activeStep={activeStep}
            onStepChange={(next) => {
              if (next === 0 || isItemClaimable) setStepOverride(next);
            }}
            canProceed={canProceed}
            nextLabel={activeStep === 1 ? 'Proceed to Identity & Release' : 'Continue'}
            submitLabel="Verify & Release Item"
            submitIcon={<VerifiedUserIcon fontSize="small" />}
            submitColor="success"
            submitting={processClaim.isPending}
            onSubmit={handleFinalizeClaim}
          >
            {activeStep === 0 && (
              <Stack spacing={2}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '18px',
                    bgcolor: '#011f2f',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: '#f57f3b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Step 1 — Mandatory QR Gate
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.25, color: '#ffffff' }}>
                      Scan Student Walk-In Pass (CLM-XXXXXX) or Custody Tag
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.75)' }}>
                      Physical release is locked until a valid IN_CUSTODY item QR or tracking code is verified.
                    </Typography>
                  </Box>
                  <M3PillButton
                    variant="filled"
                    color="accent"
                    icon={<QrCodeScannerIcon fontSize="small" />}
                    onClick={() => openQrScanner('claim_counter')}
                    sx={{ flexShrink: 0 }}
                  >
                    Scan QR Now
                  </M3PillButton>
                </Box>

                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (lookupCode.trim()) performLookup(lookupCode.trim());
                  }}
                  sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    label="Or Enter Tracking Code / Claim Pass Manually"
                    placeholder="e.g., OSAS-2026-1001 or CLM-XXXXXX"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                  />
                  <M3PillButton
                    type="submit"
                    variant="filled"
                    loading={qrLookup.isPending || initialLookup.isFetching}
                    icon={<SearchIcon fontSize="small" />}
                    sx={{ flexShrink: 0 }}
                  >
                    Verify Code
                  </M3PillButton>
                </Box>

                {effectiveLookupError && (
                  <Alert severity="error" sx={{ borderRadius: '14px' }}>
                    {effectiveLookupError}
                  </Alert>
                )}

                {item && item.custody_status !== 'IN_CUSTODY' && (
                  <Alert severity="info" sx={{ borderRadius: '14px' }}>
                    <strong>{item.title}</strong> ({item.tracking_code}) is currently{' '}
                    <strong>{item.custody_status}</strong> and cannot be released.
                  </Alert>
                )}
              </Stack>
            )}

            {activeStep === 1 && item && (
              <Stack spacing={2}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    bgcolor: 'background.default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tracking: <strong>{item.tracking_code}</strong> • Shelf:{' '}
                      <strong>{item.storage_shelf_bin || 'Unassigned'}</strong>
                      {resolved?.claim_ticket?.ticket_code && (
                        <>
                          {' '}• Walk-In Pass: <strong>{resolved.claim_ticket.ticket_code}</strong>
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Chip label={item.custody_status} color="primary" size="small" />
                </Box>

                {item.primary_photo && (
                  <Box
                    component="img"
                    src={item.primary_photo}
                    alt={item.title}
                    sx={{ width: '100%', maxHeight: 210, objectFit: 'cover', borderRadius: '14px' }}
                  />
                )}

                <Alert severity="warning" icon={<LockIcon fontSize="small" />} sx={{ borderRadius: '16px' }}>
                  <Typography variant="caption" fontWeight={800} sx={{ display: 'block' }}>
                    CONFIDENTIAL VERIFICATION CHECKLIST (Ask Student Verbally Before Showing Item)
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {item.secret_identifiers || 'No secret identifier recorded — verify Student ID and detailed description carefully.'}
                  </Typography>
                </Alert>

                {item.secret_photo && (
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                      Confidential Reference Photo (OSAS Staff Only):
                    </Typography>
                    <ItemPhotoGallery
                      primaryPhoto={item.secret_photo}
                      alt="Confidential verification photo"
                      maxHeight={180}
                    />
                  </Box>
                )}

                <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'rgba(13, 75, 110, 0.06)' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={verifiedBlindCheck}
                        onChange={(e) => setVerifiedBlindCheck(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={700}>
                        I have verbally verified the claimant&apos;s ownership against the confidential marks above.
                      </Typography>
                    }
                  />
                </Box>
              </Stack>
            )}

            {activeStep === 2 && item && (
              <Stack spacing={2}>
                {claimError && <Alert severity="error" sx={{ borderRadius: '12px' }}>{claimError}</Alert>}

                <Box sx={{ p: 1.75, borderRadius: '14px', bgcolor: '#011f2f', color: '#ffffff' }}>
                  <Typography variant="caption" sx={{ color: '#f57f3b', fontWeight: 800 }}>
                    RELEASING ITEM
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#ffffff' }}>
                    {item.title} ({item.tracking_code})
                  </Typography>
                </Box>

                <TextField
                  required
                  label="Claimant Student Number / ID Number"
                  placeholder="e.g. 026A-11745"
                  value={claimForm.claimant_student_number}
                  onChange={(e) => handleStudentSearch(e.target.value)}
                />
                <TextField
                  required
                  label="Claimant Full Name"
                  value={claimForm.claimant_name}
                  onChange={(e) => setClaimDraft((p) => ({ ...p, claimant_name: e.target.value }))}
                />
                <TextField
                  select
                  label="ID Presented"
                  value={claimForm.claimant_id_type}
                  onChange={(e) => setClaimDraft((p) => ({ ...p, claimant_id_type: e.target.value }))}
                >
                  <MenuItem value="Validated Student ID">Validated Student ID</MenuItem>
                  <MenuItem value="Registration Form + Gov ID">Registration Form + Gov ID</MenuItem>
                  <MenuItem value="Faculty / Staff ID">Faculty / Staff ID</MenuItem>
                </TextField>

                <TextField
                  multiline
                  rows={2}
                  label="Verification Notes (how student proved ownership)"
                  placeholder="e.g., Correctly named lockscreen photo and stickers on back"
                  value={claimForm.verification_notes}
                  onChange={(e) => setClaimDraft((p) => ({ ...p, verification_notes: e.target.value }))}
                />

                <MultiPhotoUploader
                  files={idPhotos}
                  onChange={setIdPhotos}
                  maxFiles={1}
                  label="Private Claimant ID Evidence (OSAS Admin Only — Optional)"
                  helperText="Strictly confidential OSAS audit photo of the claimant's ID. Never shown publicly."
                />

                <MultiPhotoUploader
                  files={handoverPhotos}
                  onChange={(nextFiles) => {
                    setHandoverPhotos(nextFiles);
                    if (nextFiles.length === 0) setHandoverConsent(false);
                  }}
                  maxFiles={1}
                  label="Public Handover / Reunion Photo (Optional)"
                  helperText="Optional photo of the item handover (do not include Student ID). Requires claimant consent below to appear on Claimed & Returned cards."
                />

                {handoverPhotos.length > 0 && (
                  <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: 'rgba(13, 75, 110, 0.06)' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={handoverConsent}
                          onChange={(e) => setHandoverConsent(e.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            Claimant consents to display this handover photo publicly
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            If unchecked, this photo stays private in OSAS records and the item&apos;s default photo will be shown publicly.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                )}
              </Stack>
            )}
          </M3StepWizard>
        )}
      </SectionSurface>
    </Stack>
  );
}
