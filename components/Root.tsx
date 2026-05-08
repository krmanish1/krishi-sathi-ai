import { useMemo } from "react";
import { Loader } from "./Loader";
import { CustomNavigation } from "./navigation/CustomNavigation";
import { useAuthReady, useSupabaseSession } from "@/shared/auth/AuthProvider";

export function Root() {
  const authReady = useAuthReady();
  const session = useSupabaseSession();

  const booted = authReady;
  const isAuthenticated = session?.user?.id != null;

  const content = useMemo(() => {
    if (!booted) {
      return <Loader message="KrishiSaathi AI" />;
    }
    return <CustomNavigation isAuthenticated={isAuthenticated} />;
  }, [booted, isAuthenticated]);

  return content;
}
