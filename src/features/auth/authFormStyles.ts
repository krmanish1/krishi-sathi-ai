import { StyleSheet } from "react-native";

export const authFormStyles = StyleSheet.create({
  fieldGap: {
    gap: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5C6C75",
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
    borderColor: "rgba(0,30,43,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputWrapperFocused: {
    borderColor: "rgba(0, 164, 100, 0.5)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#001E2B",
    padding: 0,
  },
  submitBtn: {
    marginTop: 6,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#00ED64",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#00ED64",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#001E2B",
    letterSpacing: 0.4,
  },
  terms: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: "#8997A0",
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
    color: "#8997A0",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00684A",
  },
});
