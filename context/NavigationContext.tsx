import { createContext, useContext, useRef, type ReactNode } from "react";
import type { NavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/types/RootStackParamList";

type NavigationContextType = {
  navigationRef: { current: NavigationContainerRef<RootStackParamList> | null };
};

const NavigationCtx = createContext<NavigationContextType>({
  navigationRef: { current: null },
});

export function NavigationProvider({ children }: { children: ReactNode }) {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  return (
    <NavigationCtx.Provider value={{ navigationRef }}>
      {children}
    </NavigationCtx.Provider>
  );
}

export function useNavigationRef(): { current: NavigationContainerRef<RootStackParamList> | null } {
  return useContext(NavigationCtx).navigationRef;
}
