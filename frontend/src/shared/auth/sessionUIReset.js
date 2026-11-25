const resetCallbacks = new Set();

export function registerSessionReset(callback) {
  resetCallbacks.add(callback);
  return () => resetCallbacks.delete(callback);
}

export function resetSessionUI() {
  for (const cb of resetCallbacks) {
    try {
      cb();
    } catch {
      // Ignore UI reset errors during session transitions
    }
  }
}
