import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AuthScreenLayout, authFormStyles, useRedirectWhenAuthed } from "@/features/auth";
import { useSupabaseAuth } from "@/shared/auth";

type FocusField = "name" | "email" | "password" | null;

export default function SignUpScreen() {
  const { t } = useTranslation();
  useRedirectWhenAuthed();
  const { signUpWithEmail } = useSupabaseAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<FocusField>(null);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const validate = (): string | null => {
    if (!name.trim()) return t("auth.nameRequired");
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
      await signUpWithEmail(email.trim(), password, name.trim());
    } catch (e: unknown) {
      Alert.alert(t("errors.generic"), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <View style={authFormStyles.footerRow}>
      <Text style={authFormStyles.footerMuted}>{t("auth.footerHasAccount")}</Text>
      <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={8}>
        <Text style={authFormStyles.footerLink}>{t("auth.footerSignInLink")}</Text>
      </Pressable>
    </View>
  );

  const topAccessory = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("auth.backToLogin")}
      onPress={() => router.replace("/(auth)/login")}
      className="h-11 w-11 items-center justify-center rounded-full bg-muted active:opacity-80"
      hitSlop={8}
    >
      <MaterialCommunityIcons name="arrow-left" size={22} color="#d4d4d4" />
    </Pressable>
  );

  return (
    <AuthScreenLayout
      headline={t("auth.signUpHeadline")}
      subtitle={t("auth.signUpSubtitle")}
      footer={footer}
      topAccessory={topAccessory}
    >
      <View style={authFormStyles.fieldGap}>
        <View>
          <Text style={authFormStyles.label}>{t("auth.nameLabel")}</Text>
          <View
            style={[
              authFormStyles.inputWrapper,
              focused === "name" && authFormStyles.inputWrapperFocused,
            ]}
          >
            <MaterialCommunityIcons name="account-outline" size={20} color="#737373" />
            <TextInput
              ref={nameRef}
              style={authFormStyles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("auth.namePlaceholder")}
              placeholderTextColor="#525252"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>
        </View>

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
          accessibilityLabel={t("auth.signUpBtn")}
          onPress={() => void handleSubmit()}
          disabled={busy}
          style={[authFormStyles.submitBtn, busy && authFormStyles.submitBtnDisabled]}
        >
          {busy ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <>
              <Text style={authFormStyles.submitText}>{t("auth.signUpBtn")}</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#0a0a0a" />
            </>
          )}
        </Pressable>

        <Text style={authFormStyles.terms}>{t("auth.terms")}</Text>
      </View>
    </AuthScreenLayout>
  );
}
