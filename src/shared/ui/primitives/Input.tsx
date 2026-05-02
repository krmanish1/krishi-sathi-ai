import { TextInput, View, Text, type TextInputProps } from "react-native";
import { clsx } from "clsx";

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  containerClassName?: string;
};

/**
 * Text field with optional label and error (NativeWind). Pair with `react-hook-form` in forms.
 */
export function Input({ label, error, className, containerClassName, ...rest }: InputProps) {
  return (
    <View className={clsx("w-full", containerClassName)}>
      {label ? <Text className="mb-1 font-body text-sm text-ink-muted">{label}</Text> : null}
      <TextInput
        className={clsx(
          "min-h-[52px] rounded-full border border-border-light bg-muted px-4 font-body text-ink",
          error && "border-danger",
          className,
        )}
        placeholderTextColor="#b3b3b3"
        accessibilityLabel={label}
        {...rest}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
