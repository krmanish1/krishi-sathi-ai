import { Pressable, type PressableProps } from "react-native";
import type { ReactNode } from "react";

type Props = PressableProps & {
  children: ReactNode;
};

export function CustomTabBarButton({ children, ...props }: Props) {
  return (
    <Pressable {...props}>
      {children}
    </Pressable>
  );
}
