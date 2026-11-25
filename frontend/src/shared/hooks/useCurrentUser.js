import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { currentUserOptions } from '../auth/sessionApi.js';
import { getSessionPhase, subscribeSession } from '../auth/sessionBoundary.js';

export function useCurrentUser() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState(getSessionPhase);

  useEffect(() => {
    return subscribeSession((state) => setPhase(state.phase));
  }, []);

  const query = useQuery(currentUserOptions(queryClient));
  return { ...query, phase };
}
