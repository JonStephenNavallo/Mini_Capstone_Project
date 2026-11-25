export const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  STUDENT: '/',
};

export function loginPath() {
  return '/auth/login';
}

export function routeDecision({ user, pending, error, phase, pathname, allowedRoles }) {
  if (phase === 'logging-out') return 'loading';
  if (phase === 'failed') return 'logout-error';
  if (pending) return 'loading';
  if (error) return 'error';
  if (!user) return 'login';
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return 'forbidden';
  }
  if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
    return 'forbidden';
  }
  return 'allow';
}
