import { router } from 'expo-router';
import { useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Icon } from '@/components/ui/icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '@/features/auth/auth-provider';
import { ChatBubble, TypingBubble } from '@/features/chat/chat-bubble';
import { useChatThread, useSendChat } from '@/features/chat/hooks';
import type { ChatItem } from '@/features/chat/thread';
import { useVoiceInput } from '@/features/chat/use-voice-input';
import { VoiceButton } from '@/features/chat/voice-button';
import { useSymptomCatalog } from '@/features/today/hooks';
import { toLocalDateString } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import { colors, radii, spacing, type } from '@/theme/tokens';

const MAX_MESSAGE_LENGTH = 4000;
const AVATAR_SIZE = 48;
const AVATAR_ICON = 28;
const AVATAR_STROKE = 1.6;
const SEND_SIZE = 52;
const SEND_ICON = 22;
const INPUT_HEIGHT = 52;
const INPUT_MAX_HEIGHT = 140;
const WELCOME = 'Hi, I’m Digna. How are you feeling today?';
const DISCLAIMER = 'Digna doesn’t give medical advice. Talk to your doctor about treatment.';

let localIdCounter = 0;
const nextLocalId = () => `local-${Date.now()}-${(localIdCounter += 1)}`;

/** Artboard Chat. Type or tap the mic to dictate; dictated drafts are sent as voice. */
export default function ChatScreen() {
  const { session } = useAuth();
  const patientId = session?.user.id ?? '';
  const thread = useChatThread(patientId);
  const send = useSendChat(patientId);
  const catalog = useSymptomCatalog();
  const scrollRef = useRef<ScrollView>(null);
  const voice = useVoiceInput();
  const { draft, setDraft } = voice;

  const labelFor = (code: string) => catalog.data?.find((item) => item.code === code)?.label ?? code;
  const message = draft.trim();
  // Sending before history loads would overwrite the cached thread with just the new bubble.
  const canSend = message.length > 0 && !send.isPending && thread.isSuccess;

  const handleSend = () => {
    if (!canSend) return;
    send.mutate({ id: nextLocalId(), message, localDate: toLocalDateString(), inputMode: voice.inputMode });
    setDraft('');
  };
  const handleRetry = (item: ChatItem) =>
    send.mutate({ id: item.id, message: item.content, localDate: item.localDate, inputMode: item.inputMode });

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <BackButton variant="plain" />
        <View style={styles.avatar}>
          <Icon name="smile" size={AVATAR_ICON} strokeWidth={AVATAR_STROKE} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Talk to Digna
        </Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {thread.error ? (
            <View style={styles.status}>
              <Text accessibilityRole="alert" style={styles.statusText}>
                {toUserMessage(thread.error)}
              </Text>
              <PrimaryButton label="Try again" onPress={() => thread.refetch()} />
            </View>
          ) : !thread.data ? (
            <ActivityIndicator accessibilityLabel="Loading your chat" color={colors.accent} style={styles.status} />
          ) : (
            <>
              {thread.data.length === 0 && (
                <View style={styles.welcome}>
                  <Text style={styles.statusText}>{WELCOME}</Text>
                </View>
              )}
              {thread.data.map((item) => (
                <ChatBubble
                  key={item.id}
                  item={item}
                  labelFor={labelFor}
                  onRetry={handleRetry}
                  onChangeDay={(date) => router.push(`/day/${date}`)}
                />
              ))}
              {send.isPending && <TypingBubble />}
            </>
          )}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
          <View style={styles.voiceRow}>
            <VoiceButton status={voice.status} level={voice.level} label={voice.label} onPress={voice.toggle} />
            <Text accessibilityLiveRegion="polite" style={styles.voiceLabel}>
              {voice.label}
            </Text>
          </View>
          <View style={styles.inputBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Or type here"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Type a message"
              maxLength={MAX_MESSAGE_LENGTH}
              multiline
              style={styles.input}
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              style={[styles.send, !canSend && styles.sendDisabled]}>
              <Icon name="send" size={SEND_ICON} strokeWidth={2.4} color={colors.accent} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appBackground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.heroGradient[0]} 0%, ${colors.heroGradient[1]} 100%)`,
  },
  title: { ...type.heading, color: colors.text },
  thread: { padding: spacing.lg, gap: 14, flexGrow: 1 },
  status: { marginTop: spacing.xxl, gap: spacing.md },
  statusText: { ...type.body, color: colors.text },
  welcome: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md, gap: spacing.sm },
  disclaimer: { ...type.chip, color: colors.textMuted, textAlign: 'center' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  voiceLabel: { ...type.label, color: colors.text, flexShrink: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.option,
    padding: spacing.xxs,
    paddingLeft: 18,
  },
  input: {
    flex: 1,
    minHeight: INPUT_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
    paddingTop: 14,
    paddingBottom: 14,
    ...type.body,
    color: colors.text,
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    backgroundColor: colors.softPinkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
