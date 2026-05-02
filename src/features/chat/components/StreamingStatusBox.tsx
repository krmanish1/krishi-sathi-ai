import { useMemo, useState, type ComponentProps } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Markdown from "react-native-markdown-display";
import type { MarkdownProps } from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { titleAndSubtitleFromStageData } from "../formatStagePayload";
import { buildThinkingSteps, iconForStage, type StageEvent } from "../thinkingStages";
import type { StreamPhase } from "../useStreamChatMessage";

/** Title case for stage labels (routing → Routing) without forcing English grammar on full sentences. */
function formatStageLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return raw;
  const lower = t.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export type StreamingStatusBoxProps = {
  phase: StreamPhase;
  text: string;
  /** Optional AI SDK `reasoning` UI parts (chain-of-thought). */
  reasoningText?: string;
  /** Full payloads from each `data-stage` SSE event (server-driven labels and detail). */
  stageEvents?: StageEvent[];
  mdStyles: NonNullable<MarkdownProps["style"]>;
  isStreaming: boolean;
};

export function StreamingStatusBox({
  phase,
  text,
  reasoningText = "",
  stageEvents,
  mdStyles,
  isStreaming,
}: StreamingStatusBoxProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const steps = useMemo(
    () => buildThinkingSteps(stageEvents, phase, isStreaming),
    [stageEvents, phase, isStreaming],
  );

  const reasoning = reasoningText.trim();
  const answer = text.trim();
  const hasTimeline = steps.length > 0;
  const hasDetails = hasTimeline || reasoning.length > 0 || answer.length > 0;

  return (
    <View className="mb-4 w-full">
      <View className="overflow-hidden rounded-3xl rounded-bl-lg bg-muted" style={styles.cardShadow}>
        {/* Header — status orb + title + collapse */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? t("chat.streamCollapse") : t("chat.streamExpand")}
          onPress={() => hasDetails && setExpanded((e) => !e)}
          disabled={!hasDetails}
          className="flex-row items-center gap-3 px-4 py-3.5"
          style={styles.headerInset}
        >
          <View style={[styles.statusOrb, !isStreaming ? styles.statusOrbComplete : null]}>
            {isStreaming ? (
              <ActivityIndicator size="small" color="#1ed760" />
            ) : (
              <MaterialCommunityIcons name="check" size={18} color="#000000" />
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-display text-[15px] font-bold text-ink" numberOfLines={1}>
              {t("chat.thinkingTitle")}
            </Text>
            {isStreaming ? (
              <Text className="mt-0.5 font-body text-[11px] text-ink-muted" numberOfLines={1}>
                {t("chat.thinkingProgressHint")}
              </Text>
            ) : null}
          </View>
          {hasDetails ? (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-ink/8">
              <MaterialCommunityIcons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={22}
                color="#b3b3b3"
              />
            </View>
          ) : null}
        </Pressable>

        {expanded && hasDetails ? (
          <View className="border-t border-white/[0.08] bg-card/80 px-4 pb-4 pt-4">
            {reasoning.length > 0 ? (
              <View className="mb-5">
                <Text className="mb-2 font-body text-[10px] font-semibold uppercase tracking-[1.4px] text-ink-muted">
                  {t("chat.thinkingChainTitle")}
                </Text>
                <Text className="font-body text-sm italic leading-relaxed text-ink-soft">{reasoning}</Text>
              </View>
            ) : null}

            {hasTimeline ? (
              <View className={reasoning.length > 0 ? "mb-5" : "mb-1"}>
                {steps.map((step, index) => {
                  const { title, subtitle } = titleAndSubtitleFromStageData(step.data);
                  return (
                    <ThinkingTimelineRow
                      key={`stage-${index}`}
                      title={formatStageLabel(title)}
                      description={subtitle}
                      icon={iconForStage(step.knownStage)}
                      showConnector={index < steps.length - 1}
                      active={step.active}
                      done={step.done}
                    />
                  );
                })}
              </View>
            ) : null}

            {answer.length > 0 ? (
              <View>
                <Text className="mb-2 font-body text-[10px] font-semibold uppercase tracking-[1.4px] text-ink-muted">
                  {t("chat.thinkingDraftAnswer")}
                </Text>
                <Markdown style={mdStyles}>{text}</Markdown>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ThinkingTimelineRow({
  title,
  description,
  icon,
  showConnector,
  active,
  done,
}: {
  title: string;
  description: string;
  icon: string;
  showConnector: boolean;
  active: boolean;
  done: boolean;
}) {
  const pending = !active && !done;
  const iconBg = active ? "#1ed760" : "#2a2a2a";
  const iconFg = active ? "#000000" : pending ? "#737373" : "#b3b3b3";
  const borderStyle = active
    ? { borderWidth: 0 }
    : { borderWidth: 1.5, borderColor: pending ? "#3f3f3f" : "#525252" };

  return (
    <View className="flex-row">
      <View className="items-center" style={{ width: 40 }}>
        <View style={[styles.iconCircle, borderStyle, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons
            name={icon as ComponentProps<typeof MaterialCommunityIcons>["name"]}
            size={18}
            color={iconFg}
          />
        </View>
        {showConnector ? <View style={styles.connector} /> : null}
      </View>
      <View className="min-w-0 flex-1 pb-1 pl-1">
        <View
          style={[
            styles.rowBody,
            active ? styles.rowBodyActive : null,
            !description ? styles.rowBodySingle : null,
          ]}
        >
          <Text className="font-body text-[14px] font-bold leading-5 text-ink">{title}</Text>
          {description ? (
            <Text className="mt-1 font-body text-[12px] leading-[17px] text-ink-muted" numberOfLines={4}>
              {description}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 6,
  },
  headerInset: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  statusOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOrbComplete: {
    backgroundColor: "#1ed760",
    borderColor: "rgba(0,0,0,0.12)",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    width: 2,
    flexGrow: 1,
    minHeight: 18,
    marginTop: 5,
    marginBottom: 3,
    borderRadius: 1,
    backgroundColor: "#3a3a3a",
    alignSelf: "center",
    opacity: 0.85,
  },
  rowBody: {
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  rowBodyActive: {
    backgroundColor: "rgba(30, 215, 96, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(30, 215, 96, 0.22)",
  },
  rowBodySingle: {
    paddingVertical: 8,
  },
});
