import api from '../../services/api.js';
import {
  announceSessionChange,
  clearSessionState,
  performLogout,
  setSessionPhase,
} from './sessionBoundary.js';
import { ROLE_HOME, loginPath } from './routePolicy.js';

export const CURRENT_USER_KEY = ['auth', 'currentUser'];
let identity;
const sessionIdentity = (user) => (user ? `${user.id}:${user.role}:${user.is_active}` : null);

export async function performLogin({ queryClient, authenticate, navigate, redirectTo }) {
  await clearSessionState(queryClient);
  identity = undefined;
  let authenticated = false;
  try {
    await authenticate();
    authenticated = true;
    announceSessionChange();
    const user = await readSession();
    if (!user) throw new Error('Unable to verify session after login.');
    identity = sessionIdentity(user);
    queryClient.setQueryData(CURRENT_USER_KEY, user);
    setSessionPhase('ready');
    const destination = redirectTo || ROLE_HOME[user.role] || '/';
    navigate(destination, { replace: true });
    return user;
  } catch (error) {
    queryClient.removeQueries({ queryKey: CURRENT_USER_KEY });
    setSessionPhase('ready');
    if (authenticated) {
      error.userFacingMessage = 'Unable to verify your session. Please try logging in again.';
    }
    throw error;
  }
}

export async function readSession(signal) {
  try {
    const { data } = await api.get('/auth/me/', { signal, sessionControl: true });
    return data;
  } catch (error) {
    if ([401, 403].includes(error.response?.status)) return null;
    throw error;
  }
}

export function currentUserOptions(queryClient) {
  return {
    queryKey: CURRENT_USER_KEY,
    queryFn: async ({ signal }) => {
      const user = await readSession(signal);
      const nextIdentity = sessionIdentity(user);
      if (identity !== undefined && identity !== nextIdentity) {
        await clearSessionState(queryClient);
        window.location.reload();
        return null;
      }
      identity = nextIdentity;
      return user;
    },
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  };
}

export function logoutSession(queryClient) {
  return performLogout({
    queryClient,
    readSession,
    requestLogout: async () => {
      await api.get('/auth/csrf/', { sessionControl: true });
      await api.post('/auth/logout/', {}, { sessionControl: true });
    },
    navigate: (path) => window.location.replace(path),
    destination: loginPath(),
  });
}

export function watchOtherSessions(queryClient) {
  const reload = async (event) => {
    if (event.key !== 'lnf-session-change') return;
    await clearSessionState(queryClient);
    window.location.reload();
  };
  const restore = (event) => {
    if (event.persisted) window.location.reload();
  };
  window.addEventListener('storage', reload);
  window.addEventListener('pageshow', restore);
  return () => {
    window.removeEventListener('storage', reload);
    window.removeEventListener('pageshow', restore);
  };
}
