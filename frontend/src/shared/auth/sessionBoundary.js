import { createStore } from 'zustand/vanilla';
import { resetSessionUI } from './sessionUIReset.js';

const sessionUIStore = createStore(() => ({ phase: 'ready' }));
let controller = new AbortController();

export const getSessionPhase = () => sessionUIStore.getState().phase;
export const subscribeSession = sessionUIStore.subscribe;
export const getSessionSignal = () => controller.signal;

export function setSessionPhase(value) {
  sessionUIStore.setState({ phase: value });
}

export async function clearSessionState(queryClient, phase = 'ending') {
  setSessionPhase(phase);
  controller.abort();
  controller = new AbortController();
  await queryClient.cancelQueries();
  queryClient.clear();
  resetSessionUI();
}

export function announceSessionChange() {
  try {
    globalThis.localStorage?.setItem('lnf-session-change', `${Date.now()}-${Math.random()}`);
  } catch {
    // Storage may be disabled
  }
}

export async function performLogout({ queryClient, requestLogout, readSession, navigate, destination }) {
  await clearSessionState(queryClient, 'logging-out');
  try {
    try {
      await requestLogout();
    } catch (error) {
      if ((await readSession()) !== null) throw error;
    }
    queryClient.clear();
    announceSessionChange();
    setSessionPhase('ready');
    navigate(destination);
  } catch (error) {
    setSessionPhase('failed');
    throw error;
  }
}
