import { create } from 'zustand';
import { registerSessionReset } from '../../../shared/auth/sessionUIReset.js';

const initialState = {
  selectedItemId: null,
  qrScannerOpen: false,
  qrScannerMode: 'lookup', // 'lookup' | 'claim_counter'
  qrPrintPayload: null, // { title, subtitle, code, hint }
  walkInIntakeOpen: false,
};

export const useLostFoundUiStore = create((set) => ({
  ...initialState,
  openItemDetail: (itemId) => set({ selectedItemId: itemId }),
  closeItemDetail: () => set({ selectedItemId: null }),
  openQrScanner: (mode = 'lookup') => set({ qrScannerOpen: true, qrScannerMode: mode }),
  closeQrScanner: () => set({ qrScannerOpen: false }),
  openQrPrint: (payload) => set({ qrPrintPayload: payload }),
  closeQrPrint: () => set({ qrPrintPayload: null }),
  openWalkInIntake: () => set({ walkInIntakeOpen: true }),
  closeWalkInIntake: () => set({ walkInIntakeOpen: false }),
  resetUi: () => set(initialState),
}));

registerSessionReset(() => {
  useLostFoundUiStore.getState().resetUi();
});
