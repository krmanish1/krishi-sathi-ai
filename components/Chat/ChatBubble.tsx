import type { ReactNode } from "react";
import { View } from "react-native";

type Props = {
  role: "user" | "assistant";
  children: ReactNode;
};

export function ChatBubble({ role, children }: Props) {
  return (
    <View className={`rounded-xl px-4 py-3 max-w-[85%] ${role === "user" ? "bg-brand self-end" : "bg-surface self-start"}`}>
      {children}
    </View>
  );
}
