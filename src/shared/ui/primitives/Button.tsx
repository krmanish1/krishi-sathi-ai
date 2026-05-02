import { Pressable, Text, type PressableProps } from "react-native";
import type { ReactNode } from "react";
import { clsx } from "clsx";

export type ButtonProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  textClassName?: string;
};

/**
 * Spotify-style pills: full radius, uppercase labels with tracking on primary.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  textClassName,
  disabled,
  ...rest
}: ButtonProps) {
  const h = size === "lg" ? "min-h-[56px] px-10" : "min-h-[48px] px-6";
  const base = clsx(
    "items-center justify-center rounded-full",
    h,
    variant === "primary" &&
      "bg-brand shadow-card active:opacity-90 dark:active:opacity-90",
    variant === "secondary" &&
      "border border-border-light bg-transparent active:bg-card-mid/80",
    variant === "ghost" && "bg-transparent",
    disabled && "opacity-50",
    className,
  );
  const tc = clsx(
    "font-body-semibold uppercase tracking-button",
    size === "lg" ? "text-sm" : "text-xs",
    variant === "primary" && "text-on-brand",
    (variant === "secondary" || variant === "ghost") && "text-ink",
    textClassName,
  );
  return (
    <Pressable accessibilityRole="button" className={base} disabled={disabled} {...rest}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text className={tc}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
