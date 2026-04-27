import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getOrCreateFarmerId } from "./anonymous";

type AuthState = { farmerId: string | null; ready: boolean };
const Ctx = createContext<AuthState>({ farmerId: null, ready: false });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getOrCreateFarmerId()
      .then((id) => {
        setFarmerId(id);
        setReady(true);
      })
      .catch(() => {
        setFarmerId(null);
        setReady(true);
      });
  }, []);
  return <Ctx.Provider value={{ farmerId, ready }}>{children}</Ctx.Provider>;
};

export const useFarmerId = (): string | null => useContext(Ctx).farmerId;
export const useAuthReady = (): boolean => useContext(Ctx).ready;
