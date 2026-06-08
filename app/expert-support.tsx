import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { NetworkBanner } from "@/shared/network";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const CARD_BG = "#FFFFFF";
const PAGE_BG = "#F2EDE4";
const BRAND_GREEN = "#1B3A28";

const SUPPORT_OPTIONS = [
  {
    icon: "chat-processing-outline" as const,
    title: "Chat with Expert",
    desc: "Get instant advice from our agricultural experts",
    color: "#1B3A28",
    bg: "#F0FFF7",
    action: "chat",
  },
  {
    icon: "phone-outline" as const,
    title: "Call Helpline",
    desc: "Talk to a certified agronomist",
    color: "#2563EB",
    bg: "#EFF6FF",
    action: "call",
  },
  {
    icon: "video-outline" as const,
    title: "Video Consultation",
    desc: "Face-to-face guidance for complex issues",
    color: "#7C3AED",
    bg: "#F5F3FF",
    action: "video",
  },
] as const;

const FAQS = [
  {
    q: "How do I report crop disease?",
    a: "Use the Scan Crop feature in the Chat tab — take a photo of the affected plant and our AI will identify the disease and suggest treatment.",
  },
  {
    q: "What are PM-KISAN payment dates?",
    a: "PM-KISAN installments are released 3 times a year. The next payment is expected in August 2026. Ask our AI for exact dates based on your state.",
  },
  {
    q: "How do I check mandi prices near me?",
    a: "Go to the Market tab — prices are updated daily from AGMARKNET. Filter by your nearest mandi for live rates.",
  },
];

export default function ExpertSupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [issue, setIssue] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleAction = (action: string) => {
    if (action === "call") {
      void Linking.openURL("tel:1800-180-1551");
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={INK} />
        </Pressable>
        <Text style={styles.title}>{t("expertSupport.title")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <NetworkBanner />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <MaterialCommunityIcons name="headset" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>How can we help you today?</Text>
          <Text style={styles.heroSub}>
            Our team of agri-experts is available Mon–Sat, 8 AM – 8 PM
          </Text>
        </View>

        {/* Support options */}
        <Text style={styles.sectionLabel}>Get Support</Text>
        {SUPPORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.action}
            accessibilityRole="button"
            onPress={() => handleAction(opt.action)}
            style={styles.supportCard}
          >
            <View style={[styles.supportIcon, { backgroundColor: opt.bg }]}>
              <MaterialCommunityIcons name={opt.icon} size={22} color={opt.color} />
            </View>
            <View style={styles.supportText}>
              <Text style={styles.supportTitle}>{opt.title}</Text>
              <Text style={styles.supportDesc}>{opt.desc}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={INK_MUTED}
            />
          </Pressable>
        ))}

        {/* Quick issue form */}
        <Text style={styles.sectionLabel}>Describe Your Issue</Text>
        <View style={styles.card}>
          <TextInput
            value={issue}
            onChangeText={setIssue}
            placeholder="E.g. My wheat leaves are turning yellow. What should I do?"
            placeholderTextColor="#A0ADB3"
            multiline
            numberOfLines={4}
            style={styles.issueInput}
            textAlignVertical="top"
          />
          <Pressable
            accessibilityRole="button"
            style={[
              styles.submitBtn,
              !issue.trim() ? styles.submitBtnDisabled : null,
            ]}
            disabled={!issue.trim()}
          >
            <MaterialCommunityIcons
              name="send-outline"
              size={16}
              color={issue.trim() ? "#FFFFFF" : INK_MUTED}
            />
            <Text
              style={[
                styles.submitText,
                !issue.trim() ? styles.submitTextDisabled : null,
              ]}
            >
              Send to Expert
            </Text>
          </Pressable>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
        {FAQS.map((faq, i) => (
          <View key={i} style={styles.faqCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
              style={styles.faqHeader}
            >
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <MaterialCommunityIcons
                name={expandedFaq === i ? "chevron-up" : "chevron-down"}
                size={18}
                color={INK_MUTED}
              />
            </Pressable>
            {expandedFaq === i ? (
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: INK,
  },
  content: { paddingHorizontal: 18, paddingTop: 8 },
  heroCard: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_600SemiBold",
    color: INK_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
    marginTop: 4,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  supportText: { flex: 1 },
  supportTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: INK,
    marginBottom: 3,
  },
  supportDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    lineHeight: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  issueInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: INK,
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: "#E8EDEB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 12,
    lineHeight: 20,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND_GREEN,
    borderRadius: 24,
    paddingVertical: 13,
  },
  submitBtnDisabled: {
    backgroundColor: "#E8EDEB",
  },
  submitText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  submitTextDisabled: { color: INK_MUTED },
  faqCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#001E2B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: INK,
    lineHeight: 20,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: INK_MUTED,
    lineHeight: 19,
  },
});
