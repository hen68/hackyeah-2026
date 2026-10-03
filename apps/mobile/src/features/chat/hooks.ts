import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccessibilityInfo } from 'react-native';

import {
  appendText,
  assistantItem,
  fromHistory,
  patchItem,
  removeItem,
  streamingId,
  upsertLast,
  userItem,
  type ChatItem,
  type SendVars,
} from '@/features/chat/thread';
import { CALENDAR_KEY, dayKeys } from '@/features/today/hooks';
import { getChatHistory, streamChatMessage } from '@/lib/api/chat';
import { toUserMessage } from '@/lib/errors';

export const chatKeys = {
  thread: (patientId: string) => ['chat', patientId] as const,
};

export function useChatThread(patientId: string) {
  return useQuery({
    queryKey: chatKeys.thread(patientId),
    queryFn: async () => fromHistory(await getChatHistory(patientId)),
    enabled: patientId !== '',
  });
}

/**
 * Sends one text turn: the patient's bubble shows at once, the reply grows as it streams in and is
 * then replaced by the saved reply, failures stay retryable.
 */
export function useSendChat(patientId: string) {
  const queryClient = useQueryClient();
  const key = chatKeys.thread(patientId);
  const update = (change: (items: ChatItem[]) => ChatItem[]) =>
    queryClient.setQueryData<ChatItem[]>(key, (items = []) => change(items));

  return useMutation({
    scope: { id: `chat-${patientId}` },
    mutationFn: (vars: SendVars) =>
      streamChatMessage({
        message: vars.message,
        inputMode: 'text',
        localDate: vars.localDate,
        onDelta: (text) => update((items) => appendText(items, vars, text)),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      update((items) => upsertLast(items, userItem(vars)));
    },
    onSuccess: (response, vars) => {
      // The final reply is authoritative: it may add a follow-up question or replace unsafe text.
      update((items) => [
        ...patchItem(removeItem(items, streamingId(vars.id)), vars.id, { status: 'sent' }),
        assistantItem(response, vars.localDate),
      ]);
      // The streaming bubble stays silent for screen readers; announce the whole reply once.
      AccessibilityInfo.announceForAccessibility(response.reply);
      // The function may have logged observations on today or another day it inferred.
      const days = new Set([vars.localDate, ...response.observations.flatMap((o) => o.observed_on ?? [])]);
      days.forEach((day) => queryClient.invalidateQueries({ queryKey: dayKeys.detail(day) }));
      queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
    },
    onError: (error, vars) => {
      update((items) =>
        patchItem(removeItem(items, streamingId(vars.id)), vars.id, { status: 'failed', error: toUserMessage(error) }),
      );
    },
  });
}
