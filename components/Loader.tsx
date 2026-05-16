import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

export function Loader({ message }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00ED64" />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  text: {
    marginTop: 12,
    color: "#5C6C75",
    fontSize: 14,
  },
});
