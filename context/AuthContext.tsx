import { createContext, useContext, type ReactNode } from "react";
import { AuthProvider as ExistingAuthProvider } from "@/shared/auth/AuthProvider";

export type AuthContextType = {
  isAuthenticated: boolean;
  farmerId: string | null;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  farmerId: null,
  isLoading: true,
});

export function AuthContextProvider({ children }: { children: ReactNode }) {
  return <ExistingAuthProvider>{children}</ExistingAuthProvider>;
}

export function useAuthContext(): AuthContextType {
  return useContext(AuthContext);
}
