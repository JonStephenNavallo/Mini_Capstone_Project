import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

import api from '../src/services/api.js';
import { ROLE_HOME, loginPath, routeDecision } from '../src/shared/auth/routePolicy.js';
import {
  clearSessionState,
  getSessionPhase,
  getSessionSignal,
  performLogout,
  setSessionPhase,
} from '../src/shared/auth/sessionBoundary.js';
import { registerSessionReset } from '../src/shared/auth/sessionUIReset.js';
import {
  CURRENT_USER_KEY,
  performLogin,
  readSession,
  watchOtherSessions,
} from '../src/shared/auth/sessionApi.js';

function createMockWindow() {
  const listeners = new Map();
  const storage = new Map();
  let reloadCount = 0;
  let replacedPath = null;

  const mockWindow = {
    location: {
      reload() {
        reloadCount += 1;
      },
      replace(path) {
        replacedPath = path;
      },
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type, event) {
      for (const fn of listeners.get(type) ?? []) {
        fn(event);
      }
    },
    get reloadCount() {
      return reloadCount;
    },
    get replacedPath() {
      return replacedPath;
    },
  };

  const mockStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  };

  return { mockWindow, mockStorage };
}

let originalAdapter;
let originalWindow;
let originalLocalStorage;

beforeEach(() => {
  originalAdapter = api.defaults.adapter;
  originalWindow = globalThis.window;
  originalLocalStorage = globalThis.localStorage;
  setSessionPhase('ready');
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalLocalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalLocalStorage;
  }
  setSessionPhase('ready');
});

test('routePolicy enforces authentication and Admin vs Student boundaries', () => {
  assert.equal(ROLE_HOME.ADMIN, '/admin/dashboard');
  assert.equal(ROLE_HOME.STUDENT, '/');
  assert.equal(loginPath(), '/auth/login');

  assert.equal(
    routeDecision({ user: null, pending: false, error: null, phase: 'logging-out', pathname: '/' }),
    'loading',
  );
  assert.equal(
    routeDecision({ user: null, pending: false, error: null, phase: 'failed', pathname: '/' }),
    'logout-error',
  );
  assert.equal(
    routeDecision({ user: null, pending: true, error: null, phase: 'ready', pathname: '/' }),
    'loading',
  );
  assert.equal(
    routeDecision({ user: null, pending: false, error: new Error('boom'), phase: 'ready', pathname: '/' }),
    'error',
  );
  assert.equal(
    routeDecision({ user: null, pending: false, error: null, phase: 'ready', pathname: '/explore' }),
    'login',
  );

  const student = { id: 2, role: 'STUDENT', is_active: true };
  const admin = { id: 1, role: 'ADMIN', is_active: true };

  assert.equal(
    routeDecision({ user: student, pending: false, error: null, phase: 'ready', pathname: '/admin/dashboard' }),
    'forbidden',
  );
  assert.equal(
    routeDecision({
      user: student,
      pending: false,
      error: null,
      phase: 'ready',
      pathname: '/custom',
      allowedRoles: ['ADMIN'],
    }),
    'forbidden',
  );
  assert.equal(
    routeDecision({ user: student, pending: false, error: null, phase: 'ready', pathname: '/explore' }),
    'allow',
  );
  assert.equal(
    routeDecision({ user: admin, pending: false, error: null, phase: 'ready', pathname: '/admin/dashboard' }),
    'allow',
  );
});

test('clearSessionState aborts active signal, clears query cache, and runs registered UI resets', async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['lostFound', 'items'], [{ id: 10 }]);

  const priorSignal = getSessionSignal();
  assert.equal(priorSignal.aborted, false);

  let resetCalls = 0;
  const unregister = registerSessionReset(() => {
    resetCalls += 1;
  });

  await clearSessionState(queryClient, 'ending');

  assert.equal(getSessionPhase(), 'ending');
  assert.equal(priorSignal.aborted, true);
  assert.equal(getSessionSignal().aborted, false);
  assert.notEqual(getSessionSignal(), priorSignal);
  assert.equal(queryClient.getQueryData(['lostFound', 'items']), undefined);
  assert.equal(resetCalls, 1);

  unregister();
  await clearSessionState(queryClient, 'ready');
  assert.equal(resetCalls, 1);
});

test('performLogout clears cache, announces session change, and navigates on success', async () => {
  const { mockStorage } = createMockWindow();
  globalThis.localStorage = mockStorage;

  const queryClient = new QueryClient();
  queryClient.setQueryData(CURRENT_USER_KEY, { id: 1, role: 'ADMIN' });

  let logoutRequested = false;
  let navigatedTo = null;

  await performLogout({
    queryClient,
    requestLogout: async () => {
      assert.equal(getSessionPhase(), 'logging-out');
      logoutRequested = true;
    },
    readSession: async () => null,
    navigate: (dest) => {
      navigatedTo = dest;
    },
    destination: '/auth/login',
  });

  assert.equal(logoutRequested, true);
  assert.equal(getSessionPhase(), 'ready');
  assert.equal(navigatedTo, '/auth/login');
  assert.equal(queryClient.getQueryData(CURRENT_USER_KEY), undefined);
  assert.ok(mockStorage.getItem('lnf-session-change'));
});

test('performLogout marks session failed when logout fails and server session is still active', async () => {
  const queryClient = new QueryClient();
  let navigated = false;

  await assert.rejects(
    performLogout({
      queryClient,
      requestLogout: async () => {
        throw new Error('Network error');
      },
      readSession: async () => ({ id: 1, role: 'ADMIN' }),
      navigate: () => {
        navigated = true;
      },
      destination: '/auth/login',
    }),
    /Network error/,
  );

  assert.equal(getSessionPhase(), 'failed');
  assert.equal(navigated, false);
});

test('performLogin verifies session before navigating and populates current user cache', async () => {
  const { mockStorage } = createMockWindow();
  globalThis.localStorage = mockStorage;

  const queryClient = new QueryClient();
  queryClient.setQueryData(['stale'], 'old-account-data');

  const adminUser = { id: 7, role: 'ADMIN', is_active: true };
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/auth/me/');
    return { data: adminUser, status: 200, statusText: 'OK', headers: {}, config };
  };

  let navArgs = null;
  const result = await performLogin({
    queryClient,
    authenticate: async () => {},
    navigate: (dest, opts) => {
      navArgs = { dest, opts };
    },
  });

  assert.deepEqual(result, adminUser);
  assert.equal(queryClient.getQueryData(['stale']), undefined);
  assert.deepEqual(queryClient.getQueryData(CURRENT_USER_KEY), adminUser);
  assert.deepEqual(navArgs, { dest: '/admin/dashboard', opts: { replace: true } });
  assert.equal(getSessionPhase(), 'ready');
});

test('performLogin surfaces verification failure and clears current user query', async () => {
  const queryClient = new QueryClient();
  api.defaults.adapter = async (config) => {
    const err = new Error('Unauthorized');
    err.response = { status: 401, data: { detail: 'Not authenticated' } };
    err.config = config;
    throw err;
  };

  let caught = null;
  try {
    await performLogin({
      queryClient,
      authenticate: async () => {},
      navigate: () => {},
    });
  } catch (err) {
    caught = err;
  }

  assert.ok(caught);
  assert.match(caught.userFacingMessage, /Unable to verify your session/i);
  assert.equal(queryClient.getQueryData(CURRENT_USER_KEY), undefined);
  assert.equal(getSessionPhase(), 'ready');
});

test('api client blocks regular requests during session transition while allowing sessionControl', async () => {
  setSessionPhase('logging-out');

  let adapterCalls = 0;
  api.defaults.adapter = async (config) => {
    adapterCalls += 1;
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };

  await assert.rejects(api.get('/lost-found/items/'), /Session is changing/);
  assert.equal(adapterCalls, 0);

  const res = await api.get('/auth/me/', { sessionControl: true });
  assert.equal(res.status, 200);
  assert.equal(adapterCalls, 1);
});

test('api response interceptor normalizes loopback media URLs to root-relative /media paths', async () => {
  api.defaults.adapter = async (config) => ({
    data: {
      photo: 'http://127.0.0.1:8000/media/found_items/wallet.jpg',
      nested: [
        { url: 'http://localhost:8000/media/found_items/keys.png' },
        { url: 'https://tepinn09.pythonanywhere.com/media/found_items/id.jpg' },
      ],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

  const { data } = await api.get('/lost-found/items/');
  assert.equal(data.photo, '/media/found_items/wallet.jpg');
  assert.equal(data.nested[0].url, '/media/found_items/keys.png');
  assert.equal(data.nested[1].url, 'https://tepinn09.pythonanywhere.com/media/found_items/id.jpg');
});

test('readSession returns null on 401/403 and rethrows server errors', async () => {
  api.defaults.adapter = async (config) => {
    const err = new Error('Forbidden');
    err.response = { status: 403 };
    err.config = config;
    throw err;
  };
  assert.equal(await readSession(), null);

  api.defaults.adapter = async (config) => {
    const err = new Error('Server Error');
    err.response = { status: 500 };
    err.config = config;
    throw err;
  };
  await assert.rejects(readSession(), /Server Error/);
});

test('watchOtherSessions reloads and clears cache on cross-tab session change or bfcache restore', async () => {
  const { mockWindow } = createMockWindow();
  globalThis.window = mockWindow;

  const queryClient = new QueryClient();
  queryClient.setQueryData(['lostFound', 'items'], [{ id: 1 }]);

  const cleanup = watchOtherSessions(queryClient);

  mockWindow.dispatch('storage', { key: 'unrelated-key' });
  assert.equal(mockWindow.reloadCount, 0);

  mockWindow.dispatch('storage', { key: 'lnf-session-change' });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(mockWindow.reloadCount, 1);
  assert.equal(queryClient.getQueryData(['lostFound', 'items']), undefined);

  mockWindow.dispatch('pageshow', { persisted: false });
  assert.equal(mockWindow.reloadCount, 1);

  mockWindow.dispatch('pageshow', { persisted: true });
  assert.equal(mockWindow.reloadCount, 2);

  cleanup();
});
