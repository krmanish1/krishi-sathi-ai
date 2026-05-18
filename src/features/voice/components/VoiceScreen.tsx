import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { VoicePhase, VoiceTranscriptMessage } from "../useVoiceSessionStore";
import { useVoiceSessionStore } from "../useVoiceSessionStore";
import type { Language } from "@/shared/config/constants";

const PAGE_BG = "#ECEAE4";
const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const PILL_BG = "#FFFFFF";
const PILL_BORDER = "#E0E5E2";
const PILL_DOT_ACTIVE = "#16A34A";
const PILL_DOT_IDLE = "#A0ADB3";
const CTRL_BG = "#FFFFFF";
const CTRL_BORDER = "#E0E5E2";
const END_BG = "#DC2626";
const USER_BUBBLE_BG = "#cce4cc";
const AGENT_BUBBLE_BG = "#FFFFFF";
const USER_AVATAR_BG = "#2B5E2B";
const AGENT_AVATAR_BG = "#001E2B";

function CtrlBtn({
  icon,
  label,
  size = 56,
  bg = CTRL_BG,
  iconColor = INK_MUTED,
  labelColor = INK_MUTED,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: string;
  label: string;
  size?: number;
  bg?: string;
  iconColor?: string;
  labelColor?: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[ctrlStyles.wrapper, disabled ? { opacity: 0.45 } : null]}>
      <Pressable
        accessibilityRole="button"
        onPress={disabled ? undefined : onPress}
        style={[
          ctrlStyles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          },
          active ? ctrlStyles.btnActive : null,
        ]}
      >
        <MaterialCommunityIcons
          name={icon as never}
          size={size > 60 ? 28 : 22}
          color={iconColor}
        />
      </Pressable>
      <Text style={[ctrlStyles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function Avatar({ role }: { role: "user" | "agent" }) {
  const isUser = role === "user";
  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: isUser ? USER_AVATAR_BG : AGENT_AVATAR_BG },
      ]}
    >
      <MaterialCommunityIcons
        name={isUser ? "account" : "robot"}
        size={18}
        color="#FFFFFF"
      />
    </View>
  );
}

function TranscriptBubble({
  message,
}: {
  message: VoiceTranscriptMessage;
}) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.agentRow]}>
      {!isUser ? (
        <View style={styles.avatarColumn}>
          <Avatar role="agent" />
        </View>
      ) : null}
      <View style={[styles.bubbleWrap, isUser ? styles.userBubbleWrap : styles.agentBubbleWrap]}>
        {isUser ? (
          <View style={styles.userBubble}>
            <Text style={styles.bubbleBody} selectable>
              {message.text}
            </Text>
          </View>
        ) : (
          <BlurView intensity={48} tint="light" style={styles.agentBubble}>
            <Text style={styles.bubbleBody} selectable>
              {message.text}
            </Text>
          </BlurView>
        )}
      </View>
      {isUser ? (
        <View style={styles.avatarColumn}>
          <Avatar role="user" />
        </View>
      ) : null}
    </View>
  );
}

function InterimBubble({ text }: { text: string }) {
  return (
    <View style={[styles.messageRow, styles.userRow]}>
      <View style={[styles.bubbleWrap, styles.userBubbleWrap]}>
        <View style={[styles.userBubble, styles.interimBubble]}>
          <Text style={styles.bubbleBody} selectable>
            {text}
            <Text style={styles.streamCursor}>|</Text>
          </Text>
        </View>
      </View>
      <View style={styles.avatarColumn}>
        <Avatar role="user" />
      </View>
    </View>
  );
}

function EmptyState({ phase, onStart }: { phase: VoicePhase; onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={styles.emptyState}
      onPress={phase === "idle" ? onStart : undefined}
      accessibilityRole={phase === "idle" ? "button" : "none"}
    >
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons
          name="waveform"
          size={48}
          color={INK_MUTED}
        />
      </View>
      <Text style={styles.emptyTitle}>{t("voice.transcriptHint")}</Text>
      <Text style={styles.emptySubtitle}>{t("voice.sessionSubtitle")}</Text>
    </Pressable>
  );
}

export type VoiceScreenProps = {
  phase: VoicePhase;
  muted: boolean;
  speakerOn: boolean;
  language: Language;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  stopping?: boolean;
};

export function VoiceScreen({
  phase,
  muted,
  speakerOn,
  onStart,
  onStop,
  onToggleMute,
  onToggleSpeaker,
  stopping = false,
}: VoiceScreenProps) {
  const { t } = useTranslation();
  const { transcriptMessages, interimUserText, interimAgentText } = useVoiceSessionStore();
  const insets = useSafeAreaInsets();
  const transcriptScrollRef = useRef<ScrollView>(null);

  const isActive = phase !== "idle" && phase !== "error";
  const isMuted = muted && phase === "listening";
  const hasTranscript = transcriptMessages.length > 0;

  useEffect(() => {
    if (transcriptMessages.length > 0 || interimUserText || interimAgentText) {
      transcriptScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [transcriptMessages, interimUserText, interimAgentText]);

  const statusText = (() => {
    switch (phase) {
      case "idle":
        return t("voice.tapToStart");
      case "connecting":
        return t("voice.connecting");
      case "listening":
        return muted ? t("voice.muted") : t("voice.agentListening");
      case "speaking":
        return t("voice.agentSpeaking");
      case "error":
        return t("voice.error.unavailable");
    }
  })();

  const statusDotActive = isActive && !isMuted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.pillWrap}>
        <View style={styles.pill}>
          <View
            style={[
              styles.pillDot,
              { backgroundColor: statusDotActive ? PILL_DOT_ACTIVE : PILL_DOT_IDLE },
            ]}
          />
          <Text style={styles.pillText}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.conversation}>
        <ScrollView
          ref={transcriptScrollRef}
          style={styles.conversationScroll}
          contentContainerStyle={[
            styles.conversationContent,
            !hasTranscript ? styles.conversationEmpty : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!hasTranscript && !interimUserText && !interimAgentText ? (
            <EmptyState phase={phase} onStart={onStart} />
          ) : (
            <>
              {transcriptMessages.map((message) => (
                <TranscriptBubble
                  key={message.id}
                  message={message}
                />
              ))}
              {interimAgentText ? (
                <View style={[styles.messageRow, styles.agentRow]}>
                  <View style={styles.avatarColumn}>
                    <Avatar role="agent" />
                  </View>
                  <View style={[styles.bubbleWrap, styles.agentBubbleWrap]}>
                    <View style={[styles.agentBubble, styles.interimBubble]}>
                      <Text style={styles.bubbleBody} selectable>
                        {interimAgentText}
                        <Text style={styles.streamCursor}>|</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
              {interimUserText ? <InterimBubble text={interimUserText} /> : null}
            </>
          )}
        </ScrollView>
      </View>

      <View
        style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 28) + 12 }]}
      >
        <View style={styles.ctrlWrap}>
          <CtrlBtn
            icon={muted ? "microphone-off" : "microphone"}
            label={t("voice.mute")}
            onPress={onToggleMute}
            active={isMuted}
          />
        </View>

        <View style={styles.ctrlWrap}>
          <CtrlBtn
            icon="phone-hangup"
            label={t("voice.endSession")}
            size={72}
            bg={stopping ? "#9CA3AF" : END_BG}
            iconColor="#FFFFFF"
            labelColor={stopping ? "#9CA3AF" : END_BG}
            onPress={onStop}
            disabled={stopping}
          />
        </View>

        <View style={styles.ctrlWrap}>
          <CtrlBtn
            icon={speakerOn ? "volume-high" : "volume-off"}
            label={t("voice.speaker")}
            onPress={onToggleSpeaker}
            active={!speakerOn}
          />
        </View>
      </View>
    </View>
  );
}

const ctrlStyles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 8,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: CTRL_BORDER,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  btnActive: {
    borderColor: "rgba(220,38,38,0.35)",
    backgroundColor: "rgba(220,38,38,0.08)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  pillWrap: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PILL_BG,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PILL_BORDER,
    paddingHorizontal: 18,
    paddingVertical: 9,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: INK,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  conversation: {
    flex: 1,
    width: "100%",
    minHeight: 0,
  },
  conversationScroll: {
    flex: 1,
  },
  conversationContent: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
  },
  conversationEmpty: {
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: INK,
    textAlign: "center",
    lineHeight: 24,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  messageRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  agentRow: {
    justifyContent: "flex-start",
  },
  avatarColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleWrap: {
    maxWidth: "75%",
  },
  userBubbleWrap: {
    alignItems: "flex-end",
  },
  agentBubbleWrap: {
    alignItems: "flex-start",
  },
  userBubble: {
    backgroundColor: USER_BUBBLE_BG,
    borderRadius: 18,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: "#b8d4b8",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  interimBubble: {
    opacity: 0.8,
    borderStyle: "dashed",
  },
  agentBubble: {
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: "hidden",
    backgroundColor: AGENT_BUBBLE_BG,
  },
  bubbleBody: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: INK,
    lineHeight: 24,
  },
  streamCursor: {
    color: PILL_DOT_ACTIVE,
    fontWeight: "300",
  },
  controls: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 40,
    paddingTop: 4,
    width: "100%",
    flexShrink: 0,
  },
  ctrlWrap: {
    alignItems: "center",
  },
});
