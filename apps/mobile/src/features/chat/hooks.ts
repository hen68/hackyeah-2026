import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

import { revealSteps, type RevealStep } from '@/features/chat/reveal';
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
import { getChatHistory, streamChatMessage, type ChatResponse } from '@/lib/api/chat';
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

type Reveal = { timer: ReturnType<typeof setTimeout>; finish: () => void };

async function shouldAnimate(): Promise<boolean> {
  try {
    return !(await AccessibilityInfo.isReduceMotionEnabled());
  } catch {
    return false;
  }
}

/**
 * Sends one text turn: the patient's bubble shows at once, the reply grows as it streams in, the
 * held-back rest is typed out, then the saved reply (with chips) takes its place. Failures stay retryable.
 */
export function useSendChat(patientId: string) {
  const queryClient = useQueryClient();
  const key = chatKeys.thread(patientId);
  const reveal = useRef<Reveal | null>(null);
  const isMounted = useRef(true);
  const update = (change: (items: ChatItem[]) => ChatItem[]) =>
    queryClient.setQueryData<ChatItem[]>(key, (items = []) => change(items));

  // Leaving the screen skips the rest of the reveal but still leaves the final reply in the cache.
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (!reveal.current) return;
      clearTimeout(reveal.current.timer);
      reveal.current.finish();
    };
  }, []);

  const finalize = (response: ChatResponse, vars: SendVars) => {
    reveal.current = null;
    update((items) => [...removeItem(items, streamingId(vars.id)), assistantItem(response, vars.localDate)]);
    // The streaming bubble stays silent for screen readers; announce the whole reply once.
    AccessibilityInfo.announceForAccessibility(response.reply);
    // The function may have logged observations on today or another day it inferred.
    const days = new Set([vars.localDate, ...response.observations.flatMap((o) => o.observed_on ?? [])]);
    days.forEach((day) => queryClient.invalidateQueries({ queryKey: dayKeys.detail(day) }));
    queryClient.invalidateQueries({ queryKey: CALENDAR_KEY });
  };

  // Shows each step in the streaming bubble, then finalizes. Resolves once the reply is final.
  const typeOut = (steps: readonly RevealStep[], response: ChatResponse, vars: SendVars) =>
    new Promise<void>((resolve) => {
      const replyId = streamingId(vars.id);
      const finish = () => {
        finalize(response, vars);
        resolve();
      };
      const show = (index: number) => {
        const step = steps[index];
        if (!step) return finish();
        update((items) => patchItem(items, replyId, { content: step.content }));
        reveal.current = { timer: setTimeout(() => show(index + 1), step.delayMs), finish };
      };
      update((items) => appendText(items, vars, ''));
      show(0);
    });

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
    onSuccess: async (response, vars) => {
      update((items) => patchItem(items, vars.id, { status: 'sent' }));
      const shown =
        queryClient.getQueryData<ChatItem[]>(key)?.find((item) => item.id === streamingId(vars.id))?.content ?? '';
      // The final reply is authoritative: it may add the held-back rest or replace unsafe text.
      const steps = revealSteps(shown, response.reply, response.replace === true);
      const canType = steps !== null && steps.length > 0 && (await shouldAnimate()) && isMounted.current;
      if (canType) return typeOut(steps, response, vars);
      finalize(response, vars);
    },
    onError: (error, vars) => {
      update((items) =>
        patchItem(removeItem(items, streamingId(vars.id)), vars.id, { status: 'failed', error: toUserMessage(error) }),
      );
    },
  });
}
