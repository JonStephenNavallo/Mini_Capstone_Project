import React from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import M3PillButton from '../actions/M3PillButton.jsx';

/**
 * M3StepWizard - Reusable Material 3 Expressive multi-step wizard container.
 * Uses clean tonal step pills, progress bar, per-step validation gating,
 * and zero outer glow effects.
 */
export default function M3StepWizard({
  steps = [],
  activeStep = 0,
  onStepChange,
  canProceed = true,
  nextLabel = 'Continue',
  backLabel = 'Back',
  submitLabel = 'Submit',
  submitIcon = null,
  submitColor = 'primary',
  submitting = false,
  onSubmit,
  hideFooter = false,
  children,
}) {
  const totalSteps = steps.length;
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;
  const progressValue = totalSteps > 1 ? ((activeStep + 1) / totalSteps) * 100 : 100;
  const currentStepMeta = steps[activeStep] || {};

  const handleBack = () => {
    if (!isFirstStep) onStepChange?.(activeStep - 1);
  };

  const handleNext = () => {
    if (!canProceed) return;
    if (isLastStep) {
      onSubmit?.();
    } else {
      onStepChange?.(activeStep + 1);
    }
  };

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      {/* Stepper Header */}
      <Box>
        {/* Mobile compact step summary */}
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} color="text.primary">
            {currentStepMeta.label}
          </Typography>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#0d4b6e' }}>
            Step {activeStep + 1} of {totalSteps}
          </Typography>
        </Box>

        {/* Desktop step pills */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'grid' },
            gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))`,
            gap: 1.25,
            mb: 1.5,
          }}
        >
          {steps.map((step, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;
            const canJump = isCompleted && typeof onStepChange === 'function';

            return (
              <Box
                key={step.key || step.label}
                onClick={canJump ? () => onStepChange(index) : undefined}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 1.25,
                  borderRadius: '14px',
                  bgcolor: isActive
                    ? '#011f2f'
                    : isCompleted
                      ? 'rgba(13, 75, 110, 0.08)'
                      : 'rgba(15, 23, 42, 0.04)',
                  color: isActive ? '#ffffff' : 'text.primary',
                  cursor: canJump ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    bgcolor: isActive
                      ? '#f57f3b'
                      : isCompleted
                        ? '#0d4b6e'
                        : 'rgba(15, 23, 42, 0.10)',
                    color: isActive || isCompleted ? '#ffffff' : 'text.secondary',
                  }}
                >
                  {isCompleted ? <CheckIcon sx={{ fontSize: 16 }} /> : index + 1}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      display: 'block',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      color: isActive ? '#ffffff' : 'text.primary',
                      lineHeight: 1.2,
                    }}
                  >
                    {step.label}
                  </Typography>
                  {step.caption && (
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        display: 'block',
                        fontSize: '0.68rem',
                        color: isActive ? 'rgba(255, 255, 255, 0.72)' : 'text.secondary',
                        lineHeight: 1.25,
                      }}
                    >
                      {step.caption}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Smooth Progress Track */}
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            height: 5,
            borderRadius: '9999px',
            bgcolor: 'rgba(13, 75, 110, 0.12)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#f57f3b',
              borderRadius: '9999px',
            },
          }}
        />
      </Box>

      {/* Active Step Content */}
      <Box sx={{ minWidth: 0 }}>{children}</Box>

      {/* Wizard Footer Actions */}
      {!hideFooter && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexWrap: 'wrap',
          }}
        >
          <Box>
            {!isFirstStep && (
              <M3PillButton
                variant="text"
                color="neutral"
                icon={<ArrowBackIcon fontSize="small" />}
                onClick={handleBack}
                disabled={submitting}
              >
                {backLabel}
              </M3PillButton>
            )}
          </Box>

          <M3PillButton
            variant="filled"
            color={isLastStep ? submitColor : 'primary'}
            disabled={!canProceed}
            loading={isLastStep && submitting}
            icon={isLastStep ? submitIcon : undefined}
            trailingIcon={!isLastStep ? <ArrowForwardIcon fontSize="small" /> : undefined}
            onClick={handleNext}
          >
            {isLastStep ? submitLabel : nextLabel}
          </M3PillButton>
        </Box>
      )}
    </Stack>
  );
}
