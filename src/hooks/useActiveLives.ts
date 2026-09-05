import { getActiveLives } from '@/utils/live';
import { useQuery } from '@tanstack/react-query';

export function useActiveLives(enabled = true) {
    return useQuery({
        queryKey: ['live', 'active'],
        queryFn: getActiveLives,
        enabled,
        staleTime: 15000,
        refetchInterval: 30000,
        retry: 1,
    });
}
