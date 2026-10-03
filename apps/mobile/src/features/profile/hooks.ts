import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getProfile, updateProfile, type Profile, type ProfilePatch } from '@/lib/api/profile';
import { connectWearable, disconnectWearable, listWearableConnections } from '@/lib/api/wearables';

export const profileKeys = {
  detail: (userId: string) => ['profile', userId] as const,
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: () => getProfile(userId as string),
    enabled: userId !== undefined,
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(userId, patch),
    onSuccess: (profile: Profile) => queryClient.setQueryData(profileKeys.detail(userId), profile),
  });
}

const wearableKey = (patientId: string) => ['wearable-connections', patientId] as const;

export function useWearableConnections(patientId: string) {
  return useQuery({ queryKey: wearableKey(patientId), queryFn: () => listWearableConnections(patientId) });
}

export function useToggleWearable(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, isConnected }: { provider: string; isConnected: boolean }) =>
      isConnected ? disconnectWearable(patientId, provider) : connectWearable(patientId, provider),
    onSettled: () => queryClient.invalidateQueries({ queryKey: wearableKey(patientId) }),
  });
}
