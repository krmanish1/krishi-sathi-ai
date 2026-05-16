import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { WithoutAuthStackParamList } from "@/types/RootStackParamList";
import { LoginScreen } from "@/screen/LoginScreen";
import { SignUpScreen } from "@/screen/SignUpScreen";
import { OnboardingScreen } from "@/screen/OnboardingScreen";

const Stack = createNativeStackNavigator<WithoutAuthStackParamList>();

export function WithoutAuthScreens() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}
