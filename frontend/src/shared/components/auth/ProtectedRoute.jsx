import React from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { useLogout } from '../../hooks/useLogout.js';
import { ROLE_HOME, loginPath, routeDecision } from '../../auth/routePolicy.js';
import M3PillButton from '../actions/M3PillButton.jsx';

export default function ProtectedRoute({ allowedRoles }) {
  const session = useCurrentUser();
  const location = useLocation();
  const logout = useLogout();

  const decision = routeDecision({
    user: session.data,
    pending: session.isPending,
    error: session.isError,
    phase: session.phase,
    pathname: location.pathname,
    allowedRoles,
  });

  if (decision === 'allow') return <Outlet />;
  if (decision === 'login') {
    return <Navigate to={loginPath()} state={{ from: location.pathname + location.search }} replace />;
  }

  return (
    <Box sx={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={2} alignItems="center" role="status" sx={{ maxWidth: 420, textAlign: 'center' }}>
        {decision === 'loading' ? (
          <>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              {session.phase === 'logging-out' ? 'Signing out…' : 'Checking your session…'}
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" fontWeight={700}>
              {decision === 'forbidden'
                ? 'Access restricted'
                : decision === 'logout-error'
                  ? 'Sign-out could not be confirmed'
                  : 'Unable to check your session'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {decision === 'forbidden'
                ? 'Your account does not have permission to open this workspace.'
                : 'Check your connection and try again.'}
            </Typography>
            <Stack direction="row" spacing={1.5}>
              {decision === 'forbidden' && ROLE_HOME[session.data?.role] && (
                <M3PillButton variant="filled" component="a" href={ROLE_HOME[session.data.role]}>
                  Go to my workspace
                </M3PillButton>
              )}
              {decision === 'error' && (
                <M3PillButton variant="tonal" onClick={() => session.refetch()}>
                  Retry
                </M3PillButton>
              )}
              <M3PillButton
                variant="outlined"
                color="neutral"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Sign out
              </M3PillButton>
            </Stack>
          </>
        )}
      </Stack>
    </Box>
  );
}
