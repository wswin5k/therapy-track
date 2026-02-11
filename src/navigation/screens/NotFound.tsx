import { Text, Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultMainContainer } from "../../components/DefaultMainContainer";

export function NotFound() {
  return (
    <DefaultMainContainer justifyContent="center">
      <Text>404</Text>
      <Button screen="HomeTabs">Go to Home</Button>
    </DefaultMainContainer>
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
