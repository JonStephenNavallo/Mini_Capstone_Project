import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api.js';

export const LNF_KEYS = {
  publicItems: (params) => ['lostFound', 'publicItems', params],
  publicItemDetail: (id) => ['lostFound', 'publicItemDetail', id],
  adminItems: (params) => ['lostFound', 'adminItems', params],
  lostReports: (params) => ['lostFound', 'lostReports', params],
  myRecords: ['lostFound', 'myRecords'],
  claimTickets: ['lostFound', 'claimTickets'],
  categories: ['lostFound', 'categories'],
  locations: ['lostFound', 'locations'],
  leaderboard: ['lostFound', 'leaderboard'],
  analytics: ['lostFound', 'analytics'],
  config: ['lostFound', 'config'],
  notifications: ['notifications', 'list'],
};

export function useCategories() {
  return useQuery({
    queryKey: LNF_KEYS.categories,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/categories/?all=true');
      return data;
    },
    staleTime: 60000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: LNF_KEYS.locations,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/locations/?all=true');
      return data;
    },
    staleTime: 60000,
  });
}

export function usePortalConfig() {
  return useQuery({
    queryKey: LNF_KEYS.config,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/config/');
      return data;
    },
    staleTime: 60000,
  });
}

// Revalidate on window focus; real-time cross-device updates are pushed via SSE
// (`/api/notifications/stream/`) rather than continuous HTTP short polling.
const LIVE_SYNC_QUERY_OPTIONS = {
  refetchOnWindowFocus: true,
};

export function usePublicFoundItems(params = {}) {
  return useQuery({
    queryKey: LNF_KEYS.publicItems(params),
    queryFn: async () => {
      const { data } = await api.get('/lost-found/items/', { params });
      return data;
    },
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function usePublicFoundItemDetail(id) {
  return useQuery({
    queryKey: LNF_KEYS.publicItemDetail(id),
    queryFn: async () => {
      const { data } = await api.get(`/lost-found/items/${id}/`);
      return data;
    },
    enabled: Boolean(id),
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useReportFoundItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/lost-found/report-found/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
    },
  });
}

export function useLostReports(params = {}) {
  return useQuery({
    queryKey: LNF_KEYS.lostReports(params),
    queryFn: async () => {
      const { data } = await api.get('/lost-found/lost-reports/', { params });
      return data;
    },
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useMyActivityRecords(enabled = true) {
  return useQuery({
    queryKey: LNF_KEYS.myRecords,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/my-records/');
      return data;
    },
    enabled,
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useCreateLostReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/lost-found/lost-reports/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound', 'lostReports'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useMatchFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, feedback }) => {
      const { data } = await api.post(`/lost-found/lost-reports/match-feedback/${matchId}/`, {
        student_feedback: feedback,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound', 'lostReports'] });
    },
  });
}

export function useCloseLostReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId) => {
      const { data } = await api.post(`/lost-found/lost-reports/${reportId}/close/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound', 'lostReports'] });
    },
  });
}

export function useDeleteLostReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reportId) => {
      await api.delete(`/lost-found/lost-reports/${reportId}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound', 'lostReports'] });
    },
  });
}

export function useClaimTickets(enabled = true) {
  return useQuery({
    queryKey: LNF_KEYS.claimTickets,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/claim-tickets/');
      return data;
    },
    enabled,
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useGenerateClaimTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (foundItemId) => {
      const { data } = await api.post('/lost-found/claim-tickets/', { found_item: foundItemId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LNF_KEYS.claimTickets });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: LNF_KEYS.leaderboard,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/leaderboard/');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useQrLookup() {
  return useMutation({
    mutationFn: async (code) => {
      const { data } = await api.get('/lost-found/qr-lookup/', { params: { code } });
      return data;
    },
  });
}

// --- OSAS Admin Hooks ---
export function useAdminAnalytics(enabled = true) {
  return useQuery({
    queryKey: LNF_KEYS.analytics,
    queryFn: async () => {
      const { data } = await api.get('/lost-found/admin/analytics/');
      return data;
    },
    enabled,
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useAdminFoundItems(params = {}) {
  return useQuery({
    queryKey: LNF_KEYS.adminItems(params),
    queryFn: async () => {
      const { data } = await api.get('/lost-found/admin/items/', { params });
      return data;
    },
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useAdminCreateFoundItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const { data } = await api.post('/lost-found/admin/items/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useAdminUpdateFoundItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch(`/lost-found/admin/items/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useAdminDeleteFoundItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/lost-found/admin/items/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useApproveIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, storage_shelf_bin, secret_identifiers }) => {
      const { data } = await api.post(`/lost-found/admin/items/${id}/approve-intake/`, {
        storage_shelf_bin,
        secret_identifiers,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useProcessWalkInClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, formData }) => {
      const { data } = await api.post(`/lost-found/admin/items/${itemId}/process-claim/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useVoidMistakenClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, voidReason }) => {
      const { data } = await api.post(`/lost-found/admin/items/${itemId}/void-claim/`, {
        void_reason: voidReason,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lostFound'] });
      qc.invalidateQueries({ queryKey: LNF_KEYS.notifications });
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/lost-found/categories/', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.categories }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch(`/lost-found/categories/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LNF_KEYS.categories });
      qc.invalidateQueries({ queryKey: ['lostFound'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/lost-found/categories/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LNF_KEYS.categories });
    },
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/lost-found/locations/', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.locations }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await api.patch(`/lost-found/locations/${id}/`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LNF_KEYS.locations });
      qc.invalidateQueries({ queryKey: ['lostFound'] });
    },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/lost-found/locations/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LNF_KEYS.locations });
    },
  });
}

export function useUpdatePortalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.patch('/lost-found/config/', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.config }),
  });
}

// --- Notifications ---
export function useNotificationsList(enabled = false, userId = null) {
  return useQuery({
    // Scope cache key by userId so switching between Student and Admin accounts never displays stale alerts
    queryKey: [...LNF_KEYS.notifications, userId || 'anon'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/');
      return data;
    },
    enabled: Boolean(enabled && userId),
    ...LIVE_SYNC_QUERY_OPTIONS,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/notifications/${id}/read/`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/notifications/read-all/');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.notifications }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/notifications/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.notifications }),
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/notifications/clear/');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LNF_KEYS.notifications }),
  });
}
