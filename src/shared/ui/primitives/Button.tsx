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
 * Figma-minded primary actions (NativeWind). Used by onboarding and future forms.
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
  const h = size === "lg" ? "min-h-[56px] px-8" : "min-h-[48px] px-6";
  const base = clsx(
    "items-center justify-center rounded-2xl",
    h,
    variant === "primary" && "bg-brand active:opacity-90",
    variant === "secondary" && "border border-primary bg-card",
    variant === "ghost" && "bg-transparent",
    disabled && "opacity-50",
    className,
  );
  const tc = clsx(
    "font-body-semibold",
    size === "lg" ? "text-base" : "text-sm",
    variant === "primary" && "text-white",
    (variant === "secondary" || variant === "ghost") && "text-title-green",
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
