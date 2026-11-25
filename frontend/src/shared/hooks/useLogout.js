import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logoutSession } from '../auth/sessionApi.js';

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logoutSession(queryClient),
  });
}
