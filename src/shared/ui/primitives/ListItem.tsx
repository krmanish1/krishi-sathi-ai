import { View, Text, Pressable, type ViewProps } from "react-native";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  className,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  className?: string;
} & ViewProps) {
  const body = (
    <>
      <View className="flex-1 flex-row items-center gap-3">
        {leading}
        <View>
          <Text className="font-body-semibold text-ink">{title}</Text>
          {subtitle ? (
            <Text className="mt-0.5 font-body text-sm text-ink-muted">{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {trailing}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={clsx(
          "flex-row items-center justify-between border-b border-border/60 py-3",
          className,
        )}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View
      className={clsx(
        "flex-row items-center justify-between border-b border-border/60 py-3",
        className,
      )}
    >
      {body}
    </View>
  );
}
