import { StyleSheet } from "react-native";

export const authFormStyles = StyleSheet.create({
  fieldGap: {
    gap: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a3a3a3",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: "rgba(30, 215, 96, 0.45)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#f5f5f5",
    padding: 0,
  },
  submitBtn: {
    marginTop: 6,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#1ed760",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#1ed760",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0a0a",
    letterSpacing: 0.4,
  },
  terms: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: "#737373",
    paddingHorizontal: 4,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerMuted: {
    fontSize: 14,
    color: "#737373",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1ed760",
  },
});
