import { Text, Button } from "@react-navigation/elements";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

export function NotFound() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>404</Text>
      <Button screen="HomeTabs">Go to Home</Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
});
