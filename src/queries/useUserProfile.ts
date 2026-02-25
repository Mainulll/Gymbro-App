import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Example TanStack Query hook that fetches the signed-in user's profile
 * from the `profiles` table in Supabase.
 *
 * Usage:
 *   const { data, isLoading, error } = useUserProfile(userId);
 */
export function useUserProfile(userId: string | null) {
  return useQuery<UserProfile>({
    queryKey: ['supabase', 'profiles', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
