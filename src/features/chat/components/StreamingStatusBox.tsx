import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import type { MarkdownProps } from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { BackendStage, StreamPhase } from "../useStreamChatMessage";

export type StreamingStatusBoxProps = {
  phase: StreamPhase;
  text: string;
  stageHistory?: BackendStage[];
  mdStyles: NonNullable<MarkdownProps["style"]>;
};

export function StreamingStatusBox({ phase, text, stageHistory, mdStyles }: StreamingStatusBoxProps) {
  const { t } = useTranslation();
  // Default expanded so user immediately sees what's happening.
  const [expanded, setExpanded] = useState(true);

  const label = useMemo(() => {
    switch (phase) {
      case "routing":
        return t("chat.statusRouting");
      case "planning":
        return t("chat.statusPlanning");
      case "tools":
        return t("chat.statusTools");
      case "synthesizing":
        return t("chat.statusSynthesizing");
      case "clarify":
        return t("chat.statusClarify");
      default:
        return "";
    }
  }, [phase, t]);

  const hasAnyDetails = (stageHistory?.length ?? 0) > 0 || text.trim().length > 0;

  return (
    <View className="mb-4 max-w-[92%] self-start">
      <View
        className="rounded-2xl rounded-bl-none border border-border bg-card px-4 py-3"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View style={styles.dotOuter}>
            <View style={styles.dotInner} />
          </View>
          <Text className="flex-1 font-body text-sm text-ink">{label}</Text>
          {hasAnyDetails ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? t("chat.streamCollapse") : t("chat.streamExpand")}
              hitSlop={8}
              onPress={() => setExpanded((e) => !e)}
            >
              <MaterialCommunityIcons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          ) : null}
        </View>

        {expanded && hasAnyDetails ? (
          <View className="mt-3 border-t border-border/60 pt-3">
            {(stageHistory?.length ?? 0) > 0 ? (
              <View className="mb-2">
                <Text className="font-body text-xs text-ink-muted">
                  {(stageHistory ?? []).join(" → ")}
                </Text>
              </View>
            ) : null}
            {text.trim().length > 0 ? <Markdown style={mdStyles}>{text}</Markdown> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dotOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0D631B",
  },
});
