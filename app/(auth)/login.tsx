import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AuthScreenLayout, authFormStyles, useRedirectWhenAuthed } from "@/features/auth";
import { useSupabaseAuth } from "@/shared/auth";

type FocusField = "email" | "password" | null;

export default function LoginScreen() {
  const { t } = useTranslation();
  useRedirectWhenAuthed();
  const { signInWithEmail } = useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<FocusField>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const validate = (): string | null => {
    if (!email.trim()) return t("auth.emailRequired");
    if (!password) return t("auth.passwordRequired");
    if (password.length < 6) return t("auth.passwordTooShort");
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("", err);
      return;
    }
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: unknown) {
      Alert.alert(t("errors.generic"), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <View style={authFormStyles.footerRow}>
      <Text style={authFormStyles.footerMuted}>{t("auth.footerNoAccount")}</Text>
      <Pressable onPress={() => router.push("/signup")} hitSlop={8}>
        <Text style={authFormStyles.footerLink}>{t("auth.footerSignUpLink")}</Text>
      </Pressable>
    </View>
  );

  return (
    <AuthScreenLayout
      headline={t("auth.signInHeadline")}
      subtitle={t("auth.signInSubtitle")}
      footer={footer}
    >
      <View style={authFormStyles.fieldGap}>
        <View>
          <Text style={authFormStyles.label}>{t("auth.emailLabel")}</Text>
          <View
            style={[
              authFormStyles.inputWrapper,
              focused === "email" && authFormStyles.inputWrapperFocused,
            ]}
          >
            <MaterialCommunityIcons name="email-outline" size={20} color="#737373" />
            <TextInput
              ref={emailRef}
              style={authFormStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor="#525252"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
        </View>

        <View>
          <Text style={authFormStyles.label}>{t("auth.passwordLabel")}</Text>
          <View
            style={[
              authFormStyles.inputWrapper,
              focused === "password" && authFormStyles.inputWrapperFocused,
            ]}
          >
            <MaterialCommunityIcons name="lock-outline" size={20} color="#737373" />
            <TextInput
              ref={passwordRef}
              style={authFormStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor="#525252"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => void handleSubmit()}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button">
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#737373"
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("auth.signInBtn")}
          onPress={() => void handleSubmit()}
          disabled={busy}
          style={[authFormStyles.submitBtn, busy && authFormStyles.submitBtnDisabled]}
        >
          {busy ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <>
              <Text style={authFormStyles.submitText}>{t("auth.signInBtn")}</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#0a0a0a" />
            </>
          )}
        </Pressable>

        <Text style={authFormStyles.terms}>{t("auth.terms")}</Text>
      </View>
    </AuthScreenLayout>
  );
}
