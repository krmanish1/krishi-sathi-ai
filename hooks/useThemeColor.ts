import { colors } from "@/constants/Colors";
import type { colors as ColorsType } from "@/constants/Colors";

export function useThemeColor(): typeof ColorsType {
  return colors;
}
