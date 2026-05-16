export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ValidateOTP: undefined;
  Onboarding: undefined;
  Home: undefined;
  Chats: undefined;
  Chat: { conversationId: string; title?: string };
  NewChat: undefined;
  Mandi: undefined;
  Profile: undefined;
  Scan: undefined;
  AuthCallback: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ValidateOTP: undefined;
};

export type WithoutAuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ValidateOTP: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Chats: undefined;
  NewChat: undefined;
  Mandi: undefined;
  Profile: undefined;
  Chat: { conversationId: string; title?: string };
};

export type StackScreensParamList = {
  MyProfile: undefined;
  Scan: undefined;
};
