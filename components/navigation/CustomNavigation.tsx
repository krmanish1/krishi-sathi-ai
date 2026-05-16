import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/RootStackParamList";
import { WithoutAuthScreens } from "./WithoutAuthScreens";
import { WithAuthScreens } from "./WithAuthScreens";
import { theme } from "@/shared/ui/theme/tokens";
import { useNavigationRef } from "@/context/NavigationContext";

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function CustomNavigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const navigationRef = useNavigationRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: true,
        colors: {
          primary: theme.brand,
          background: theme.pageBg,
          card: theme.surface,
          text: theme.ink,
          border: theme.border,
          notification: theme.danger,
        },
        fonts: {
          regular: { fontFamily: "Inter_400Regular", fontWeight: "400" },
          medium: { fontFamily: "Inter_500Medium", fontWeight: "500" },
          bold: { fontFamily: "Inter_600SemiBold", fontWeight: "600" },
          heavy: { fontFamily: "PlusJakartaSans_700Bold", fontWeight: "700" },
        },
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Home" component={WithAuthScreens} />
        ) : (
          <RootStack.Screen name="Login" component={WithoutAuthScreens} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
