import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export function Loader({ message }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1ed760" />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
  text: {
    marginTop: 12,
    color: "#b3b3b3",
    fontSize: 14,
  },
});
