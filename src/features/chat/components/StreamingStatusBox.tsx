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
              <ActivityIndicator size="small" color="#00ED64" />
            ) : (
              <MaterialCommunityIcons name="check" size={18} color="#001E2B" />
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
                color="#5C6C75"
              />
            </View>
          ) : null}
        </Pressable>

        {expanded && hasDetails ? (
          <View className="border-t border-border bg-muted px-4 pb-4 pt-4">
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
  const iconBg = active ? "#00ED64" : "#F3F6F4";
  const iconFg = active ? "#001E2B" : pending ? "#8997A0" : "#5C6C75";
  const borderStyle = active
    ? { borderWidth: 0 }
    : { borderWidth: 1.5, borderColor: pending ? "#E8EDEB" : "#C8D5D1" };

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
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  headerInset: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,30,43,0.1)",
  },
  statusOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FBFA",
    borderWidth: 1,
    borderColor: "rgba(0,30,43,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusOrbComplete: {
    backgroundColor: "#00ED64",
    borderColor: "rgba(0,30,43,0.12)",
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
    backgroundColor: "#E8EDEB",
    alignSelf: "center",
    opacity: 1,
  },
  rowBody: {
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  rowBodyActive: {
    backgroundColor: "rgba(0, 237, 100, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 237, 100, 0.3)",
  },
  rowBodySingle: {
    paddingVertical: 8,
  },
});
