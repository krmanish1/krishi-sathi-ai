import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useVoiceSessionStore } from "../useVoiceSessionStore";
import { VoiceWaveform } from "./VoiceWaveform";

type Props = {
  onStop: () => void;
};

export function VoiceSessionSheet({ onStop }: Props) {
  const { t } = useTranslation();
  const { phase, transcriptMessages, errorMessage } = useVoiceSessionStore();
  const visible = phase !== "idle";

  const phaseLabel = (() => {
    switch (phase) {
      case "connecting":
        return t("voice.connecting");
      case "listening":
        return t("voice.listening");
      case "speaking":
        return t("voice.speaking");
      case "error":
        return errorMessage ?? t("voice.error.unavailable");
      default:
        return "";
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onStop}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.phaseRow}>
            {phase === "speaking" && (
              <VoiceWaveform active color="#4CAF50" />
            )}
            <Text style={styles.phaseLabel}>{phaseLabel}</Text>
          </View>

          {transcriptMessages.length > 0 ? (
            <View style={styles.transcriptBox}>
              {transcriptMessages.map((msg) => (
                <Text
                  key={msg.id}
                  style={msg.role === "user" ? styles.transcriptUser : styles.transcriptAgent}
                >
                  {msg.role === "user" ? "🎤" : "🤖"} {msg.text}
                </Text>
              ))}
            </View>
          ) : null}

          <Pressable
            style={styles.stopButton}
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={t("voice.endSession")}
          >
            <Text style={styles.stopButtonText}>{t("voice.endSession")}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  phaseLabel: {
    color: "#E0E0E0",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  transcriptBox: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  transcriptUser: {
    color: "#90CAF9",
    fontSize: 14,
  },
  transcriptAgent: {
    color: "#A5D6A7",
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: "#C62828",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  stopButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
